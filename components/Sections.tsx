import { mapLink, mapSrc, phoneHref, waLink, type SiteContent } from '@/lib/data'
import Icon, { type IconName } from './Icon'
import Reveal from './Reveal'

export function Hero({ site }: { site: SiteContent }) {
  const { hero } = site
  return (
    <section id="home" className="hero">
      <div className="road" aria-hidden="true" />
      <div className="wrap hero-in">
        {hero.badge && <p className="badge"><i /> {hero.badge}</p>}
        <h1>{hero.title}{hero.accent && <em>{hero.accent}</em>}</h1>
        {hero.text && <p className="sub">{hero.text}</p>}
        <div className="row">
          <a className="btn copper lg" href="#fleet">View Our Fleet <Icon name="arrow" size={18} /></a>
          <a className="btn wa lg" href={waLink(site.whatsapp, 'Hello, I would like to book a car.')} target="_blank" rel="noopener noreferrer"><Icon name="wa" size={20} /> Book on WhatsApp</a>
        </div>
      </div>
    </section>
  )
}

export function About({ site }: { site: SiteContent }) {
  const { about } = site
  if (!about.heading && !about.text && about.points.length === 0 && !about.quote) return null
  return (
    <section id="about" className={`wrap sec about ${about.quote ? '' : 'solo'}`}>
      {about.quote && (
        <Reveal className="about-card">
          <p className="big">{about.quote}</p>
        </Reveal>
      )}
      <Reveal delay={120} className="about-body">
        <div className="about-intro">
          <p className="eyebrow">About us</p>
          {about.heading && <h2>{about.heading}</h2>}
          {about.text && <p className="lead">{about.text}</p>}
        </div>
        {about.points.length > 0 && (
          <ol className="points">
            {about.points.map((p, i) => (
              <li key={i}><span>{String(i + 1).padStart(2, '0')}</span><div><h3>{p.title}</h3><p>{p.text}</p></div></li>
            ))}
          </ol>
        )}
      </Reveal>
    </section>
  )
}

export function Why({ site }: { site: SiteContent }) {
  const { features } = site
  return (
    <section id="why" className="why">
      <div className="wrap">
        <Reveal><p className="eyebrow center">Why choose us</p>{features.heading && <h2 className="center">{features.heading}</h2>}</Reveal>
        <div className="three">
          {features.items.map((p, i) => (
            <Reveal key={i} delay={i * 110} className="promise">
              <span className="ring">{String(i + 1).padStart(2, '0')}</span>
              <h3>{p.title}</h3><p>{p.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function CTA({ site }: { site: SiteContent }) {
  const { cta } = site
  return (
    <section className="wrap sec">
      <Reveal className="cta">
        <div>
          <p className="eyebrow gold">Ready to book?</p>
          {cta.heading && <h2>{cta.heading}</h2>}
          {cta.text && <p>{cta.text}</p>}
        </div>
        <div className="row">
          <a className="btn wa lg" href={waLink(site.whatsapp, 'Hello, I would like to book a car.')} target="_blank" rel="noopener noreferrer"><Icon name="wa" size={20} /> Message Us Now</a>
          <a className="btn outline lg" href={`tel:${phoneHref(site.phone)}`}>Call {site.phone}</a>
        </div>
      </Reveal>
    </section>
  )
}

export function Contact({ site }: { site: SiteContent }) {
  const rows: [IconName, string, string, string][] = []
  if (site.address) rows.push(['pin', 'Office address', site.address, mapLink(site.mapQuery || site.address)])
  rows.push(['phone', 'Phone & WhatsApp', site.phone, `tel:${phoneHref(site.phone)}`])
  if (site.landline) rows.push(['phone', 'Landline', site.landline, `tel:${phoneHref(site.landline)}`])
  if (site.email) rows.push(['mail', 'Email', site.email, `mailto:${site.email}`])
  return (
    <section id="contact" className="wrap sec">
      <Reveal>
        <p className="eyebrow">Get in touch</p>
        <h2>Visit, call, or send a message</h2>
      </Reveal>
      <div className="contact">
        <Reveal className="info">
          {rows.map(([icon, label, value, href]) => (
            <a key={label} href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              <span className="ci"><Icon name={icon} size={20} /></span>
              <div><small>{label}</small><p>{value}</p></div>
            </a>
          ))}
        </Reveal>
        <Reveal delay={120} className="map">
          <iframe title="Office location" src={mapSrc(site.mapQuery || site.address)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </Reveal>
      </div>
    </section>
  )
}

export function Footer({ site, showWhy }: { site: SiteContent; showWhy: boolean }) {
  const links = [['Home', '#home'], ['Our Fleet', '#fleet'], ['About Us', '#about'], ...(showWhy ? [['Why Us', '#why']] : []), ['Contact Us', '#contact']]
  return (
    <footer className="foot">
      <div className="wrap fgrid">
        <div><b className="fb">{site.name}</b>{site.description && <p>{site.description}</p>}</div>
        <div><h4>Quick links</h4>{links.map(([l, h]) => <a key={h} href={h}>{l}</a>)}</div>
        <div>
          <h4>Get in touch</h4>
          <a href={`tel:${phoneHref(site.phone)}`}>{site.phone}</a>
          {site.landline && <a href={`tel:${phoneHref(site.landline)}`}>{site.landline}</a>}
          {site.email && <a href={`mailto:${site.email}`}>{site.email}</a>}
          {site.address && <p>{site.address}</p>}
        </div>
      </div>
      <p className="wrap copy">© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
    </footer>
  )
}

export function WhatsAppFab({ site }: { site: SiteContent }) {
  return <a className="fab" href={waLink(site.whatsapp, 'Hello, I would like to book a car.')} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"><Icon name="wa" size={30} /></a>
}
