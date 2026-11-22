'use client'
import { useState } from 'react'
import type { BookingRequest, SiteContent, Vehicle } from '@/lib/data'
import type { Db } from '@/lib/db'
import Icon from '@/components/Icon'
import { api } from './api'
import AdminVehicles from './AdminVehicles'
import AdminBookings from './AdminBookings'
import AdminContent from './AdminContent'
import AdminMedia from './AdminMedia'

type Tab = 'vehicles' | 'bookings' | 'content' | 'media'

export default function AdminPanel({ initial, storage }: { initial: Db; storage: 'supabase' | 'local' }) {
  const [tab, setTab] = useState<Tab>('vehicles')
  const [site, setSite] = useState<SiteContent>(initial.site)
  const [vehicles, setVehicles] = useState<Vehicle[]>(initial.vehicles)
  const [bookings, setBookings] = useState<BookingRequest[]>(initial.bookings)
  const [refreshing, setRefreshing] = useState(false)
  const [syncNote, setSyncNote] = useState('')

  const newBookingsCount = bookings.filter((b) => b.status === 'new').length

  const refreshState = async () => {
    setRefreshing(true)
    setSyncNote('')
    const r = await api<Db>('/api/admin/state', 'GET')
    setRefreshing(false)
    if (r.ok) {
      setSite(r.data.site)
      setVehicles(r.data.vehicles)
      setBookings(r.data.bookings)
      setSyncNote('Synced')
      setTimeout(() => setSyncNote(''), 2500)
    }
  }

  const signOut = async () => {
    await api('/api/admin/login', 'DELETE')
    location.reload()
  }

  return (
    <main className="adm">
      <div className="adm-wrap">
        <header className="adm-header">
          <div className="adm-brand">
            <div className="adm-badge-icon">
              <Icon name="car" size={24} />
            </div>
            <div className="adm-brand-text">
              <div className="adm-title-row">
                <h1>{site.name}</h1>
                <span
                  className={`adm-storage-pill ${storage === 'supabase' ? 'cloud' : 'local'}`}
                  title={
                    storage === 'supabase'
                      ? 'Connected to Supabase Cloud Storage'
                      : 'Storing data locally in data/db.json'
                  }
                >
                  <span className="dot" aria-hidden="true" />
                  {storage === 'supabase' ? 'Supabase Cloud' : 'Local Storage'}
                </span>
              </div>
              <p className="adm-subtitle">Admin Control Panel · Manage fleet, bookings, content &amp; media live</p>
            </div>
          </div>

          <div className="adm-actions">
            <button
              type="button"
              className="btn ghost sm"
              onClick={refreshState}
              disabled={refreshing}
              title="Fetch latest bookings and website data"
            >
              <Icon name="refresh" size={14} />
              <span>{refreshing ? 'Syncing...' : syncNote || 'Refresh'}</span>
            </button>
            <a className="btn ghost sm" href="/" target="_blank" rel="noopener noreferrer">
              <span>View website</span>
              <Icon name="external" size={14} />
            </a>
            <button type="button" className="btn ghost sm danger-hover" onClick={signOut}>
              <Icon name="logout" size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <nav className="adm-nav" role="tablist" aria-label="Admin Sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'vehicles'}
            className={`adm-tab ${tab === 'vehicles' ? 'on' : ''}`}
            onClick={() => setTab('vehicles')}
          >
            <Icon name="car" size={18} />
            <span>Fleet</span>
            <span className="adm-tab-count">{vehicles.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'bookings'}
            className={`adm-tab ${tab === 'bookings' ? 'on' : ''}`}
            onClick={() => setTab('bookings')}
          >
            <Icon name="calendar" size={18} />
            <span>Bookings</span>
            <span className={`adm-tab-count ${newBookingsCount > 0 ? 'alert' : ''}`}>
              {newBookingsCount > 0 ? `${newBookingsCount} new` : bookings.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'content'}
            className={`adm-tab ${tab === 'content' ? 'on' : ''}`}
            onClick={() => setTab('content')}
          >
            <Icon name="layout" size={18} />
            <span>Website Content</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'media'}
            className={`adm-tab ${tab === 'media' ? 'on' : ''}`}
            onClick={() => setTab('media')}
          >
            <Icon name="image" size={18} />
            <span>Media</span>
          </button>
        </nav>

        {/* Keep tabs mounted so in-progress form drafts are never lost while switching */}
        <section hidden={tab !== 'vehicles'} className="adm-section-pane">
          <AdminVehicles
            vehicles={vehicles}
            categories={site.categories}
            onVehiclesChange={setVehicles}
          />
        </section>

        <section hidden={tab !== 'bookings'} className="adm-section-pane">
          <AdminBookings
            bookings={bookings}
            vehicles={vehicles}
            site={site}
            refreshing={refreshing}
            onRefresh={refreshState}
            onBookingsChange={setBookings}
            onVehicleUpdated={(updated) =>
              setVehicles((list) => list.map((v) => (v.id === updated.id ? updated : v)))
            }
          />
        </section>

        <section hidden={tab !== 'content'} className="adm-section-pane">
          <AdminContent site={site} vehicles={vehicles} onSiteChange={setSite} />
        </section>

        <section hidden={tab !== 'media'} className="adm-section-pane">
          <AdminMedia active={tab === 'media'} vehicles={vehicles} />
        </section>
      </div>
    </main>
  )
}
