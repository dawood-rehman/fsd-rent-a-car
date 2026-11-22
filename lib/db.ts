// Hybrid high-throughput storage layer:
// - When SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, stores db.json and photos in Supabase Storage.
// - Otherwise uses local disk (data/db.json + data/uploads).
// Includes single-flight read coalescing, short TTL read cache, stale-on-error resilience,
// request-scoped React cache, serialized writes, and bounded LRU media caching.
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { cache } from 'react'
import {
  mergeSite,
  normalizeBooking,
  normalizeVehicle,
  type BookingRequest,
  type SiteContent,
  type Vehicle,
} from './data'
import { CLOUD_IMAGE_URL, LOCAL_IMAGE_URL } from './validate'

export type Db = { site: SiteContent; vehicles: Vehicle[]; bookings: BookingRequest[] }

const DIR = path.join(process.cwd(), 'data')
const FILE = path.join(DIR, 'db.json')
const UPLOADS = path.join(DIR, 'uploads')

const DATA_BUCKET = 'rentacar-data'
const MEDIA_BUCKET = 'rentacar-media'
const MIME: Record<'jpg' | 'png' | 'webp', string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const FETCH_TIMEOUT_MS = 8000
const DB_CACHE_TTL_MS = 10_000
const MAX_STORED_BOOKINGS = 500

function supaConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url, key } : null
}

export const storageMode = (): 'supabase' | 'local' => (supaConfig() ? 'supabase' : 'local')

const supaHeaders = (key: string, extra?: Record<string, string>) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  ...extra,
})

// Shared process-wide singleton state on globalThis so all Next.js route bundles
// (pages, layout, admin APIs, booking API, media route) share one cache, write queue, and LRU store.
type DbStore = {
  bucketsReady: Promise<void> | null
  cachedDb: Db | null
  cachedAt: number
  lastGoodDb: Db | null
  inflightRead: Promise<Db> | null
  queue: Promise<unknown>
  imageCache: Map<string, Buffer>
  imageCacheBytes: number
}

const g = globalThis as typeof globalThis & { __rentacarDbStore?: DbStore }
const store: DbStore =
  g.__rentacarDbStore ??
  (g.__rentacarDbStore = {
    bucketsReady: null,
    cachedDb: null,
    cachedAt: 0,
    lastGoodDb: null,
    inflightRead: null,
    queue: Promise.resolve(),
    imageCache: new Map<string, Buffer>(),
    imageCacheBytes: 0,
  })

function ensureBuckets(cfg: { url: string; key: string }): Promise<void> {
  if (!store.bucketsReady) {
    store.bucketsReady = (async () => {
      for (const [id, isPublic] of [
        [DATA_BUCKET, false],
        [MEDIA_BUCKET, true],
      ] as const) {
        const res = await fetch(`${cfg.url}/storage/v1/bucket`, {
          method: 'POST',
          headers: supaHeaders(cfg.key, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ id, name: id, public: isPublic }),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })
        // 409 / 400 "already exists" is expected on subsequent cold starts.
        if (!res.ok && res.status !== 409 && res.status !== 400) {
          throw new Error(`Supabase bucket init failed: ${res.status}`)
        }
      }
    })().catch((e) => {
      store.bucketsReady = null
      throw e
    })
  }
  return store.bucketsReady
}

const isVehicle = (v: unknown): v is Vehicle =>
  !!v && typeof v === 'object' && typeof (v as Vehicle).id === 'string' && typeof (v as Vehicle).name === 'string'

const empty = (): Db => ({ site: mergeSite(null), vehicles: [], bookings: [] })

function parseDb(raw: string): Db {
  const parsed = JSON.parse(raw)
  const vehicles = Array.isArray(parsed?.vehicles) ? parsed.vehicles.filter(isVehicle).map(normalizeVehicle) : []
  const bookings = Array.isArray(parsed?.bookings)
    ? parsed.bookings.map(normalizeBooking).filter((b: BookingRequest | null): b is BookingRequest => b !== null)
    : []
  return {
    site: mergeSite(parsed?.site),
    vehicles,
    bookings,
  }
}

/** Strict read from storage. Throws on corrupt file or failed cloud call so data is never overwritten.
 *  Pass `{ cached: true }` for public ISR reads so Next.js keeps `/` statically cached with on-demand revalidation. */
export async function readDb(opts?: { cached?: boolean }): Promise<Db> {
  const cfg = supaConfig()
  let db: Db
  if (cfg) {
    const res = await fetch(`${cfg.url}/storage/v1/object/${DATA_BUCKET}/db.json`, {
      headers: supaHeaders(cfg.key),
      ...(opts?.cached ? { next: { revalidate: 300, tags: ['site-data'] } } : { cache: 'no-store' as const }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (res.status === 404 || res.status === 400) {
      const txt = await res.text()
      if (
        res.status === 404 ||
        txt.includes('not_found') ||
        txt.includes('Object not found') ||
        txt.includes('Bucket not found')
      ) {
        db = empty()
      } else {
        throw new Error(`Supabase read failed: ${res.status}`)
      }
    } else if (!res.ok) {
      throw new Error(`Supabase read failed: ${res.status}`)
    } else {
      db = parseDb(await res.text())
    }
  } else {
    try {
      const raw = await readFile(FILE, 'utf8')
      db = parseDb(raw)
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        db = empty()
      } else {
        throw e
      }
    }
  }
  store.cachedDb = db
  store.cachedAt = Date.now()
  store.lastGoodDb = db
  return db
}

/** High-traffic cached read with single-flight coalescing so burst traffic never causes thundering herd I/O. */
async function readDbCached(): Promise<Db> {
  if (store.cachedDb && Date.now() - store.cachedAt < DB_CACHE_TTL_MS) {
    return store.cachedDb
  }
  if (!store.inflightRead) {
    store.inflightRead = readDb({ cached: true }).finally(() => {
      store.inflightRead = null
    })
  }
  return store.inflightRead
}

/** For the public site: serves cached data and falls back to last-known-good snapshot on transient storage hiccups. */
export async function readDbSafe(): Promise<Db> {
  try {
    return await readDbCached()
  } catch {
    return store.lastGoodDb ?? empty()
  }
}

/** Request-scoped deduplication so layout metadata and page rendering share one read per render pass. */
export const getSiteDb = cache(readDbSafe)

async function renameWithRetry(src: string, dest: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await rename(src, dest)
      return
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code
      if ((code === 'EPERM' || code === 'EBUSY') && attempt < 3) {
        await new Promise((r) => setTimeout(r, 30 * (attempt + 1)))
        continue
      }
      throw e
    }
  }
}

async function writeDb(db: Db) {
  // Keep stored booking history bounded for fast JSON serialization under heavy traffic.
  if (db.bookings.length > MAX_STORED_BOOKINGS) {
    db.bookings = db.bookings.slice(0, MAX_STORED_BOOKINGS)
  }
  const payload = JSON.stringify(db, null, 2)
  const cfg = supaConfig()
  if (cfg) {
    await ensureBuckets(cfg)
    const res = await fetch(`${cfg.url}/storage/v1/object/${DATA_BUCKET}/db.json`, {
      method: 'POST',
      headers: supaHeaders(cfg.key, { 'Content-Type': 'application/json', 'x-upsert': 'true' }),
      body: payload,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`Supabase write failed: ${res.status}`)
  } else {
    await mkdir(DIR, { recursive: true })
    const tmp = `${FILE}.${randomUUID()}.tmp`
    await writeFile(tmp, payload, 'utf8')
    try {
      await renameWithRetry(tmp, FILE)
    } catch (e) {
      try {
        await unlink(tmp)
      } catch {
        // ignore cleanup error
      }
      throw e
    }
  }
  store.cachedDb = db
  store.cachedAt = Date.now()
  store.lastGoodDb = db
}

/** Serialized read-modify-write so concurrent admin or booking requests never clobber each other.
 *  Call `cancel()` inside `fn` to skip writing when validation fails or nothing changed. */
export function mutate<T>(fn: (db: Db, cancel: () => void) => T | Promise<T>): Promise<T> {
  const run = store.queue.then(async () => {
    const db = await readDb()
    let cancelled = false
    const result = await fn(db, () => {
      cancelled = true
    })
    if (!cancelled) await writeDb(db)
    return result
  })
  store.queue = run.catch(() => undefined)
  return run
}

// Bounded in-memory LRU cache for local media files (32 MB cap) for zero-disk-I/O bursts.
const IMAGE_CACHE_MAX_BYTES = 32 * 1024 * 1024
const IMAGE_CACHE_MAX_ITEMS = 100

function cacheImagePut(name: string, buf: Buffer) {
  if (buf.length > 6 * 1024 * 1024) return
  if (store.imageCache.has(name)) {
    store.imageCacheBytes -= store.imageCache.get(name)!.length
    store.imageCache.delete(name)
  }
  while (
    store.imageCache.size >= IMAGE_CACHE_MAX_ITEMS ||
    store.imageCacheBytes + buf.length > IMAGE_CACHE_MAX_BYTES
  ) {
    const oldest = store.imageCache.keys().next().value
    if (oldest === undefined) break
    store.imageCacheBytes -= store.imageCache.get(oldest)!.length
    store.imageCache.delete(oldest)
  }
  store.imageCache.set(name, buf)
  store.imageCacheBytes += buf.length
}

function cacheImageGet(name: string): Buffer | null {
  const buf = store.imageCache.get(name)
  if (!buf) return null
  // Refresh LRU recency
  store.imageCache.delete(name)
  store.imageCache.set(name, buf)
  return buf
}

function cacheImageDelete(name: string) {
  const buf = store.imageCache.get(name)
  if (!buf) return
  store.imageCacheBytes -= buf.length
  store.imageCache.delete(name)
}

export async function saveImage(buf: Buffer, ext: 'jpg' | 'png' | 'webp'): Promise<string> {
  const name = `${randomUUID()}.${ext}`
  const cfg = supaConfig()
  if (cfg) {
    await ensureBuckets(cfg)
    const res = await fetch(`${cfg.url}/storage/v1/object/${MEDIA_BUCKET}/${name}`, {
      method: 'POST',
      headers: supaHeaders(cfg.key, {
        'Content-Type': MIME[ext],
        'Cache-Control': 'public, max-age=31536000, immutable',
        'x-upsert': 'true',
      }),
      body: new Uint8Array(buf),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`Supabase image upload failed: ${res.status}`)
    return `${cfg.url}/storage/v1/object/public/${MEDIA_BUCKET}/${name}`
  }
  await mkdir(UPLOADS, { recursive: true })
  await writeFile(path.join(UPLOADS, name), buf)
  cacheImagePut(name, buf)
  return `/media/${name}`
}

export async function readImage(name: string): Promise<Buffer | null> {
  if (!LOCAL_IMAGE_URL.test(`/media/${name}`)) return null
  const hit = cacheImageGet(name)
  if (hit) return hit
  const full = path.resolve(UPLOADS, name)
  if (!full.startsWith(path.resolve(UPLOADS) + path.sep)) return null
  try {
    const buf = await readFile(full)
    cacheImagePut(name, buf)
    return buf
  } catch {
    return null
  }
}

export async function deleteImage(url: string | null) {
  if (!url) return
  if (LOCAL_IMAGE_URL.test(url)) {
    const name = url.replace('/media/', '')
    cacheImageDelete(name)
    const full = path.resolve(UPLOADS, name)
    if (!full.startsWith(path.resolve(UPLOADS) + path.sep)) return
    try {
      await unlink(full)
    } catch {
      /* already gone */
    }
    return
  }
  const cfg = supaConfig()
  if (cfg && (CLOUD_IMAGE_URL.test(url) || url.startsWith(`${cfg.url}/storage/v1/object/public/${MEDIA_BUCKET}/`))) {
    const name = url.split('/').pop()
    if (!name) return
    try {
      await fetch(`${cfg.url}/storage/v1/object/${MEDIA_BUCKET}/${name}`, {
        method: 'DELETE',
        headers: supaHeaders(cfg.key),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
    } catch {
      /* ignore */
    }
  }
}

/** Delete an image only if no vehicle in `vehicles` still references it. */
export async function deleteImageIfUnused(url: string | null, vehicles: Vehicle[]) {
  if (!url || vehicles.some((v) => v.image === url)) return
  await deleteImage(url)
}

type MediaItem = { url: string; name: string }

/** List all uploaded vehicle images from the active storage backend (local disk or Supabase). */
export async function listMedia(): Promise<MediaItem[]> {
  const cfg = supaConfig()
  if (cfg) {
    await ensureBuckets(cfg)
    const res = await fetch(`${cfg.url}/storage/v1/object/list/${MEDIA_BUCKET}`, {
      method: 'POST',
      headers: supaHeaders(cfg.key, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefix: '', limit: 200, offset: 0, sortBy: { column: 'created_at', order: 'desc' } }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return []
    const items = (await res.json().catch(() => [])) as { name?: string }[]
    return items
      .filter((x): x is { name: string } => typeof x?.name === 'string' && LOCAL_IMAGE_URL.test(`/media/${x.name}`))
      .map((x) => ({
        name: x.name,
        url: `${cfg.url}/storage/v1/object/public/${MEDIA_BUCKET}/${x.name}`,
      }))
  }
  try {
    const files = await readdir(UPLOADS)
    return files
      .filter((name) => LOCAL_IMAGE_URL.test(`/media/${name}`))
      .map((name) => ({ name, url: `/media/${name}` }))
  } catch {
    return []
  }
}
