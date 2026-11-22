'use client'
import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  buildBookingWhatsAppText,
  calcRentalDays,
  getModes,
  modeLabel,
  pkr,
  priceFor,
  waLink,
  type BookingRequest,
  type Mode,
  type SiteContent,
  type Vehicle,
} from '@/lib/data'
import Icon from './Icon'
import Reveal from './Reveal'

function todayIso(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type BookingDraft = {
  customerName: string
  customerPhone: string
  pickupDate: string
  returnDate: string
  pickupLocation: string
  notes: string
}

export default function Booking({ site, vehicles }: { site: SiteContent; vehicles: Vehicle[] }) {
  const modes = useMemo(() => getModes(site), [site])
  const activeVehicles = useMemo(() => vehicles.filter((v) => v.available !== false), [vehicles])
  const hasSelfDrive = useMemo(() => activeVehicles.some((v) => v.selfDrivePrice !== null), [activeVehicles])
  const hasChauffeur = useMemo(() => activeVehicles.some((v) => v.chauffeurPrice !== null), [activeVehicles])
  const initialMode: Mode = !hasSelfDrive && hasChauffeur ? 'chauffeur' : 'self-drive'

  const [mode, setMode] = useState<Mode>(initialMode)
  const [cat, setCat] = useState<string>('all')
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({})

  // Booking request modal state
  const [selected, setSelected] = useState<Vehicle | null>(null)
  const [draft, setDraft] = useState<BookingDraft>({
    customerName: '',
    customerPhone: '',
    pickupDate: '',
    returnDate: '',
    pickupLocation: site.city || '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState<{ booking: BookingRequest; waUrl: string } | null>(null)

  const offered = useMemo(() => activeVehicles.filter((v) => priceFor(v, mode) !== null), [activeVehicles, mode])
  const cats = useMemo(
    () => site.categories.filter((c) => offered.some((v) => v.category === c.id)),
    [site.categories, offered]
  )
  const active = cat === 'all' || cats.some((c) => c.id === cat) ? cat : 'all'
  const shown = useMemo(
    () => (active === 'all' ? offered : offered.filter((v) => v.category === active)),
    [offered, active]
  )

  const categoryTag = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of site.categories) map.set(c.id, c.tag)
    return map
  }, [site.categories])

  const otherMode: Mode = mode === 'self-drive' ? 'chauffeur' : 'self-drive'
  const otherHasVehicles = otherMode === 'self-drive' ? hasSelfDrive : hasChauffeur

  useEffect(() => {
    if (!selected) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [selected])

  const arrows = (e: KeyboardEvent<HTMLButtonElement>) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const i = (modes.findIndex((m) => m.id === mode) + dir + modes.length) % modes.length
    setMode(modes[i].id)
    ;(e.currentTarget.parentElement?.children[i] as HTMLElement | undefined)?.focus()
  }

  const openModal = (v: Vehicle) => {
    setSelected(v)
    setConfirmed(null)
    setError('')
    setDraft((prev) => ({
      ...prev,
      pickupDate: prev.pickupDate || todayIso(0),
      returnDate: prev.returnDate || todayIso(1),
      pickupLocation: prev.pickupLocation || site.city || '',
    }))
  }

  const selectedRate = selected ? priceFor(selected, mode) ?? 0 : 0
  const estDays = calcRentalDays(draft.pickupDate, draft.returnDate)
  const estTotal = selectedRate * estDays

  const directWaUrl = selected
    ? waLink(
        site.whatsapp,
        `Hello, I would like to book the ${selected.name} (${modeLabel(mode, site)}) at ${pkr(selectedRate)} per day. My name, dates and pickup point:`
      )
    : ''

  const submitBooking = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selected.id,
          mode,
          customerName: draft.customerName,
          customerPhone: draft.customerPhone,
          pickupDate: draft.pickupDate,
          returnDate: draft.returnDate,
          pickupLocation: draft.pickupLocation,
          notes: draft.notes,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { booking?: BookingRequest; error?: string }
      if (!res.ok || !data.booking) {
        setError(data.error || 'Could not submit your request. Please try again or message us directly on WhatsApp.')
        setSubmitting(false)
        return
      }
      const waText = buildBookingWhatsAppText({
        vehicleName: data.booking.vehicleName,
        mode: data.booking.mode,
        site,
        dailyRate: data.booking.dailyRate,
        days: data.booking.days,
        estimatedTotal: data.booking.estimatedTotal,
        customerName: data.booking.customerName,
        customerPhone: data.booking.customerPhone,
        pickupDate: data.booking.pickupDate,
        returnDate: data.booking.returnDate,
        pickupLocation: data.booking.pickupLocation,
        notes: data.booking.notes,
      })
      const waUrl = waLink(site.whatsapp, waText)
      setConfirmed({ booking: data.booking, waUrl })
      setSubmitting(false)
      window.open(waUrl, '_blank', 'noopener,noreferrer')
    } catch {
      setError('Network error. You can still message us directly on WhatsApp below.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <section className="wrap mode-sec">
        <Reveal className="mode-card">
          {site.booking.eyebrow && <p className="eyebrow center">{site.booking.eyebrow}</p>}
          <h2 className="center">{site.booking.heading}</h2>
          <div className="modes" role="radiogroup" aria-label="Travel mode">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                tabIndex={mode === m.id ? 0 : -1}
                onKeyDown={arrows}
                className={`mode ${mode === m.id ? 'on' : ''}`}
                onClick={() => setMode(m.id)}
              >
                <span className="mi">
                  <Icon name={m.icon} size={24} />
                </span>
                <span className="mt">
                  <strong>{m.label}</strong>
                  <small>{m.text}</small>
                </span>
                <span className="tick">{mode === m.id && <Icon name="check" size={14} />}</span>
              </button>
            ))}
          </div>
          <p className="sel" aria-live="polite">
            Showing vehicles for <b>{modeLabel(mode, site)}</b>.{site.booking.note ? ` ${site.booking.note}` : ''}
          </p>
        </Reveal>
      </section>

      <section id="fleet" className="wrap sec">
        <Reveal>
          {site.fleet.eyebrow && <p className="eyebrow">{site.fleet.eyebrow}</p>}
          {site.fleet.heading && <h2>{site.fleet.heading}</h2>}
          {site.fleet.text && <p className="lead">{site.fleet.text}</p>}
          {cats.length > 1 && (
            <div className="pills" role="group" aria-label="Vehicle category">
              {[{ id: 'all', label: 'All vehicles' }, ...cats].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active === c.id}
                  className={`pill ${active === c.id ? 'on' : ''}`}
                  onClick={() => setCat(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </Reveal>

        {activeVehicles.length === 0 ? (
          <div className="empty">
            <p>{site.fleet.emptyText}</p>
            <a
              className="btn wa"
              href={waLink(site.whatsapp, 'Hello, which cars do you have available?')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="wa" size={18} /> Ask on WhatsApp
            </a>
          </div>
        ) : shown.length === 0 ? (
          <div className="empty">
            <p>
              No vehicles are listed for {modeLabel(mode, site)} right now.
              {otherHasVehicles
                ? ` Try ${modeLabel(otherMode, site)}, or message us on WhatsApp.`
                : ' Message us on WhatsApp to check availability.'}
            </p>
            <div className="row">
              {otherHasVehicles && (
                <button type="button" className="btn copper" onClick={() => setMode(otherMode)}>
                  Switch to {modeLabel(otherMode, site)}
                </button>
              )}
              <a
                className="btn wa"
                href={waLink(site.whatsapp, `Hello, do you have vehicles available for ${modeLabel(mode, site)}?`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="wa" size={18} /> Ask on WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <div className="grid">
            {shown.map((v, i) => {
              const price = priceFor(v, mode)!
              const tag = categoryTag.get(v.category) ?? v.category
              const specs = [v.seats ? `${v.seats} seats` : '', v.transmission ?? '', v.fuel ?? '']
                .filter(Boolean)
                .join(' · ')
              const hasPhoto = Boolean(v.image) && !brokenImages[v.id]
              return (
                <article className="card" key={v.id} style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                  <div className="ph">
                    {hasPhoto ? (
                      <img
                        src={v.image!}
                        alt={v.name}
                        loading={i < 4 ? 'eager' : 'lazy'}
                        decoding="async"
                        onError={() => setBrokenImages((m) => ({ ...m, [v.id]: true }))}
                      />
                    ) : (
                      <div className="ph-fallback" aria-hidden="true">
                        <Icon name="car" size={44} />
                      </div>
                    )}
                    <span className="no">{String(i + 1).padStart(2, '0')}</span>
                    <span className="tag">{tag}</span>
                  </div>
                  <div className="cb">
                    <h3>{v.name}</h3>
                    <p className="meta loc">
                      <Icon name="pin" size={12} /> {[site.city, modeLabel(mode, site)].filter(Boolean).join(' · ')}
                    </p>
                    {specs && <p className="meta">{specs}</p>}
                    <hr />
                    <p className="rate">Rental rate / day</p>
                    <p className="price">{pkr(price)}</p>
                    <button type="button" className="btn wa" onClick={() => openModal(v)}>
                      <Icon name="wa" size={18} /> Book on WhatsApp
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Booking Request Modal (preserves card design while syncing bookings directly to /admin) */}
      {selected && (
        <div
          className="bk-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bk-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null)
          }}
        >
          <div className="bk-modal">
            <div className="bk-head">
              <div className="bk-car">
                {selected.image && !brokenImages[selected.id] ? (
                  <img src={selected.image} alt={selected.name} className="bk-thumb" />
                ) : (
                  <div className="bk-thumb bk-thumb-fallback">
                    <Icon name="car" size={24} />
                  </div>
                )}
                <div className="bk-car-meta">
                  <span className="bk-mode-pill">{modeLabel(mode, site)}</span>
                  <h3 id="bk-modal-title">{selected.name}</h3>
                  <p className="bk-rate">{pkr(selectedRate)} / day</p>
                </div>
              </div>
              <button
                type="button"
                className="bk-close"
                aria-label="Close booking dialog"
                onClick={() => setSelected(null)}
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {confirmed ? (
              <div className="bk-success">
                <div className="bk-success-icon">
                  <Icon name="check" size={28} />
                </div>
                <h4>Booking Request Sent!</h4>
                <p>
                  Your request for <strong>{confirmed.booking.vehicleName}</strong> ({confirmed.booking.days}{' '}
                  {confirmed.booking.days === 1 ? 'day' : 'days'} · Est. {pkr(confirmed.booking.estimatedTotal)}) has
                  been recorded. Finish confirming with our team on WhatsApp.
                </p>
                <div className="bk-success-actions">
                  <a
                    className="btn wa lg w-full"
                    href={confirmed.waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="wa" size={18} /> Open WhatsApp Chat
                  </a>
                  <button type="button" className="btn ghost w-full" onClick={() => setSelected(null)}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form className="bk-form" onSubmit={submitBooking}>
                <div className="bk-grid">
                  <label className="bk-field">
                    <span>Full Name *</span>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      placeholder="Your full name"
                      value={draft.customerName}
                      onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
                    />
                  </label>
                  <label className="bk-field">
                    <span>Phone / WhatsApp *</span>
                    <input
                      type="tel"
                      required
                      maxLength={30}
                      autoComplete="tel"
                      placeholder="e.g. 0300 1234567"
                      value={draft.customerPhone}
                      onChange={(e) => setDraft({ ...draft, customerPhone: e.target.value })}
                    />
                  </label>
                  <label className="bk-field">
                    <span>Pickup Date *</span>
                    <input
                      type="date"
                      required
                      min={todayIso(0)}
                      value={draft.pickupDate}
                      onChange={(e) => {
                        const nextPickup = e.target.value
                        setDraft((d) => ({
                          ...d,
                          pickupDate: nextPickup,
                          returnDate: d.returnDate < nextPickup ? nextPickup : d.returnDate,
                        }))
                      }}
                    />
                  </label>
                  <label className="bk-field">
                    <span>Return Date *</span>
                    <input
                      type="date"
                      required
                      min={draft.pickupDate || todayIso(0)}
                      value={draft.returnDate}
                      onChange={(e) => setDraft({ ...draft, returnDate: e.target.value })}
                    />
                  </label>
                </div>

                <label className="bk-field">
                  <span>Pickup Location *</span>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={200}
                    placeholder={`e.g. ${site.city || 'Faisalabad'} Airport, Millat Chowk`}
                    value={draft.pickupLocation}
                    onChange={(e) => setDraft({ ...draft, pickupLocation: e.target.value })}
                  />
                </label>

                <label className="bk-field">
                  <span>Additional Notes (optional)</span>
                  <textarea
                    rows={2}
                    maxLength={400}
                    placeholder="Pickup time, trip destination, special requests..."
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  />
                </label>

                <div className="bk-summary">
                  <span>
                    Estimated Total ({estDays} {estDays === 1 ? 'day' : 'days'})
                  </span>
                  <strong>{pkr(estTotal)}</strong>
                </div>

                {error && (
                  <div className="adm-alert err" role="alert">
                    <Icon name="alert" size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="bk-actions">
                  <button type="submit" className="btn wa lg w-full" disabled={submitting}>
                    <Icon name="wa" size={18} />
                    <span>{submitting ? 'Sending request...' : 'Confirm & Send on WhatsApp'}</span>
                  </button>
                  <a
                    className="bk-skip-link"
                    href={directWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Skip form & chat on WhatsApp directly →
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
