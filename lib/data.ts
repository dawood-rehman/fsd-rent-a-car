// Shared types, defaults and pure helpers. Safe to import from both server and client code.

export type Category = 'economy' | 'suv' | 'van'
export type Mode = 'self-drive' | 'chauffeur'
export type Transmission = 'Automatic' | 'Manual'

export const CATEGORIES: { id: Category; label: string; tag: string }[] = [
  { id: 'economy', label: 'Economy & Sedans', tag: 'Sedan' },
  { id: 'suv', label: 'SUV & Luxury', tag: 'SUV' },
  { id: 'van', label: 'Vans & Coasters', tag: 'Van' },
]

export const MODES: { id: Mode; label: string; icon: 'wheel' | 'user'; text: string }[] = [
  { id: 'self-drive', label: 'Self-Drive', icon: 'wheel', text: 'You take the wheel, we hand over the keys' },
  { id: 'chauffeur', label: 'With Chauffeur', icon: 'user', text: 'Sit back, our professional driver takes you there' },
]

export const modeLabel = (m: Mode) => MODES.find((x) => x.id === m)!.label

/** A price of `null` means the vehicle is not offered in that mode. */
export type Vehicle = {
  id: string
  name: string
  category: Category
  selfDrivePrice: number | null
  chauffeurPrice: number | null
  image: string | null
  seats: number | null
  transmission: Transmission | null
  available: boolean
}

export const priceFor = (v: Vehicle, mode: Mode) => (mode === 'self-drive' ? v.selfDrivePrice : v.chauffeurPrice)

export type Point = { title: string; text: string }

export type SiteContent = {
  name: string
  tagline: string
  description: string
  city: string
  phone: string
  whatsapp: string
  landline: string
  email: string
  address: string
  mapQuery: string
  hero: { badge: string; title: string; accent: string; text: string }
  fleet: { heading: string; text: string }
  about: { heading: string; text: string; quote: string; points: Point[] }
  features: { heading: string; items: Point[] }
  cta: { heading: string; text: string }
}

// Only facts that already existed on the original site. All marketing copy is edited from /admin.
export const DEFAULT_SITE: SiteContent = {
  name: 'Rent a Car Faisalabad',
  tagline: 'Premium Vehicle Services',
  description: 'Self-drive and chauffeur-driven car rentals in Faisalabad. Book directly on WhatsApp.',
  city: 'Faisalabad',
  phone: '+92 303 6262705',
  whatsapp: '923036262705',
  landline: '041-5392705',
  email: 'info@rentacarfsd.com',
  address: 'Shop 25, Shaheed Millat Market, Millat Chowk, Faisalabad, Pakistan',
  mapQuery: 'Millat Chowk, Faisalabad',
  hero: {
    badge: 'Faisalabad · Punjab, Pakistan',
    title: 'Rent a car in Faisalabad,',
    accent: 'booked in one message.',
    text: 'Self-drive and chauffeur-driven vehicles. Choose a car and send your booking request on WhatsApp.',
  },
  fleet: {
    heading: 'Check out our fleet',
    text: 'Pick a vehicle and send your booking request on WhatsApp.',
  },
  about: {
    heading: 'About Rent a Car Faisalabad',
    text: 'We rent self-drive and chauffeur-driven cars from our shop at Millat Chowk, Faisalabad.',
    quote: '',
    points: [
      { title: 'Self-Drive or With Chauffeur', text: 'Drive yourself or travel with a driver. Each vehicle lists its daily rate for the services it offers.' },
      { title: 'Book on WhatsApp', text: 'Send your name, dates and pickup point on WhatsApp to request a booking.' },
    ],
  },
  features: { heading: '', items: [] },
  cta: {
    heading: 'Pick your ride and send us a message.',
    text: 'Send your name, dates and pickup point in one WhatsApp message.',
  },
}

export const phoneHref = (s: string) => s.replace(/[^\d+]/g, '')
export const waLink = (number: string, text: string) => `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
export const mapSrc = (q: string) => `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&hl=en&output=embed`
export const mapLink = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
export const pkr = (n: number) => `PKR ${n.toLocaleString('en-US')}`

/** Normalize a stored vehicle record so older entries without `available` default to `true`. */
export function normalizeVehicle(v: Vehicle): Vehicle {
  return {
    ...v,
    selfDrivePrice: typeof v.selfDrivePrice === 'number' ? v.selfDrivePrice : null,
    chauffeurPrice: typeof v.chauffeurPrice === 'number' ? v.chauffeurPrice : null,
    image: typeof v.image === 'string' ? v.image : null,
    seats: typeof v.seats === 'number' ? v.seats : null,
    transmission: v.transmission === 'Automatic' || v.transmission === 'Manual' ? v.transmission : null,
    available: v.available !== false,
  }
}

/** Merge stored content over defaults so older/partial files never break the site. */
export function mergeSite(stored: unknown): SiteContent {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<SiteContent>
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d)
  const pts = (v: unknown, d: Point[]) =>
    Array.isArray(v) ? v.filter((p): p is Point => !!p && typeof p.title === 'string' && typeof p.text === 'string') : d
  const D = DEFAULT_SITE
  return {
    name: str(s.name, D.name), tagline: str(s.tagline, D.tagline), description: str(s.description, D.description),
    city: str(s.city, D.city), phone: str(s.phone, D.phone), whatsapp: str(s.whatsapp, D.whatsapp),
    landline: str(s.landline, D.landline), email: str(s.email, D.email), address: str(s.address, D.address),
    mapQuery: str(s.mapQuery, D.mapQuery),
    hero: {
      badge: str(s.hero?.badge, D.hero.badge), title: str(s.hero?.title, D.hero.title),
      accent: str(s.hero?.accent, D.hero.accent), text: str(s.hero?.text, D.hero.text),
    },
    fleet: {
      heading: str(s.fleet?.heading, D.fleet.heading), text: str(s.fleet?.text, D.fleet.text),
    },
    about: {
      heading: str(s.about?.heading, D.about.heading), text: str(s.about?.text, D.about.text),
      quote: str(s.about?.quote, D.about.quote), points: pts(s.about?.points, D.about.points),
    },
    features: { heading: str(s.features?.heading, D.features.heading), items: pts(s.features?.items, D.features.items) },
    cta: {
      heading: str(s.cta?.heading, D.cta.heading), text: str(s.cta?.text, D.cta.text),
    },
  }
}
