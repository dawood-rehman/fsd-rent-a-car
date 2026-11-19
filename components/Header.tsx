'use client'
import { useEffect, useState } from 'react'
import { phoneHref, waLink, type SiteContent } from '@/lib/data'
import Icon from './Icon'

export default function Header({ site, showWhy }: { site: SiteContent; showWhy: boolean }) {
  const [open, setOpen] = useState(false)
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const on = () => setStuck(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const nav = [['Home', '#home'], ['Our Fleet', '#fleet'], ['About Us', '#about'], ...(showWhy ? [['Why Us', '#why']] : []), ['Contact', '#contact']]

  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <a href={`tel:${phoneHref(site.phone)}`}><Icon name="phone" size={14} /> {site.phone}</a>
          {site.email && <a className="hide-sm" href={`mailto:${site.email}`}><Icon name="mail" size={14} /> {site.email}</a>}
        </div>
      </div>
      <header className={`hdr ${stuck ? 'stuck' : ''}`}>
        <div className="wrap bar">
          <a href="#home" className="brand" onClick={() => setOpen(false)}>
            <b>{site.name}</b>
            {site.tagline && <small>{site.tagline}</small>}
          </a>
          <nav className={open ? 'open' : ''} aria-label="Main">
            {nav.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
          </nav>
          <div className="actions">
            <a className="btn ghost hide-md" href={waLink(site.whatsapp, 'Hello, I would like to book a car.')} target="_blank" rel="noopener noreferrer"><Icon name="wa" size={18} /> WhatsApp</a>
            <a className="btn copper" href={`tel:${phoneHref(site.phone)}`}>Call Now</a>
            <button className="burger" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}><i /><i /><i /></button>
          </div>
        </div>
      </header>
    </>
  )
}
