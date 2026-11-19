'use client'
import { useState, type KeyboardEvent } from 'react'
import { CATEGORIES, MODES, modeLabel, pkr, priceFor, waLink, type Category, type Mode, type SiteContent, type Vehicle } from '@/lib/data'
import Icon from './Icon'
import Reveal from './Reveal'

export default function Booking({ site, vehicles }: { site: SiteContent; vehicles: Vehicle[] }) {
  const activeVehicles = vehicles.filter((v) => v.available !== false)
  const hasSelfDrive = activeVehicles.some((v) => v.selfDrivePrice !== null)
  const hasChauffeur = activeVehicles.some((v) => v.chauffeurPrice !== null)
  const initialMode: Mode = !hasSelfDrive && hasChauffeur ? 'chauffeur' : 'self-drive'

  const [mode, setMode] = useState<Mode>(initialMode)
  const [cat, setCat] = useState<Category | 'all'>('all')

  const offered = activeVehicles.filter((v) => priceFor(v, mode) !== null)
  const cats = CATEGORIES.filter((c) => offered.some((v) => v.category === c.id))
  const active = cat === 'all' || cats.some((c) => c.id === cat) ? cat : 'all'
  const shown = active === 'all' ? offered : offered.filter((v) => v.category === active)

  const arrows = (e: KeyboardEvent<HTMLButtonElement>) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const i = (MODES.findIndex((m) => m.id === mode) + dir + MODES.length) % MODES.length
    setMode(MODES[i].id)
    ;(e.currentTarget.parentElement?.children[i] as HTMLElement | undefined)?.focus()
  }

  return (
    <>
      <section className="wrap mode-sec">
        <Reveal className="mode-card">
          <p className="eyebrow center">Choose a service</p>
          <h2 className="center">How would you like to travel?</h2>
          <div className="modes" role="radiogroup" aria-label="Travel mode">
            {MODES.map((m) => (
              <button key={m.id} role="radio" aria-checked={mode === m.id} tabIndex={mode === m.id ? 0 : -1} onKeyDown={arrows} className={`mode ${mode === m.id ? 'on' : ''}`} onClick={() => setMode(m.id)}>
                <span className="mi"><Icon name={m.icon} size={24} /></span>
                <span className="mt"><strong>{m.label}</strong><small>{m.text}</small></span>
                <span className="tick">{mode === m.id && <Icon name="check" size={14} />}</span>
              </button>
            ))}
          </div>
          <p className="sel" aria-live="polite">Showing vehicles for <b>{modeLabel(mode)}</b>. Prices differ by service.</p>
        </Reveal>
      </section>

      <section id="fleet" className="wrap sec">
        <Reveal>
          <p className="eyebrow">The collection</p>
          {site.fleet.heading && <h2>{site.fleet.heading}</h2>}
          {site.fleet.text && <p className="lead">{site.fleet.text}</p>}
          {cats.length > 1 && (
            <div className="pills" role="group" aria-label="Vehicle category">
              {[{ id: 'all' as const, label: 'All vehicles' }, ...cats].map((c) => (
                <button key={c.id} aria-pressed={active === c.id} className={`pill ${active === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>
              ))}
            </div>
          )}
        </Reveal>

        {activeVehicles.length === 0 ? (
          <div className="empty">
            <p>Our vehicle list is not available online right now. Message us on WhatsApp to ask which cars are available.</p>
            <a className="btn wa" href={waLink(site.whatsapp, 'Hello, which cars do you have available?')} target="_blank" rel="noopener noreferrer"><Icon name="wa" size={18} /> Ask on WhatsApp</a>
          </div>
        ) : shown.length === 0 ? (
          <p className="empty">No vehicles are listed for {modeLabel(mode)} right now. Try the other service, or message us on WhatsApp.</p>
        ) : (
          <div className="grid" key={`${mode}-${active}`}>
            {shown.map((v, i) => {
              const price = priceFor(v, mode)!
              const tag = CATEGORIES.find((c) => c.id === v.category)?.tag
              const specs = [v.seats ? `${v.seats} seats` : '', v.transmission ?? ''].filter(Boolean).join(' · ')
              return (
                <article className="card" key={v.id} style={{ animationDelay: `${i * 70}ms` }}>
                  {v.image && (
                    <div className="ph">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.image} alt={v.name} loading="lazy" />
                      <span className="no">{String(i + 1).padStart(2, '0')}</span>
                      <span className="tag">{tag}</span>
                    </div>
                  )}
                  <div className="cb">
                    {!v.image && <span className="tag solo">{tag}</span>}
                    <h3>{v.name}</h3>
                    <p className="meta loc"><Icon name="pin" size={12} /> {[site.city, modeLabel(mode)].filter(Boolean).join(' · ')}</p>
                    {specs && <p className="meta">{specs}</p>}
                    <hr />
                    <p className="rate">Rental rate / day</p>
                    <p className="price">{pkr(price)}</p>
                    <a className="btn wa" href={waLink(site.whatsapp, `Hello, I would like to book the ${v.name} (${modeLabel(mode)}) at ${pkr(price)} per day. My name, dates and pickup point:`)} target="_blank" rel="noopener noreferrer"><Icon name="wa" size={18} /> Book on WhatsApp</a>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
