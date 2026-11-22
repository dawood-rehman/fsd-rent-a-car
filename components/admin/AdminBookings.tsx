'use client'
import { useMemo, useState } from 'react'
import {
  BOOKING_STATUSES,
  modeLabel,
  phoneHref,
  pkr,
  waLink,
  type BookingRequest,
  type BookingStatus,
  type SiteContent,
  type Vehicle,
} from '@/lib/data'
import Icon from '@/components/Icon'
import { api } from './api'

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function AdminBookings({
  bookings,
  vehicles,
  site,
  refreshing,
  onRefresh,
  onBookingsChange,
  onVehicleUpdated,
}: {
  bookings: BookingRequest[]
  vehicles: Vehicle[]
  site: SiteContent
  refreshing: boolean
  onRefresh: () => Promise<void>
  onBookingsChange: (next: BookingRequest[]) => void
  onVehicleUpdated: (v: Vehicle) => void
}) {
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const counts = useMemo(() => {
    const c = { all: bookings.length, new: 0, confirmed: 0, completed: 0, cancelled: 0 }
    for (const b of bookings) c[b.status] += 1
    return c
  }, [bookings])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bookings.filter((b) => {
      if (filter !== 'all' && b.status !== filter) return false
      if (!q) return true
      return (
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.toLowerCase().includes(q) ||
        b.vehicleName.toLowerCase().includes(q) ||
        b.pickupLocation.toLowerCase().includes(q)
      )
    })
  }, [bookings, filter, query])

  const vehicleMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles])

  const updateStatus = async (b: BookingRequest, status: BookingStatus, vehicleAvailable?: boolean) => {
    setBusyId(b.id)
    setMsg(null)
    const r = await api<{ booking: BookingRequest; vehicle?: Vehicle | null }>(`/api/admin/bookings/${b.id}`, 'PATCH', {
      status,
      ...(vehicleAvailable !== undefined ? { vehicleAvailable } : {}),
    })
    setBusyId(null)
    if (!r.ok) {
      setMsg({ kind: 'err', text: r.error })
      return
    }
    onBookingsChange(bookings.map((x) => (x.id === b.id ? r.data.booking : x)))
    if (r.data.vehicle) onVehicleUpdated(r.data.vehicle)
    setMsg({ kind: 'ok', text: `Updated booking for ${b.customerName} to "${status}".` })
  }

  const remove = async (b: BookingRequest) => {
    setBusyId(b.id)
    setMsg(null)
    const r = await api(`/api/admin/bookings/${b.id}`, 'DELETE')
    setBusyId(null)
    setConfirmDeleteId(null)
    if (!r.ok) {
      setMsg({ kind: 'err', text: r.error })
      return
    }
    onBookingsChange(bookings.filter((x) => x.id !== b.id))
    setMsg({ kind: 'ok', text: `Deleted booking request from ${b.customerName}.` })
  }

  return (
    <div className="adm-stack">
      {/* Stats Strip */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card">
          <span className="adm-stat-label">Total Requests</span>
          <strong>{counts.all}</strong>
        </div>
        <div className="adm-stat-card is-new">
          <span className="adm-stat-label">New / Pending</span>
          <strong>{counts.new}</strong>
        </div>
        <div className="adm-stat-card is-ok">
          <span className="adm-stat-label">Confirmed</span>
          <strong>{counts.confirmed}</strong>
        </div>
        <div className="adm-stat-card">
          <span className="adm-stat-label">Completed</span>
          <strong>{counts.completed}</strong>
        </div>
      </div>

      {/* Header & Filters */}
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="calendar" size={20} />
          </div>
          <div className="adm-card-title-group">
            <h2>Customer Booking Requests</h2>
            <p className="adm-card-desc">
              Requests submitted on your website appear here immediately. Update status, reply on WhatsApp, or toggle car availability.
            </p>
          </div>
          <button type="button" className="btn ghost sm" onClick={onRefresh} disabled={refreshing}>
            <Icon name="refresh" size={14} />
            <span>{refreshing ? 'Checking...' : 'Check for new'}</span>
          </button>
        </div>

        <div className="adm-toolbar">
          <div className="adm-search-wrap">
            <Icon name="search" size={16} />
            <input
              type="search"
              placeholder="Search customer, phone, car or location..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="adm-filter-pills" role="group" aria-label="Filter bookings by status">
            {([{ id: 'all', label: 'All' }, ...BOOKING_STATUSES] as const).map((s) => (
              <button
                key={s.id}
                type="button"
                className={`adm-chip ${filter === s.id ? 'on' : ''}`}
                onClick={() => setFilter(s.id)}
              >
                {s.label} ({counts[s.id]})
              </button>
            ))}
          </div>
        </div>

        {msg && (
          <div className={`adm-alert ${msg.kind}`} role="status">
            <Icon name={msg.kind === 'ok' ? 'check' : 'alert'} size={16} />
            <span>{msg.text}</span>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="adm-empty-inline">
            <div className="adm-empty-icon">
              <Icon name="calendar" size={34} />
            </div>
            <h3>{bookings.length === 0 ? 'No booking requests yet' : 'No matching bookings'}</h3>
            <p>
              {bookings.length === 0
                ? 'When customers submit a booking request on your website, it will appear here right away.'
                : 'Try clearing your search or selecting a different status filter.'}
            </p>
          </div>
        ) : (
          <div className="adm-bookings-list">
            {filtered.map((b) => {
              const linkedCar = vehicleMap.get(b.vehicleId)
              const customerWaDigits = b.customerPhone.replace(/\D/g, '')
              const customerWa =
                customerWaDigits.length >= 10
                  ? waLink(
                      customerWaDigits.startsWith('0') ? `92${customerWaDigits.slice(1)}` : customerWaDigits,
                      `Hello ${b.customerName}, regarding your ${site.name} booking request for ${b.vehicleName} (${b.pickupDate} to ${b.returnDate}): `
                    )
                  : ''
              return (
                <article key={b.id} className={`adm-booking-item status-${b.status}`}>
                  <div className="adm-booking-top">
                    <div className="adm-booking-title">
                      <h3>{b.vehicleName}</h3>
                      <span className="adm-mode-tag">{modeLabel(b.mode, site)}</span>
                      <span className={`adm-booking-badge ${b.status}`}>{b.status}</span>
                    </div>
                    <time className="adm-booking-time" dateTime={b.createdAt}>
                      {formatTimestamp(b.createdAt)}
                    </time>
                  </div>

                  <div className="adm-booking-meta-grid">
                    <div>
                      <small>Customer</small>
                      <strong>{b.customerName}</strong>
                      <a href={`tel:${phoneHref(b.customerPhone)}`} className="adm-link">
                        {b.customerPhone}
                      </a>
                    </div>
                    <div>
                      <small>Rental Dates</small>
                      <strong>
                        {b.pickupDate} → {b.returnDate}
                      </strong>
                      <span>
                        {b.days} {b.days === 1 ? 'day' : 'days'} · {pkr(b.dailyRate)}/day
                      </span>
                    </div>
                    <div>
                      <small>Estimated Total</small>
                      <strong className="price-val">{pkr(b.estimatedTotal)}</strong>
                      <span>Pickup: {b.pickupLocation}</span>
                    </div>
                  </div>

                  {b.notes && (
                    <p className="adm-booking-notes">
                      <strong>Notes:</strong> {b.notes}
                    </p>
                  )}

                  <div className="adm-booking-actions">
                    <label className="adm-status-select-wrap">
                      <span className="sr-only">Booking Status</span>
                      <select
                        value={b.status}
                        disabled={busyId === b.id}
                        onChange={(e) => updateStatus(b, e.target.value as BookingStatus)}
                      >
                        {BOOKING_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>
                            Status: {s.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {linkedCar && (
                      <button
                        type="button"
                        className={`btn ghost sm ${linkedCar.available === false ? 'btn-active-state' : ''}`}
                        disabled={busyId === b.id}
                        onClick={() =>
                          updateStatus(
                            b,
                            linkedCar.available ? 'confirmed' : b.status,
                            !linkedCar.available
                          )
                        }
                        title={
                          linkedCar.available
                            ? 'Confirm booking and mark this car hidden/booked on the website'
                            : 'Make this car visible on the website again'
                        }
                      >
                        <Icon name={linkedCar.available ? 'eyeOff' : 'eye'} size={14} />
                        <span>{linkedCar.available ? 'Mark Car Booked' : 'Make Car Available'}</span>
                      </button>
                    )}

                    {customerWa && (
                      <a className="btn wa sm" href={customerWa} target="_blank" rel="noopener noreferrer">
                        <Icon name="wa" size={14} />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    <a className="btn ghost sm" href={`tel:${phoneHref(b.customerPhone)}`}>
                      <Icon name="phone" size={14} />
                      <span>Call</span>
                    </a>

                    {confirmDeleteId === b.id ? (
                      <div className="adm-confirm-inline">
                        <button
                          type="button"
                          className="btn danger-solid sm"
                          disabled={busyId === b.id}
                          onClick={() => remove(b)}
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn ghost sm danger-hover"
                        onClick={() => setConfirmDeleteId(b.id)}
                      >
                        <Icon name="trash" size={14} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
