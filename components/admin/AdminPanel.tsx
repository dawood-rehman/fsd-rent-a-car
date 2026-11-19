'use client'
import { useState } from 'react'
import type { Db } from '@/lib/db'
import Icon from '@/components/Icon'
import { api } from './api'
import AdminVehicles from './AdminVehicles'
import AdminContent from './AdminContent'

type Tab = 'vehicles' | 'content'

export default function AdminPanel({ initial, storage }: { initial: Db; storage: 'supabase' | 'local' }) {
  const [tab, setTab] = useState<Tab>('vehicles')

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
            <div>
              <div className="adm-title-row">
                <h1>Admin Control Panel</h1>
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
              <p className="adm-subtitle">Manage fleet listings, rates, and website copy in real-time</p>
            </div>
          </div>

          <div className="adm-actions">
            <a className="btn ghost sm" href="/" target="_blank" rel="noopener noreferrer">
              <span>View website</span>
              <Icon name="external" size={14} />
            </a>
            <button className="btn ghost sm danger-hover" onClick={signOut}>
              <Icon name="logout" size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <nav className="adm-nav" role="tablist" aria-label="Admin Sections">
          <button
            role="tab"
            aria-selected={tab === 'vehicles'}
            className={`adm-tab ${tab === 'vehicles' ? 'on' : ''}`}
            onClick={() => setTab('vehicles')}
          >
            <Icon name="car" size={18} />
            <span>Vehicles & Fleet</span>
            <span className="adm-tab-count">{initial.vehicles.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === 'content'}
            className={`adm-tab ${tab === 'content' ? 'on' : ''}`}
            onClick={() => setTab('content')}
          >
            <Icon name="layout" size={18} />
            <span>Website Content</span>
          </button>
        </nav>

        {/* Keep both mounted so draft states are preserved during tab switching */}
        <section hidden={tab !== 'vehicles'} className="adm-section-pane">
          <AdminVehicles initial={initial.vehicles} />
        </section>

        <section hidden={tab !== 'content'} className="adm-section-pane">
          <AdminContent initial={initial.site} />
        </section>
      </div>
    </main>
  )
}
