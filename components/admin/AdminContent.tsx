'use client'
import { useState, type FormEvent } from 'react'
import type { Point, SiteContent } from '@/lib/data'
import Icon from '@/components/Icon'
import { api } from './api'

function PointsEditor({
  label,
  subtitle,
  items,
  max,
  onChange,
}: {
  label: string
  subtitle?: string
  items: Point[]
  max: number
  onChange: (p: Point[]) => void
}) {
  const upd = (i: number, patch: Partial<Point>) =>
    onChange(items.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  return (
    <div className="adm-points-editor">
      <div className="adm-points-head">
        <div>
          <h4>{label}</h4>
          {subtitle && <p className="adm-hint">{subtitle}</p>}
        </div>
        <span className="adm-counter">
          {items.length} / {max}
        </span>
      </div>

      <div className="adm-points-list">
        {items.map((p, i) => (
          <div className="adm-point-card" key={i}>
            <div className="adm-point-number">#{i + 1}</div>
            <div className="adm-point-inputs">
              <label className="adm-field">
                <span className="adm-label">Title</span>
                <input
                  value={p.title}
                  maxLength={90}
                  placeholder="e.g. 24/7 Roadside Assistance"
                  onChange={(e) => upd(i, { title: e.target.value })}
                />
              </label>
              <label className="adm-field">
                <span className="adm-label">Description</span>
                <textarea
                  rows={2}
                  value={p.text}
                  maxLength={400}
                  placeholder="Brief details explaining this point..."
                  onChange={(e) => upd(i, { text: e.target.value })}
                />
              </label>
            </div>
            <button
              type="button"
              className="adm-btn-icon danger"
              title="Delete this point"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        ))}
      </div>

      {items.length < max && (
        <button
          type="button"
          className="btn ghost sm adm-add-point-btn"
          onClick={() => onChange([...items, { title: '', text: '' }])}
        >
          <Icon name="plus" size={14} />
          <span>Add item</span>
        </button>
      )}
    </div>
  )
}

export default function AdminContent({ initial }: { initial: SiteContent }) {
  const [s, setS] = useState(initial)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const top = (k: keyof SiteContent) => ({
    value: (s[k] as string) || '',
    onChange: (e: { target: { value: string } }) => {
      setS({ ...s, [k]: e.target.value })
      setMsg(null)
    },
  })

  const nest = <K extends 'hero' | 'fleet' | 'about' | 'features' | 'cta'>(
    g: K,
    k: keyof SiteContent[K]
  ) => ({
    value: (s[g][k] as string) || '',
    onChange: (e: { target: { value: string } }) => {
      setS({ ...s, [g]: { ...s[g], [k]: e.target.value } })
      setMsg(null)
    },
  })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const r = await api<{ site: SiteContent }>('/api/admin/site', 'PUT', s)
    setBusy(false)
    if (r.ok) {
      setS(r.data.site)
      setMsg({ kind: 'ok', text: 'All changes saved & published to website successfully!' })
    } else {
      setMsg({ kind: 'err', text: r.error })
    }
  }

  return (
    <form className="adm-content-form" onSubmit={save}>
      {/* 1. BUSINESS PROFILE & CONTACT */}
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="pin" size={20} />
          </div>
          <div>
            <h2>Business & Contact Information</h2>
            <p className="adm-card-desc">
              Your company identity, phone numbers, WhatsApp, and Google Map location
            </p>
          </div>
        </div>

        <div className="adm-fields-grid">
          <label className="adm-field">
            <span className="adm-label">Business Name *</span>
            <input {...top('name')} maxLength={80} required />
          </label>

          <label className="adm-field">
            <span className="adm-label">Tagline (optional)</span>
            <input {...top('tagline')} maxLength={80} placeholder="e.g. Premium Vehicle Services" />
          </label>

          <label className="adm-field">
            <span className="adm-label">Primary City (shown on cards)</span>
            <input {...top('city')} maxLength={60} placeholder="e.g. Faisalabad" />
          </label>

          <label className="adm-field">
            <span className="adm-label">Phone Number *</span>
            <input {...top('phone')} maxLength={30} placeholder="e.g. +92 303 6262705" required />
          </label>

          <label className="adm-field">
            <span className="adm-label">WhatsApp Number (with country code) *</span>
            <input
              {...top('whatsapp')}
              inputMode="numeric"
              placeholder="e.g. 923036262705"
              required
            />
            <span className="adm-hint">Without + or spaces. Direct link will open to this number.</span>
          </label>

          <label className="adm-field">
            <span className="adm-label">Landline (optional)</span>
            <input {...top('landline')} maxLength={30} placeholder="e.g. 041-5392705" />
          </label>

          <label className="adm-field">
            <span className="adm-label">Email Address (optional)</span>
            <input
              type="email"
              {...top('email')}
              maxLength={120}
              placeholder="e.g. info@rentacarfsd.com"
            />
          </label>

          <label className="adm-field">
            <span className="adm-label">Google Maps Search Location</span>
            <input
              {...top('mapQuery')}
              maxLength={200}
              placeholder="e.g. Millat Chowk, Faisalabad"
            />
          </label>
        </div>

        <div className="adm-single-column-fields">
          <label className="adm-field">
            <span className="adm-label">Physical Office Address</span>
            <input
              {...top('address')}
              maxLength={200}
              placeholder="e.g. Shop 25, Shaheed Millat Market, Millat Chowk, Faisalabad"
            />
          </label>

          <label className="adm-field">
            <span className="adm-label">Short Description (Search Engines & Footer)</span>
            <textarea
              rows={2}
              {...top('description')}
              maxLength={300}
              placeholder="A brief 1-2 sentence description of your rental services..."
            />
          </label>
        </div>
      </div>

      {/* 2. HOME HERO BANNER */}
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="sparkles" size={20} />
          </div>
          <div>
            <h2>Hero Banner (Top of Homepage)</h2>
            <p className="adm-card-desc">The first headline, highlighted words, and summary visitors see</p>
          </div>
        </div>

        <div className="adm-single-column-fields">
          <label className="adm-field">
            <span className="adm-label">Small Badge Pill Text (optional)</span>
            <input
              {...nest('hero', 'badge')}
              maxLength={90}
              placeholder="e.g. Faisalabad · Punjab, Pakistan"
            />
          </label>

          <div className="adm-fields-grid">
            <label className="adm-field">
              <span className="adm-label">Main Headline</span>
              <input
                {...nest('hero', 'title')}
                maxLength={120}
                placeholder="e.g. Rent a car in Faisalabad,"
              />
            </label>

            <label className="adm-field">
              <span className="adm-label">Highlighted Second Line (Gold italic)</span>
              <input
                {...nest('hero', 'accent')}
                maxLength={120}
                placeholder="e.g. booked in one message."
              />
            </label>
          </div>

          <label className="adm-field">
            <span className="adm-label">Hero Description Text</span>
            <textarea
              rows={3}
              {...nest('hero', 'text')}
              maxLength={400}
              placeholder="Explain self-drive, chauffeur services, or quick booking..."
            />
          </label>
        </div>
      </div>

      {/* 3. FLEET SECTION */}
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="car" size={20} />
          </div>
          <div>
            <h2>Fleet Section Header</h2>
            <p className="adm-card-desc">Headings displayed right above your vehicle cards</p>
          </div>
        </div>

        <div className="adm-single-column-fields">
          <label className="adm-field">
            <span className="adm-label">Section Heading</span>
            <input
              {...nest('fleet', 'heading')}
              maxLength={120}
              placeholder="e.g. Check out our fleet"
            />
          </label>

          <label className="adm-field">
            <span className="adm-label">Introductory Subtext</span>
            <textarea
              rows={2}
              {...nest('fleet', 'text')}
              maxLength={300}
              placeholder="e.g. Pick a vehicle and send your booking request on WhatsApp."
            />
          </label>
        </div>
      </div>

      {/* 4. ABOUT SECTION */}
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="user" size={20} />
          </div>
          <div>
            <h2>About Us Section</h2>
            <p className="adm-card-desc">Company background, service philosophy, and highlight points</p>
          </div>
        </div>

        <div className="adm-single-column-fields">
          <label className="adm-field">
            <span className="adm-label">Section Heading</span>
            <input
              {...nest('about', 'heading')}
              maxLength={120}
              placeholder="e.g. About Rent a Car Faisalabad"
            />
          </label>

          <label className="adm-field">
            <span className="adm-label">About Description Paragraph</span>
            <textarea
              rows={3}
              {...nest('about', 'text')}
              maxLength={800}
              placeholder="Share your experience and services..."
            />
          </label>

          <label className="adm-field">
            <span className="adm-label">Dark Highlight Quote Card (optional)</span>
            <textarea
              rows={2}
              {...nest('about', 'quote')}
              maxLength={240}
              placeholder="e.g. Every booking goes straight to our team. No middlemen."
            />
            <span className="adm-hint">If left empty, the section automatically spreads in full 2-column width.</span>
          </label>

          <PointsEditor
            label="Key Feature Points"
            subtitle="Numbered highlight points shown in the About section"
            items={s.about.points}
            max={6}
            onChange={(points) => {
              setS({ ...s, about: { ...s.about, points } })
              setMsg(null)
            }}
          />
        </div>
      </div>

      {/* 5. WHY CHOOSE US SECTION */}
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="shield" size={20} />
          </div>
          <div>
            <h2>“Why Choose Us” Section</h2>
            <p className="adm-card-desc">
              Three or more key customer promises. (Section is automatically hidden if no items exist)
            </p>
          </div>
        </div>

        <div className="adm-single-column-fields">
          <label className="adm-field">
            <span className="adm-label">Section Heading</span>
            <input
              {...nest('features', 'heading')}
              maxLength={120}
              placeholder="e.g. Why riders choose us"
            />
          </label>

          <PointsEditor
            label="Service Promises"
            subtitle="Rendered with round numbered badges on the website"
            items={s.features.items}
            max={6}
            onChange={(items) => {
              setS({ ...s, features: { ...s.features, items } })
              setMsg(null)
            }}
          />
        </div>
      </div>

      {/* 6. BOTTOM CALL TO ACTION BANNER */}
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="phone" size={20} />
          </div>
          <div>
            <h2>Bottom Call-To-Action Banner</h2>
            <p className="adm-card-desc">The high-converting banner shown before the contact area</p>
          </div>
        </div>

        <div className="adm-single-column-fields">
          <label className="adm-field">
            <span className="adm-label">Headline</span>
            <input
              {...nest('cta', 'heading')}
              maxLength={120}
              placeholder="e.g. Pick your ride and send us a message."
            />
          </label>

          <label className="adm-field">
            <span className="adm-label">Action Description</span>
            <textarea
              rows={2}
              {...nest('cta', 'text')}
              maxLength={300}
              placeholder="e.g. Send your name, dates and pickup point in one WhatsApp message."
            />
          </label>
        </div>
      </div>

      {/* FIXED DOCKED FLOATING ACTION BAR - WITH AMPLE CLEARANCE */}
      <div className="adm-docked-bar-spacer" aria-hidden="true" />
      <div className="adm-docked-bar">
        <div className="adm-docked-bar-in">
          {msg ? (
            <div className={`adm-alert-compact ${msg.kind}`}>
              <Icon name={msg.kind === 'ok' ? 'check' : 'alert'} size={16} />
              <span>{msg.text}</span>
            </div>
          ) : (
            <div className="adm-docked-status">
              <span className="dot on" />
              <span>Website Content Editor</span>
            </div>
          )}

          <div className="adm-docked-actions">
            <button className="btn copper lg" type="submit" disabled={busy}>
              <Icon name="check" size={18} />
              <span>{busy ? 'Saving...' : 'Save & Publish Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
