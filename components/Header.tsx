'use client'
import { useEffect, useRef, useState } from 'react'
import { phoneHref, waLink, type SiteContent } from '@/lib/data'
import Icon from './Icon'

export default function Header({
  site,
  showAbout,
  showWhy,
}: {
  site: SiteContent
  showAbout: boolean
  showWhy: boolean
}) {
  const [open, setOpen] = useState(false)
  const [stuck, setStuck] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onResize = () => {
      if (window.innerWidth > 1000) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const nav = [
    ['Home', '#home'],
    ['Our Fleet', '#fleet'],
    ...(showAbout ? [['About Us', '#about']] : []),
    ...(showWhy ? [['Why Us', '#why']] : []),
    ['Contact', '#contact'],
  ]

  const waUrl = waLink(site.whatsapp, site.whatsappMessage)

  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <a href={`tel:${phoneHref(site.phone)}`}>
            <Icon name="phone" size={14} /> {site.phone}
          </a>
          {site.email && (
            <a className="hide-sm" href={`mailto:${site.email}`}>
              <Icon name="mail" size={14} /> {site.email}
            </a>
          )}
          {site.hours && (
            <span className="topbar-hours hide-md">
              <Icon name="clock" size={14} /> {site.hours}
            </span>
          )}
        </div>
      </div>
      <header ref={headerRef} className={`hdr ${stuck ? 'stuck' : ''}`}>
        <div className="wrap bar">
          <a href="#home" className="brand" onClick={() => setOpen(false)}>
            <b>{site.name}</b>
            {site.tagline && <small>{site.tagline}</small>}
          </a>
          <nav id="primary-nav" className={open ? 'open' : ''} aria-label="Main">
            {nav.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setOpen(false)}>
                {label}
              </a>
            ))}
            <a
              className="btn wa sm nav-mobile-wa"
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <Icon name="wa" size={16} /> Book on WhatsApp
            </a>
          </nav>
          <div className="actions">
            <a className="btn ghost hide-md" href={waUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="wa" size={18} /> WhatsApp
            </a>
            <a className="btn copper" href={`tel:${phoneHref(site.phone)}`}>
              Call Now
            </a>
            <button
              type="button"
              className={`burger ${open ? 'open' : ''}`}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="primary-nav"
              onClick={() => setOpen((v) => !v)}
            >
              <i />
              <i />
              <i />
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
