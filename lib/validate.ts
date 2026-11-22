// Server-side validation of all client and admin input. Never trust the client.
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SITE,
  FUEL_TYPES,
  calcRentalDays,
  priceFor,
  slugifyCategoryId,
  type BookingRequest,
  type CategoryItem,
  type FuelType,
  type Mode,
  type Point,
  type SiteContent,
  type Transmission,
  type Vehicle,
} from './data'

type Result<T> = { ok: true; value: T } | { ok: false; error: string }
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function price(v: unknown, label: string): Result<number | null> {
  if (v === null || v === undefined) return { ok: true, value: null }
  if (typeof v === 'string' && v.trim() === '') return { ok: true, value: null }
  const n = Number(v)
  if (!Number.isInteger(n) || n <= 0 || n > 10_000_000) {
    return fail(`${label} must be a whole number greater than 0.`)
  }
  return { ok: true, value: n }
}

export const LOCAL_IMAGE_URL = /^\/media\/[0-9a-f-]{36}\.(jpg|png|webp)$/
export const CLOUD_IMAGE_URL =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/rentacar-media\/[0-9a-f-]{36}\.(jpg|png|webp)$/
const MEDIA_PATH_SUFFIX = /\/storage\/v1\/object\/public\/rentacar-media\/[0-9a-f-]{36}\.(jpg|png|webp)$/

export function isValidImageUrl(url: string): boolean {
  if (LOCAL_IMAGE_URL.test(url) || CLOUD_IMAGE_URL.test(url)) return true
  const customSupa = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '')
  if (customSupa && url.startsWith(customSupa) && MEDIA_PATH_SUFFIX.test(url.slice(customSupa.length))) {
    return true
  }
  return false
}

export function parseVehicle(
  input: unknown,
  id: string,
  categories: CategoryItem[] = DEFAULT_CATEGORIES
): Result<Vehicle> {
  const b = obj(input)
  const name = text(b.name, 80)
  if (!name) return fail('Vehicle name is required.')
  const category = text(b.category, 32)
  if (!categories.some((c) => c.id === category)) return fail('Choose a valid category.')
  const sd = price(b.selfDrivePrice, 'Self-drive price')
  if (!sd.ok) return sd
  const ch = price(b.chauffeurPrice, 'Chauffeur price')
  if (!ch.ok) return ch
  if (sd.value === null && ch.value === null) {
    return fail('Enter at least one price (self-drive or chauffeur).')
  }
  const image = typeof b.image === 'string' && b.image.trim() ? b.image.trim() : null
  if (!image) return fail('A vehicle photo is required.')
  if (!isValidImageUrl(image)) return fail('Invalid photo. Upload it again.')
  let seats: number | null = null
  if (b.seats !== null && b.seats !== undefined && !(typeof b.seats === 'string' && b.seats.trim() === '')) {
    seats = Number(b.seats)
    if (!Number.isInteger(seats) || seats < 1 || seats > 60) {
      return fail('Seats must be a number between 1 and 60.')
    }
  }
  const t = b.transmission
  const transmission: Transmission | null = t === 'Automatic' || t === 'Manual' ? t : null
  const f = b.fuel
  const fuel: FuelType | null = FUEL_TYPES.includes(f as FuelType) ? (f as FuelType) : null
  const available = b.available !== false
  return {
    ok: true,
    value: {
      id,
      name,
      category,
      selfDrivePrice: sd.value,
      chauffeurPrice: ch.value,
      image,
      seats,
      transmission,
      fuel,
      available,
    },
  }
}

function points(v: unknown, max: number): Point[] {
  if (!Array.isArray(v)) return []
  return v
    .slice(0, max)
    .map((p) => ({ title: text(obj(p).title, 90), text: text(obj(p).text, 400) }))
    .filter((p) => p.title || p.text)
}

function parseCategories(v: unknown): Result<CategoryItem[]> {
  if (!Array.isArray(v)) return { ok: true, value: DEFAULT_CATEGORIES }
  const out: CategoryItem[] = []
  const seen = new Set<string>()
  for (const raw of v.slice(0, 12)) {
    const item = obj(raw)
    const label = text(item.label, 40)
    if (!label) continue
    const tag = text(item.tag, 20) || label.split(/\s+/)[0].slice(0, 20)
    const rawId = text(item.id, 32)
    let id = slugifyCategoryId(rawId || label)
    if (!id) id = `cat-${out.length + 1}`
    let unique = id
    let suffix = 2
    while (seen.has(unique)) {
      unique = `${id.slice(0, 28)}-${suffix++}`
    }
    seen.add(unique)
    out.push({ id: unique, label, tag })
  }
  if (out.length === 0) return fail('Keep at least one vehicle category.')
  return { ok: true, value: out }
}

export function parseSite(input: unknown): Result<SiteContent> {
  const b = obj(input)
  const hero = obj(b.hero)
  const booking = obj(b.booking)
  const fleet = obj(b.fleet)
  const about = obj(b.about)
  const features = obj(b.features)
  const cta = obj(b.cta)
  const contact = obj(b.contact)

  const name = text(b.name, 80)
  if (!name) return fail('Business name is required.')
  const whatsapp = text(b.whatsapp, 20).replace(/\D/g, '')
  if (whatsapp.length < 10 || whatsapp.length > 15) {
    return fail('WhatsApp number must include the country code, e.g. 923001234567.')
  }
  const phone = text(b.phone, 30)
  if (!phone) return fail('Phone number is required.')
  const email = text(b.email, 120)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('Enter a valid email address.')
  }
  const cats = parseCategories(b.categories)
  if (!cats.ok) return cats

  const D = DEFAULT_SITE
  const value: SiteContent = {
    name,
    tagline: text(b.tagline, 80),
    description: text(b.description, 300),
    city: text(b.city, 60),
    phone,
    whatsapp,
    whatsappMessage: text(b.whatsappMessage, 240) || D.whatsappMessage,
    landline: text(b.landline, 30),
    email,
    address: text(b.address, 200),
    hours: text(b.hours, 120),
    mapQuery: text(b.mapQuery, 200) || text(b.address, 200),
    footerNote: text(b.footerNote, 180),
    categories: cats.value,
    hero: {
      badge: text(hero.badge, 90),
      title: text(hero.title, 120),
      accent: text(hero.accent, 120),
      text: text(hero.text, 400),
      primaryCta: text(hero.primaryCta, 40) || D.hero.primaryCta,
      secondaryCta: text(hero.secondaryCta, 40) || D.hero.secondaryCta,
    },
    booking: {
      eyebrow: text(booking.eyebrow, 60) || D.booking.eyebrow,
      heading: text(booking.heading, 120) || D.booking.heading,
      note: text(booking.note, 140),
      selfDriveLabel: text(booking.selfDriveLabel, 40) || D.booking.selfDriveLabel,
      selfDriveText: text(booking.selfDriveText, 140) || D.booking.selfDriveText,
      chauffeurLabel: text(booking.chauffeurLabel, 40) || D.booking.chauffeurLabel,
      chauffeurText: text(booking.chauffeurText, 140) || D.booking.chauffeurText,
    },
    fleet: {
      eyebrow: text(fleet.eyebrow, 60) || D.fleet.eyebrow,
      heading: text(fleet.heading, 120),
      text: text(fleet.text, 300),
      emptyText: text(fleet.emptyText, 240) || D.fleet.emptyText,
    },
    about: {
      eyebrow: text(about.eyebrow, 60) || D.about.eyebrow,
      heading: text(about.heading, 120),
      text: text(about.text, 800),
      quote: text(about.quote, 240),
      points: points(about.points, 6),
    },
    features: {
      eyebrow: text(features.eyebrow, 60) || D.features.eyebrow,
      heading: text(features.heading, 120),
      items: points(features.items, 6),
    },
    cta: {
      eyebrow: text(cta.eyebrow, 60) || D.cta.eyebrow,
      heading: text(cta.heading, 120),
      text: text(cta.text, 300),
      primaryCta: text(cta.primaryCta, 40) || D.cta.primaryCta,
    },
    contact: {
      eyebrow: text(contact.eyebrow, 60) || D.contact.eyebrow,
      heading: text(contact.heading, 120) || D.contact.heading,
    },
  }
  return { ok: true, value }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function parseBooking(input: unknown, vehicles: Vehicle[], id: string): Result<BookingRequest> {
  const b = obj(input)
  const vehicleId = text(b.vehicleId, 80)
  const vehicle = vehicles.find((v) => v.id === vehicleId)
  if (!vehicle || vehicle.available === false) {
    return fail('This vehicle is no longer available for booking.')
  }
  const mode: Mode | null = b.mode === 'self-drive' || b.mode === 'chauffeur' ? b.mode : null
  if (!mode) return fail('Choose a valid travel service.')
  const dailyRate = priceFor(vehicle, mode)
  if (dailyRate === null) return fail('This vehicle is not offered for the selected service.')

  const customerName = text(b.customerName, 80)
  if (customerName.length < 2) return fail('Please enter your full name.')
  const customerPhone = text(b.customerPhone, 30)
  const digits = customerPhone.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 16) return fail('Please enter a valid phone or WhatsApp number.')

  const pickupDate = text(b.pickupDate, 10)
  const returnDate = text(b.returnDate, 10)
  if (!ISO_DATE.test(pickupDate) || !ISO_DATE.test(returnDate)) {
    return fail('Choose valid pickup and return dates.')
  }
  const startMs = Date.parse(`${pickupDate}T00:00:00Z`)
  const endMs = Date.parse(`${returnDate}T00:00:00Z`)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return fail('Choose valid pickup and return dates.')
  }
  // Allow 1-day tolerance for timezone differences.
  const yesterdayMs = Date.now() - 36 * 60 * 60 * 1000
  if (startMs < yesterdayMs) return fail('Pickup date cannot be in the past.')
  if (endMs < startMs) return fail('Return date must be on or after the pickup date.')
  const days = calcRentalDays(pickupDate, returnDate)
  if (days > 90) return fail('Online booking requests support up to 90 days. Contact us directly for long-term leases.')

  const pickupLocation = text(b.pickupLocation, 200)
  if (pickupLocation.length < 2) return fail('Please enter your pickup location.')
  const notes = text(b.notes, 400)

  return {
    ok: true,
    value: {
      id,
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      mode,
      dailyRate,
      days,
      estimatedTotal: dailyRate * days,
      customerName,
      customerPhone,
      pickupDate,
      returnDate,
      pickupLocation,
      notes,
      status: 'new',
      createdAt: new Date().toISOString(),
    },
  }
}

/** Detect the real image type from magic bytes instead of trusting the filename or MIME type. */
export function sniffImage(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png'
  }
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp'
  }
  return null
}
