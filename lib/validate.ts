// Server-side validation of admin input. Never trust the client.
import { CATEGORIES, type Category, type Point, type SiteContent, type Transmission, type Vehicle } from './data'

type Result<T> = { ok: true; value: T } | { ok: false; error: string }
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function price(v: unknown, label: string): Result<number | null> {
  if (v === null || v === undefined || v === '') return { ok: true, value: null }
  const n = Number(v)
  if (!Number.isInteger(n) || n <= 0 || n > 10_000_000) return fail(`${label} must be a whole number greater than 0.`)
  return { ok: true, value: n }
}

export const LOCAL_IMAGE_URL = /^\/media\/[0-9a-f-]{36}\.(jpg|png|webp)$/
export const CLOUD_IMAGE_URL = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/rentacar-media\/[0-9a-f-]{36}\.(jpg|png|webp)$/

export const isValidImageUrl = (url: string) => LOCAL_IMAGE_URL.test(url) || CLOUD_IMAGE_URL.test(url)

export function parseVehicle(input: unknown, id: string): Result<Vehicle> {
  const b = obj(input)
  const name = text(b.name, 80)
  if (!name) return fail('Vehicle name is required.')
  const category = b.category as Category
  if (!CATEGORIES.some((c) => c.id === category)) return fail('Choose a valid category.')
  const sd = price(b.selfDrivePrice, 'Self-drive price')
  if (!sd.ok) return sd
  const ch = price(b.chauffeurPrice, 'Chauffeur price')
  if (!ch.ok) return ch
  if (sd.value === null && ch.value === null) return fail('Enter at least one price (self-drive or chauffeur).')
  const image = typeof b.image === 'string' && b.image ? b.image : null
  if (!image) return fail('A vehicle photo is required.')
  if (!isValidImageUrl(image)) return fail('Invalid photo. Upload it again.')
  let seats: number | null = null
  if (b.seats !== null && b.seats !== undefined && b.seats !== '') {
    seats = Number(b.seats)
    if (!Number.isInteger(seats) || seats < 1 || seats > 60) return fail('Seats must be a number between 1 and 60.')
  }
  const t = b.transmission
  const transmission: Transmission | null = t === 'Automatic' || t === 'Manual' ? t : null
  const available = b.available !== false
  return {
    ok: true,
    value: { id, name, category, selfDrivePrice: sd.value, chauffeurPrice: ch.value, image, seats, transmission, available },
  }
}

function points(v: unknown, max: number): Point[] {
  if (!Array.isArray(v)) return []
  return v
    .slice(0, max)
    .map((p) => ({ title: text(obj(p).title, 90), text: text(obj(p).text, 400) }))
    .filter((p) => p.title || p.text)
}

export function parseSite(input: unknown): Result<SiteContent> {
  const b = obj(input)
  const hero = obj(b.hero), fleet = obj(b.fleet), about = obj(b.about), features = obj(b.features), cta = obj(b.cta)
  const name = text(b.name, 80)
  if (!name) return fail('Business name is required.')
  const whatsapp = text(b.whatsapp, 20).replace(/\D/g, '')
  if (whatsapp.length < 10 || whatsapp.length > 15) return fail('WhatsApp number must include the country code, e.g. 923001234567.')
  const phone = text(b.phone, 30)
  if (!phone) return fail('Phone number is required.')
  const email = text(b.email, 120)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Enter a valid email address.')
  const value: SiteContent = {
    name, tagline: text(b.tagline, 80), description: text(b.description, 300), city: text(b.city, 60),
    phone, whatsapp, landline: text(b.landline, 30), email, address: text(b.address, 200),
    mapQuery: text(b.mapQuery, 200) || text(b.address, 200),
    hero: { badge: text(hero.badge, 90), title: text(hero.title, 120), accent: text(hero.accent, 120), text: text(hero.text, 400) },
    fleet: { heading: text(fleet.heading, 120), text: text(fleet.text, 300) },
    about: { heading: text(about.heading, 120), text: text(about.text, 800), quote: text(about.quote, 240), points: points(about.points, 6) },
    features: { heading: text(features.heading, 120), items: points(features.items, 6) },
    cta: { heading: text(cta.heading, 120), text: text(cta.text, 300) },
  }
  return { ok: true, value }
}

/** Detect the real image type from magic bytes instead of trusting the filename or MIME type. */
export function sniffImage(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  return null
}
