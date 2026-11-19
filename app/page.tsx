import Header from '@/components/Header'
import Booking from '@/components/Booking'
import { Hero, About, Why, CTA, Contact, Footer, WhatsAppFab } from '@/components/Sections'
import { readDbSafe } from '@/lib/db'

// Always render fresh so changes made in /admin appear immediately.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const { site, vehicles } = await readDbSafe()
  const showWhy = site.features.items.length > 0
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AutoRental',
    name: site.name,
    description: site.description || undefined,
    telephone: site.phone,
    email: site.email || undefined,
    address: site.address
      ? { '@type': 'PostalAddress', streetAddress: site.address, addressLocality: site.city || 'Faisalabad', addressCountry: 'PK' }
      : undefined,
    areaServed: site.city || 'Faisalabad',
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <a className="skip" href="#main">Skip to content</a>
      <Header site={site} showWhy={showWhy} />
      <main id="main">
        <Hero site={site} />
        <Booking site={site} vehicles={vehicles} />
        <About site={site} />
        {showWhy && <Why site={site} />}
        <CTA site={site} />
        <Contact site={site} />
      </main>
      <Footer site={site} showWhy={showWhy} />
      <WhatsAppFab site={site} />
    </>
  )
}
