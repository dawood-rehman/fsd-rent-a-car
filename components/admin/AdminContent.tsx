'use client'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { slugifyCategoryId, type CategoryItem, type Point, type SiteContent, type Vehicle } from '@/lib/data'
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

  const move = (i: number, dir: -1 | 1) => {
    const t = i + dir
    if (t < 0 || t >= items.length) return
    const next = [...items]
    const [item] = next.splice(i, 1)
    next.splice(t, 0, item)
    onChange(next)
  }

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
            <div className="adm-point-top">
              <div className="adm-point-number">#{i + 1}</div>
              <div className="adm-point-controls">
                {items.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="adm-btn-icon"
                      disabled={i === 0}
                      title="Move up"
                      aria-label={`Move point ${i + 1} up`}
                      onClick={() => move(i, -1)}
                    >
                      <Icon name="chevronUp" size={16} />
                    </button>
                    <button
                      type="button"
                      className="adm-btn-icon"
                      disabled={i === items.length - 1}
                      title="Move down"
                      aria-label={`Move point ${i + 1} down`}
                      onClick={() => move(i, 1)}
                    >
                      <Icon name="chevronDown" size={16} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="adm-btn-icon danger"
                  title="Delete this point"
                  aria-label={`Delete point ${i + 1}`}
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>
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

function CategoriesEditor({
  categories,
  vehicles,
  onChange,
}: {
  categories: CategoryItem[]
  vehicles: Vehicle[]
  onChange: (next: CategoryItem[]) => void
}) {
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of vehicles) map.set(v.category, (map.get(v.category) ?? 0) + 1)
    return map
  }, [vehicles])

  const update = (i: number, patch: Partial<CategoryItem>) => {
    onChange(categories.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  }

  const move = (i: number, dir: -1 | 1) => {
    const t = i + dir
    if (t < 0 || t >= categories.length) return
    const next = [...categories]
    const [item] = next.splice(i, 1)
    next.splice(t, 0, item)
    onChange(next)
  }

  const add = () => {
    const num = categories.length + 1
    let id = `category-${num}`
    while (categories.some((c) => c.id === id)) id = `category-${num}-${Math.random().toString(36).slice(2, 5)}`
    onChange([...categories, { id, label: '', tag: '' }])
  }

  return (
    <div className="adm-points-editor">
      <div className="adm-points-head">
        <div>
          <h4>Vehicle Categories</h4>
          <p className="adm-hint">
            Add, rename, reorder, or remove categories shown in the fleet filter pills and vehicle dropdown.
          </p>
        </div>
        <span className="adm-counter">{categories.length} / 12</span>
      </div>

      <div className="adm-points-list">
        {categories.map((c, i) => {
          const usedCount = counts.get(c.id) ?? 0
          return (
            <div className="adm-point-card" key={c.id}>
              <div className="adm-point-top">
                <div className="adm-cat-head-meta">
                  <span className="adm-point-number">#{i + 1}</span>
                  <span className="adm-counter">
                    {usedCount} {usedCount === 1 ? 'car' : 'cars'}
                  </span>
                </div>
                <div className="adm-point-controls">
                  {categories.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="adm-btn-icon"
                        disabled={i === 0}
                        title="Move up"
                        aria-label={`Move category ${c.label || i + 1} up`}
                        onClick={() => move(i, -1)}
                      >
                        <Icon name="chevronUp" size={16} />
                      </button>
                      <button
                        type="button"
                        className="adm-btn-icon"
                        disabled={i === categories.length - 1}
                        title="Move down"
                        aria-label={`Move category ${c.label || i + 1} down`}
                        onClick={() => move(i, 1)}
                      >
                        <Icon name="chevronDown" size={16} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="adm-btn-icon danger"
                    disabled={categories.length <= 1 || usedCount > 0}
                    title={
                      usedCount > 0
                        ? `Reassign ${usedCount} vehicle(s) before deleting this category`
                        : categories.length <= 1
                          ? 'Keep at least one category'
                          : 'Delete category'
                    }
                    aria-label={`Delete category ${c.label || i + 1}`}
                    onClick={() => onChange(categories.filter((_, j) => j !== i))}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
              <div className="adm-fields-grid">
                <label className="adm-field">
                  <span className="adm-label">Category Filter Label *</span>
                  <input
                    value={c.label}
                    maxLength={40}
                    placeholder="e.g. Luxury & Protocol"
                    required
                    onChange={(e) => {
                      const label = e.target.value
                      const isNewId = c.id.startsWith('category-')
                      const nextId = isNewId && usedCount === 0 ? slugifyCategoryId(label) || c.id : c.id
                      update(i, {
                        label,
                        ...(nextId !== c.id && !categories.some((x) => x.id === nextId) ? { id: nextId } : {}),
                      })
                    }}
                  />
                </label>
                <label className="adm-field">
                  <span className="adm-label">Short Card Badge Tag *</span>
                  <input
                    value={c.tag}
                    maxLength={20}
                    placeholder="e.g. Luxury"
                    required
                    onChange={(e) => update(i, { tag: e.target.value })}
                  />
                </label>
              </div>
            </div>
          )
        })}
      </div>

      {categories.length < 12 && (
        <button type="button" className="btn ghost sm adm-add-point-btn" onClick={add}>
          <Icon name="plus" size={14} />
          <span>Add category</span>
        </button>
      )}
    </div>
  )
}

export default function AdminContent({
  site,
  vehicles,
  onSiteChange,
}: {
  site: SiteContent
  vehicles: Vehicle[]
  onSiteChange: (next: SiteContent) => void
}) {
  const [s, setS] = useState<SiteContent>(site)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const dirty = useMemo(() => JSON.stringify(s) !== JSON.stringify(site), [s, site])

  useEffect(() => {
    if (!dirty) setS(site)
  }, [site, dirty])

  useEffect(() => {
    if (!dirty) return
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])

  const top = (k: keyof SiteContent) => ({
    value: (s[k] as string) || '',
    onChange: (e: { target: { value: string } }) => {
      setS({ ...s, [k]: e.target.value })
      setMsg(null)
    },
  })

  const nest = <K extends 'hero' | 'booking' | 'fleet' | 'about' | 'features' | 'cta' | 'contact'>(
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
      onSiteChange(r.data.site)
      setMsg({ kind: 'ok', text: 'All changes saved & published to website immediately!' })
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
          <div className="adm-card-title-group">
            <h2>Business &amp; Contact Information</h2>
            <p className="adm-card-desc">
              Your company identity, phone numbers, WhatsApp, operating hours, and Google Map location
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
            <input {...top('whatsapp')} inputMode="numeric" placeholder="e.g. 923036262705" required />
            <span className="adm-hint">Without + or spaces. Direct links open to this number.</span>
          </label>

          <label className="adm-field">
            <span className="adm-label">Landline (optional)</span>
            <input {...top('landline')} maxLength={30} placeholder="e.g. 041-5392705" />
          </label>

          <label className="adm-field">
            <span className="adm-label">Email Address (optional)</span>
            <input type="email" {...top('email')} maxLength={120} placeholder="e.g. info@rentacarfsd.com" />
          </label>

          <label className="adm-field">
            <span className="adm-label">Business Hours (optional)</span>
            <input {...top('hours')} maxLength={120} placeholder="e.g. Open Daily · 24 Hours" />
          </label>

          <label className="adm-field">
            <span className="adm-label">Google Maps Search Location</span>
            <input {...top('mapQuery')} maxLength={200} placeholder="e.g. Millat Chowk, Faisalabad" />
          </label>

          <label className="adm-field">
            <span className="adm-label">Default WhatsApp Greeting</span>
            <input
              {...top('whatsappMessage')}
              maxLength={240}
              placeholder="e.g. Hello, I would like to book a car."
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
            <span className="adm-label">Short Description (Search Engines &amp; Footer)</span>
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
          <div className="adm-card-title-group">
            <h2>Hero Banner (Top of Homepage)</h2>
            <p className="adm-card-desc">The main headline, highlighted second line, summary, and hero button text</p>
          </div>
        </div>

        <div className="adm-single-column-fields">
          <label className="adm-field">
            <span className="adm-label">Small Badge Pill Text (optional)</span>
            <input {...nest('hero', 'badge')} maxLength={90} placeholder="e.g. Faisalabad · Punjab, Pakistan" />
          </label>

          <div className="adm-fields-grid">
            <label className="adm-field">
              <span className="adm-label">Main Headline</span>
              <input {...nest('hero', 'title')} maxLength={120} placeholder="e.g. Rent a car in Faisalabad," />
            </label>

            <label className="adm-field">
              <span className="adm-label">Highlighted Second Line (Gold italic)</span>
              <input {...nest('hero', 'accent')} maxLength={120} placeholder="e.g. booked in one message." />
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

          <div className="adm-fields-grid">
            <label className="adm-field">
              <span className="adm-label">Primary Button Text</span>
              <input {...nest('hero', 'primaryCta')} maxLength={40} placeholder="View Our Fleet" />
            </label>
            <label className="adm-field">
              <span className="adm-label">WhatsApp Button Text</span>
              <input {...nest('hero', 'secondaryCta')} maxLength={40} placeholder="Book on WhatsApp" />
            </label>
          </div>
        </div>
      </div>

      {/* 3. SERVICE MODES SELECTOR */}
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="wheel" size={20} />
          </div>
          <div className="adm-card-title-group">
            <h2>Service Selector (Self-Drive &amp; Chauffeur)</h2>
            <p className="adm-card-desc">Customize the travel mode cards shown right above the fleet</p>
          </div>
        </div>

        <div className="adm-single-column-fields">
          <div className="adm-fields-grid">
            <label className="adm-field">
              <span className="adm-label">Section Eyebrow</span>
              <input {...nest('booking', 'eyebrow')} maxLength={60} placeholder="Choose a service" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Section Heading</span>
              <input {...nest('booking', 'heading')} maxLength={120} placeholder="How would you like to travel?" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Self-Drive Card Title</span>
              <input {...nest('booking', 'selfDriveLabel')} maxLength={40} placeholder="Self-Drive" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Self-Drive Description</span>
              <input {...nest('booking', 'selfDriveText')} maxLength={140} />
            </label>
            <label className="adm-field">
              <span className="adm-label">Chauffeur Card Title</span>
              <input {...nest('booking', 'chauffeurLabel')} maxLength={40} placeholder="With Chauffeur" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Chauffeur Description</span>
              <input {...nest('booking', 'chauffeurText')} maxLength={140} />
            </label>
          </div>
          <label className="adm-field">
            <span className="adm-label">Helper Note Below Cards</span>
            <input {...nest('booking', 'note')} maxLength={140} placeholder="Prices differ by service." />
          </label>
        </div>
      </div>

      {/* 4. FLEET SECTION & CATEGORIES */}
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="tag" size={20} />
          </div>
          <div className="adm-card-title-group">
            <h2>Fleet Section &amp; Categories</h2>
            <p className="adm-card-desc">Headings, empty-fleet notice, and full control over vehicle categories</p>
          </div>
        </div>

        <div className="adm-single-column-fields">
          <div className="adm-fields-grid">
            <label className="adm-field">
              <span className="adm-label">Section Eyebrow</span>
              <input {...nest('fleet', 'eyebrow')} maxLength={60} placeholder="The collection" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Section Heading</span>
              <input {...nest('fleet', 'heading')} maxLength={120} placeholder="e.g. Check out our fleet" />
            </label>
          </div>

          <label className="adm-field">
            <span className="adm-label">Introductory Subtext</span>
            <textarea
              rows={2}
              {...nest('fleet', 'text')}
              maxLength={300}
              placeholder="e.g. Pick a vehicle and send your booking request on WhatsApp."
            />
          </label>

          <label className="adm-field">
            <span className="adm-label">Empty Fleet Notice</span>
            <input
              {...nest('fleet', 'emptyText')}
              maxLength={240}
              placeholder="Shown when no vehicles are currently available online"
            />
          </label>

          <CategoriesEditor
            categories={s.categories}
            vehicles={vehicles}
            onChange={(categories) => {
              setS({ ...s, categories })
              setMsg(null)
            }}
          />
        </div>
      </div>

      {/* 5. ABOUT SECTION */}
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="user" size={20} />
          </div>
          <div className="adm-card-title-group">
            <h2>About Us Section</h2>
            <p className="adm-card-desc">Company background, highlight quote, and numbered feature points</p>
          </div>
        </div>

        <div className="adm-single-column-fields">
          <div className="adm-fields-grid">
            <label className="adm-field">
              <span className="adm-label">Section Eyebrow</span>
              <input {...nest('about', 'eyebrow')} maxLength={60} placeholder="About us" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Section Heading</span>
              <input {...nest('about', 'heading')} maxLength={120} placeholder="e.g. About Rent a Car Faisalabad" />
            </label>
          </div>

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

      {/* 6. WHY CHOOSE US SECTION */}
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="shield" size={20} />
          </div>
          <div className="adm-card-title-group">
            <h2>“Why Choose Us” Section</h2>
            <p className="adm-card-desc">
              Customer promises rendered with numbered badges. Automatically hidden if no items exist.
            </p>
          </div>
        </div>

        <div className="adm-single-column-fields">
          <div className="adm-fields-grid">
            <label className="adm-field">
              <span className="adm-label">Section Eyebrow</span>
              <input {...nest('features', 'eyebrow')} maxLength={60} placeholder="Why choose us" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Section Heading</span>
              <input {...nest('features', 'heading')} maxLength={120} placeholder="e.g. Why riders choose us" />
            </label>
          </div>

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

      {/* 7. BOTTOM CALL TO ACTION BANNER */}
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="phone" size={20} />
          </div>
          <div className="adm-card-title-group">
            <h2>Bottom Call-To-Action Banner</h2>
            <p className="adm-card-desc">
              Banner shown before the contact section. Clear both Headline and Description to hide it.
            </p>
          </div>
        </div>

        <div className="adm-single-column-fields">
          <div className="adm-fields-grid">
            <label className="adm-field">
              <span className="adm-label">Eyebrow</span>
              <input {...nest('cta', 'eyebrow')} maxLength={60} placeholder="Ready to book?" />
            </label>
            <label className="adm-field">
              <span className="adm-label">WhatsApp Button Text</span>
              <input {...nest('cta', 'primaryCta')} maxLength={40} placeholder="Message Us Now" />
            </label>
          </div>

          <label className="adm-field">
            <span className="adm-label">Headline</span>
            <input {...nest('cta', 'heading')} maxLength={120} placeholder="e.g. Pick your ride and send us a message." />
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

      {/* 8. CONTACT & FOOTER */}
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="layout" size={20} />
          </div>
          <div className="adm-card-title-group">
            <h2>Contact Section &amp; Footer</h2>
            <p className="adm-card-desc">Customize the contact headings and footer copyright line</p>
          </div>
        </div>

        <div className="adm-single-column-fields">
          <div className="adm-fields-grid">
            <label className="adm-field">
              <span className="adm-label">Contact Eyebrow</span>
              <input {...nest('contact', 'eyebrow')} maxLength={60} placeholder="Get in touch" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Contact Heading</span>
              <input {...nest('contact', 'heading')} maxLength={120} placeholder="Visit, call, or send a message" />
            </label>
          </div>
          <label className="adm-field">
            <span className="adm-label">Custom Footer Notice (optional)</span>
            <input
              {...top('footerNote')}
              maxLength={180}
              placeholder={`Leave blank to use "© ${new Date().getFullYear()} ${s.name}. All rights reserved."`}
            />
          </label>
        </div>
      </div>

      {/* FIXED DOCKED FLOATING ACTION BAR */}
      <div className="adm-docked-bar-spacer" aria-hidden="true" />
      <div className="adm-docked-bar">
        <div className="adm-docked-bar-in">
          {msg ? (
            <div className={`adm-alert-compact ${msg.kind}`} role="status">
              <Icon name={msg.kind === 'ok' ? 'check' : 'alert'} size={16} />
              <span>{msg.text}</span>
            </div>
          ) : (
            <div className="adm-docked-status">
              <span className={`dot ${dirty ? 'dirty' : ''}`} />
              <span>{dirty ? 'Unsaved changes ready to publish' : 'All changes published'}</span>
            </div>
          )}

          <div className="adm-docked-actions">
            {dirty && (
              <button
                type="button"
                className="btn ghost sm"
                disabled={busy}
                onClick={() => {
                  setS(site)
                  setMsg(null)
                }}
              >
                Discard
              </button>
            )}
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
