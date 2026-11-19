// Hybrid storage layer:
// - When SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, stores db.json and photos in Supabase Storage (auto-creating buckets).
// - Otherwise falls back to local disk (data/db.json + data/uploads).
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { mergeSite, normalizeVehicle, type SiteContent, type Vehicle } from './data'
import { CLOUD_IMAGE_URL, LOCAL_IMAGE_URL } from './validate'

export type Db = { site: SiteContent; vehicles: Vehicle[] }

const DIR = path.join(process.cwd(), 'data')
const FILE = path.join(DIR, 'db.json')
const UPLOADS = path.join(DIR, 'uploads')

const DATA_BUCKET = 'rentacar-data'
const MEDIA_BUCKET = 'rentacar-media'
const MIME: Record<'jpg' | 'png' | 'webp', string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

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

let bucketsReady: Promise<void> | null = null
function ensureBuckets(cfg: { url: string; key: string }): Promise<void> {
  if (!bucketsReady) {
    bucketsReady = (async () => {
      for (const [id, isPublic] of [[DATA_BUCKET, false], [MEDIA_BUCKET, true]] as const) {
        await fetch(`${cfg.url}/storage/v1/bucket`, {
          method: 'POST',
          headers: supaHeaders(cfg.key, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ id, name: id, public: isPublic }),
        })
      }
    })().catch((e) => {
      bucketsReady = null
      throw e
    })
  }
  return bucketsReady
}

const isVehicle = (v: unknown): v is Vehicle =>
  !!v && typeof v === 'object' && typeof (v as Vehicle).id === 'string' && typeof (v as Vehicle).name === 'string'

const empty = (): Db => ({ site: mergeSite(null), vehicles: [] })

function parseDb(raw: string): Db {
  const parsed = JSON.parse(raw)
  return {
    site: mergeSite(parsed?.site),
    vehicles: Array.isArray(parsed?.vehicles) ? parsed.vehicles.filter(isVehicle).map(normalizeVehicle) : [],
  }
}

/** Strict read: a missing file is an empty site, but a corrupt file or failed cloud call throws so it is never overwritten. */
export async function readDb(): Promise<Db> {
  const cfg = supaConfig()
  if (cfg) {
    await ensureBuckets(cfg)
    const res = await fetch(`${cfg.url}/storage/v1/object/${DATA_BUCKET}/db.json`, {
      headers: supaHeaders(cfg.key),
      cache: 'no-store',
    })
    if (res.status === 404 || res.status === 400) {
      const txt = await res.text()
      if (res.status === 404 || txt.includes('not_found') || txt.includes('Object not found')) return empty()
      throw new Error(`Supabase read failed: ${res.status}`)
    }
    if (!res.ok) throw new Error(`Supabase read failed: ${res.status}`)
    return parseDb(await res.text())
  }
  let raw: string
  try {
    raw = await readFile(FILE, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return empty()
    throw e
  }
  return parseDb(raw)
}

/** For the public site: never crash the page because of a storage problem. */
export async function readDbSafe(): Promise<Db> {
  try { return await readDb() } catch { return empty() }
}

async function writeDb(db: Db) {
  const payload = JSON.stringify(db, null, 2)
  const cfg = supaConfig()
  if (cfg) {
    await ensureBuckets(cfg)
    const res = await fetch(`${cfg.url}/storage/v1/object/${DATA_BUCKET}/db.json`, {
      method: 'POST',
      headers: supaHeaders(cfg.key, { 'Content-Type': 'application/json', 'x-upsert': 'true' }),
      body: payload,
    })
    if (!res.ok) throw new Error(`Supabase write failed: ${res.status}`)
    return
  }
  await mkdir(DIR, { recursive: true })
  const tmp = `${FILE}.${randomUUID()}.tmp`
  await writeFile(tmp, payload, 'utf8')
  await rename(tmp, FILE)
}

let queue: Promise<unknown> = Promise.resolve()

/** Serialised read-modify-write so two admin requests can never clobber each other. */
export function mutate<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await readDb()
    const result = await fn(db)
    await writeDb(db)
    return result
  })
  queue = run.catch(() => undefined)
  return run
}

export async function saveImage(buf: Buffer, ext: 'jpg' | 'png' | 'webp'): Promise<string> {
  const name = `${randomUUID()}.${ext}`
  const cfg = supaConfig()
  if (cfg) {
    await ensureBuckets(cfg)
    const res = await fetch(`${cfg.url}/storage/v1/object/${MEDIA_BUCKET}/${name}`, {
      method: 'POST',
      headers: supaHeaders(cfg.key, { 'Content-Type': MIME[ext], 'x-upsert': 'true' }),
      body: new Uint8Array(buf),
    })
    if (!res.ok) throw new Error(`Supabase image upload failed: ${res.status}`)
    return `${cfg.url}/storage/v1/object/public/${MEDIA_BUCKET}/${name}`
  }
  await mkdir(UPLOADS, { recursive: true })
  await writeFile(path.join(UPLOADS, name), buf)
  return `/media/${name}`
}

export async function readImage(name: string): Promise<Buffer | null> {
  if (!LOCAL_IMAGE_URL.test(`/media/${name}`)) return null
  try { return await readFile(path.join(UPLOADS, name)) } catch { return null }
}

export async function deleteImage(url: string | null) {
  if (!url) return
  if (LOCAL_IMAGE_URL.test(url)) {
    try { await unlink(path.join(UPLOADS, url.replace('/media/', ''))) } catch { /* already gone */ }
    return
  }
  const cfg = supaConfig()
  if (cfg && CLOUD_IMAGE_URL.test(url)) {
    const name = url.split('/').pop()
    if (!name) return
    try {
      await fetch(`${cfg.url}/storage/v1/object/${MEDIA_BUCKET}/${name}`, {
        method: 'DELETE',
        headers: supaHeaders(cfg.key),
      })
    } catch { /* ignore */ }
  }
}

/** Delete an image only if no vehicle in `vehicles` still references it. */
export async function deleteImageIfUnused(url: string | null, vehicles: Vehicle[]) {
  if (!url || vehicles.some((v) => v.image === url)) return
  await deleteImage(url)
}
