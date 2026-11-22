// Shared types, defaults and pure helpers. Safe to import from both server and client code.

export type Mode = 'self-drive' | 'chauffeur'
export type Transmission = 'Automatic' | 'Manual'
export type FuelType = 'Petrol' | 'Hybrid' | 'Diesel' | 'Electric'
export type BookingStatus = 'new' | 'confirmed' | 'completed' | 'cancelled'

export const FUEL_TYPES: FuelType[] = ['Petrol', 'Hybrid', 'Diesel', 'Electric']

export type CategoryItem = {
  id: string
  label: string
  tag: string
}

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'economy', label: 'Economy & Sedans', tag: 'Sedan' },
  { id: 'suv', label: 'SUV & Luxury', tag: 'SUV' },
  { id: 'van', label: 'Vans & Coasters', tag: 'Van' },
]

export const BOOKING_STATUSES: { id: BookingStatus; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

/** A price of `null` means the vehicle is not offered in that mode. */
export type Vehicle = {
  id: string
  name: string
  category: string
  selfDrivePrice: number | null
  chauffeurPrice: number | null
  image: string | null
  seats: number | null
  transmission: Transmission | null
  fuel: FuelType | null
  available: boolean
}

export type BookingRequest = {
  id: string
  vehicleId: string
  vehicleName: string
  mode: Mode
  dailyRate: number
  days: number
  estimatedTotal: number
  customerName: string
  customerPhone: string
  pickupDate: string
  returnDate: string
  pickupLocation: string
  notes: string
  status: BookingStatus
  createdAt: string
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
  whatsappMessage: string
  landline: string
  email: string
  address: string
  hours: string
  mapQuery: string
  footerNote: string
  categories: CategoryItem[]
  hero: {
    badge: string
    title: string
    accent: string
    text: string
    primaryCta: string
    secondaryCta: string
  }
  booking: {
    eyebrow: string
    heading: string
    note: string
    selfDriveLabel: string
    selfDriveText: string
    chauffeurLabel: string
    chauffeurText: string
  }
  fleet: {
    eyebrow: string
    heading: string
    text: string
    emptyText: string
  }
  about: {
    eyebrow: string
    heading: string
    text: string
    quote: string
    points: Point[]
  }
  features: {
    eyebrow: string
    heading: string
    items: Point[]
  }
  cta: {
    eyebrow: string
    heading: string
    text: string
    primaryCta: string
  }
  contact: {
    eyebrow: string
    heading: string
  }
}

export const DEFAULT_SITE: SiteContent = {
  name: 'Rent a Car Faisalabad',
  tagline: 'Premium Vehicle Services',
  description: 'Self-drive and chauffeur-driven car rentals in Faisalabad. Book directly on WhatsApp.',
  city: 'Faisalabad',
  phone: '+92 303 6262705',
  whatsapp: '923036262705',
  whatsappMessage: 'Hello, I would like to book a car.',
  landline: '041-5392705',
  email: 'info@rentacarfsd.com',
  address: 'Shop 25, Shaheed Millat Market, Millat Chowk, Faisalabad, Pakistan',
  hours: '',
  mapQuery: 'Millat Chowk, Faisalabad',
  footerNote: '',
  categories: DEFAULT_CATEGORIES,
  hero: {
    badge: 'Faisalabad · Punjab, Pakistan',
    title: 'Rent a car in Faisalabad,',
    accent: 'booked in one message.',
    text: 'Self-drive and chauffeur-driven vehicles. Choose a car and send your booking request on WhatsApp.',
    primaryCta: 'View Our Fleet',
    secondaryCta: 'Book on WhatsApp',
  },
  booking: {
    eyebrow: 'Choose a service',
    heading: 'How would you like to travel?',
    note: 'Prices differ by service.',
    selfDriveLabel: 'Self-Drive',
    selfDriveText: 'You take the wheel, we hand over the keys',
    chauffeurLabel: 'With Chauffeur',
    chauffeurText: 'Sit back, our professional driver takes you there',
  },
  fleet: {
    eyebrow: 'The collection',
    heading: 'Check out our fleet',
    text: 'Pick a vehicle and send your booking request on WhatsApp.',
    emptyText: 'Our vehicle list is not available online right now. Message us on WhatsApp to ask which cars are available.',
  },
  about: {
    eyebrow: 'About us',
    heading: 'About Rent a Car Faisalabad',
    text: 'We rent self-drive and chauffeur-driven cars from our shop at Millat Chowk, Faisalabad.',
    quote: '',
    points: [
      { title: 'Self-Drive or With Chauffeur', text: 'Drive yourself or travel with a driver. Each vehicle lists its daily rate for the services it offers.' },
      { title: 'Book on WhatsApp', text: 'Send your name, dates and pickup point on WhatsApp to request a booking.' },
    ],
  },
  features: { eyebrow: 'Why choose us', heading: '', items: [] },
  cta: {
    eyebrow: 'Ready to book?',
    heading: 'Pick your ride and send us a message.',
    text: 'Send your name, dates and pickup point in one WhatsApp message.',
    primaryCta: 'Message Us Now',
  },
  contact: {
    eyebrow: 'Get in touch',
    heading: 'Visit, call, or send a message',
  },
}

export function getModes(site: SiteContent): { id: Mode; label: string; icon: 'wheel' | 'user'; text: string }[] {
  return [
    {
      id: 'self-drive',
      label: site.booking.selfDriveLabel || DEFAULT_SITE.booking.selfDriveLabel,
      icon: 'wheel',
      text: site.booking.selfDriveText || DEFAULT_SITE.booking.selfDriveText,
    },
    {
      id: 'chauffeur',
      label: site.booking.chauffeurLabel || DEFAULT_SITE.booking.chauffeurLabel,
      icon: 'user',
      text: site.booking.chauffeurText || DEFAULT_SITE.booking.chauffeurText,
    },
  ]
}

export function modeLabel(m: Mode, site?: SiteContent): string {
  if (site) {
    return m === 'self-drive'
      ? site.booking.selfDriveLabel || DEFAULT_SITE.booking.selfDriveLabel
      : site.booking.chauffeurLabel || DEFAULT_SITE.booking.chauffeurLabel
  }
  return m === 'self-drive' ? DEFAULT_SITE.booking.selfDriveLabel : DEFAULT_SITE.booking.chauffeurLabel
}

export const phoneHref = (s: string) => s.replace(/[^\d+]/g, '')
export const waLink = (number: string, text: string) => `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
export const mapSrc = (q: string) => `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&hl=en&output=embed`
export const mapLink = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
export const pkr = (n: number) => `PKR ${n.toLocaleString('en-US')}`

/** Inclusive rental day count between two YYYY-MM-DD dates (minimum 1 day). */
export function calcRentalDays(pickupDate: string, returnDate: string): number {
  const start = Date.parse(`${pickupDate}T00:00:00Z`)
  const end = Date.parse(`${returnDate}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1
  return Math.max(1, Math.round((end - start) / 86_400_000) || 1)
}

export function buildBookingWhatsAppText(params: {
  vehicleName: string
  mode: Mode
  site: SiteContent
  dailyRate: number
  days: number
  estimatedTotal: number
  customerName: string
  customerPhone: string
  pickupDate: string
  returnDate: string
  pickupLocation: string
  notes?: string
}): string {
  const lines = [
    `Hello, I would like to book the *${params.vehicleName}* (${modeLabel(params.mode, params.site)}).`,
    `Rate: ${pkr(params.dailyRate)} / day · ${params.days} ${params.days === 1 ? 'day' : 'days'} (Est. ${pkr(params.estimatedTotal)})`,
    `Name: ${params.customerName}`,
    `Phone: ${params.customerPhone}`,
    `Pickup: ${params.pickupDate} -> Return: ${params.returnDate}`,
    `Pickup location: ${params.pickupLocation}`,
  ]
  if (params.notes?.trim()) lines.push(`Notes: ${params.notes.trim()}`)
  return lines.join('\n')
}

export function slugifyCategoryId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

/** Normalize a stored vehicle record so older entries stay fully compatible. */
export function normalizeVehicle(v: Vehicle): Vehicle {
  return {
    ...v,
    category: typeof v.category === 'string' && v.category.trim() ? v.category.trim() : 'economy',
    selfDrivePrice: typeof v.selfDrivePrice === 'number' ? v.selfDrivePrice : null,
    chauffeurPrice: typeof v.chauffeurPrice === 'number' ? v.chauffeurPrice : null,
    image: typeof v.image === 'string' ? v.image : null,
    seats: typeof v.seats === 'number' ? v.seats : null,
    transmission: v.transmission === 'Automatic' || v.transmission === 'Manual' ? v.transmission : null,
    fuel: FUEL_TYPES.includes(v.fuel as FuelType) ? (v.fuel as FuelType) : null,
    available: v.available !== false,
  }
}

export function normalizeBooking(b: unknown): BookingRequest | null {
  if (!b || typeof b !== 'object') return null
  const r = b as Partial<BookingRequest>
  if (typeof r.id !== 'string' || typeof r.vehicleName !== 'string' || typeof r.customerName !== 'string') return null
  const mode: Mode = r.mode === 'chauffeur' ? 'chauffeur' : 'self-drive'
  const status: BookingStatus =
    r.status === 'confirmed' || r.status === 'completed' || r.status === 'cancelled' ? r.status : 'new'
  const dailyRate = typeof r.dailyRate === 'number' && r.dailyRate > 0 ? r.dailyRate : 0
  const days = typeof r.days === 'number' && r.days >= 1 ? r.days : 1
  return {
    id: r.id,
    vehicleId: typeof r.vehicleId === 'string' ? r.vehicleId : '',
    vehicleName: r.vehicleName,
    mode,
    dailyRate,
    days,
    estimatedTotal: typeof r.estimatedTotal === 'number' && r.estimatedTotal >= 0 ? r.estimatedTotal : dailyRate * days,
    customerName: r.customerName,
    customerPhone: typeof r.customerPhone === 'string' ? r.customerPhone : '',
    pickupDate: typeof r.pickupDate === 'string' ? r.pickupDate : '',
    returnDate: typeof r.returnDate === 'string' ? r.returnDate : '',
    pickupLocation: typeof r.pickupLocation === 'string' ? r.pickupLocation : '',
    notes: typeof r.notes === 'string' ? r.notes : '',
    status,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
  }
}

/** Merge stored content over defaults so older/partial files never break the site. */
export function mergeSite(stored: unknown): SiteContent {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<SiteContent>
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d)
  const pts = (v: unknown, d: Point[]) =>
    Array.isArray(v)
      ? v.filter((p): p is Point => !!p && typeof p.title === 'string' && typeof p.text === 'string')
      : d
  const cats = (v: unknown): CategoryItem[] => {
    if (!Array.isArray(v) || v.length === 0) return DEFAULT_CATEGORIES
    const seen = new Set<string>()
    const out: CategoryItem[] = []
    for (const c of v) {
      if (!c || typeof c !== 'object') continue
      const item = c as Partial<CategoryItem>
      const id = typeof item.id === 'string' ? item.id.trim() : ''
      const label = typeof item.label === 'string' ? item.label.trim() : ''
      const tag = typeof item.tag === 'string' ? item.tag.trim() : ''
      if (!id || !label || seen.has(id)) continue
      seen.add(id)
      out.push({ id, label, tag: tag || label })
    }
    return out.length > 0 ? out : DEFAULT_CATEGORIES
  }
  const D = DEFAULT_SITE
  return {
    name: str(s.name, D.name),
    tagline: str(s.tagline, D.tagline),
    description: str(s.description, D.description),
    city: str(s.city, D.city),
    phone: str(s.phone, D.phone),
    whatsapp: str(s.whatsapp, D.whatsapp),
    whatsappMessage: str(s.whatsappMessage, D.whatsappMessage),
    landline: str(s.landline, D.landline),
    email: str(s.email, D.email),
    address: str(s.address, D.address),
    hours: str(s.hours, D.hours),
    mapQuery: str(s.mapQuery, D.mapQuery),
    footerNote: str(s.footerNote, D.footerNote),
    categories: cats(s.categories),
    hero: {
      badge: str(s.hero?.badge, D.hero.badge),
      title: str(s.hero?.title, D.hero.title),
      accent: str(s.hero?.accent, D.hero.accent),
      text: str(s.hero?.text, D.hero.text),
      primaryCta: str(s.hero?.primaryCta, D.hero.primaryCta),
      secondaryCta: str(s.hero?.secondaryCta, D.hero.secondaryCta),
    },
    booking: {
      eyebrow: str(s.booking?.eyebrow, D.booking.eyebrow),
      heading: str(s.booking?.heading, D.booking.heading),
      note: str(s.booking?.note, D.booking.note),
      selfDriveLabel: str(s.booking?.selfDriveLabel, D.booking.selfDriveLabel),
      selfDriveText: str(s.booking?.selfDriveText, D.booking.selfDriveText),
      chauffeurLabel: str(s.booking?.chauffeurLabel, D.booking.chauffeurLabel),
      chauffeurText: str(s.booking?.chauffeurText, D.booking.chauffeurText),
    },
    fleet: {
      eyebrow: str(s.fleet?.eyebrow, D.fleet.eyebrow),
      heading: str(s.fleet?.heading, D.fleet.heading),
      text: str(s.fleet?.text, D.fleet.text),
      emptyText: str(s.fleet?.emptyText, D.fleet.emptyText),
    },
    about: {
      eyebrow: str(s.about?.eyebrow, D.about.eyebrow),
      heading: str(s.about?.heading, D.about.heading),
      text: str(s.about?.text, D.about.text),
      quote: str(s.about?.quote, D.about.quote),
      points: pts(s.about?.points, D.about.points),
    },
    features: {
      eyebrow: str(s.features?.eyebrow, D.features.eyebrow),
      heading: str(s.features?.heading, D.features.heading),
      items: pts(s.features?.items, D.features.items),
    },
    cta: {
      eyebrow: str(s.cta?.eyebrow, D.cta.eyebrow),
      heading: str(s.cta?.heading, D.cta.heading),
      text: str(s.cta?.text, D.cta.text),
      primaryCta: str(s.cta?.primaryCta, D.cta.primaryCta),
    },
    contact: {
      eyebrow: str(s.contact?.eyebrow, D.contact.eyebrow),
      heading: str(s.contact?.heading, D.contact.heading),
    },
  }
}
