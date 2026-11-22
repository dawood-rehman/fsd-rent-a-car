import Header from '@/components/Header'
import Booking from '@/components/Booking'
import { Hero, About, Why, CTA, Contact, Footer, WhatsAppFab } from '@/components/Sections'
import { getSiteDb } from '@/lib/db'

// Cached with ISR for high-traffic speed; immediately revalidated on every /admin mutation.
export const revalidate = 300

export default async function Home() {
  const { site, vehicles } = await getSiteDb()
  const availableVehicles = vehicles.filter((v) => v.available !== false)
  const showWhy = site.features.items.length > 0
  const showAbout = Boolean(site.about.heading || site.about.text || site.about.points.length > 0 || site.about.quote)
  const showCta = Boolean(site.cta.heading || site.cta.text)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AutoRental',
    name: site.name,
    description: site.description || undefined,
    telephone: site.phone,
    email: site.email || undefined,
    openingHours: site.hours || undefined,
    address: site.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: site.address,
          addressLocality: site.city || 'Faisalabad',
          addressCountry: 'PK',
        }
      : undefined,
    areaServed: site.city || 'Faisalabad',
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <a className="skip" href="#main">Skip to content</a>
      <Header site={site} showAbout={showAbout} showWhy={showWhy} />
      <main id="main">
        <Hero site={site} />
        <Booking site={site} vehicles={availableVehicles} />
        {showAbout && <About site={site} />}
        {showWhy && <Why site={site} />}
        {showCta && <CTA site={site} />}
        <Contact site={site} />
      </main>
      <Footer site={site} showAbout={showAbout} showWhy={showWhy} />
      <WhatsAppFab site={site} />
    </>
  )
}
