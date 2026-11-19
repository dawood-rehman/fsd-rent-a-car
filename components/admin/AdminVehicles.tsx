'use client'
import { useRef, useState, type FormEvent, type ChangeEvent } from 'react'
import { CATEGORIES, pkr, type Category, type Vehicle } from '@/lib/data'
import Icon from '@/components/Icon'
import { api, resizeImage } from './api'

type Draft = {
  id?: string
  name: string
  category: Category
  selfDrivePrice: string
  chauffeurPrice: string
  seats: string
  transmission: string
  image: string | null
  available: boolean
}

const EMPTY: Draft = {
  name: '',
  category: 'economy',
  selfDrivePrice: '',
  chauffeurPrice: '',
  seats: '',
  transmission: '',
  image: null,
  available: true,
}

type Msg = { kind: 'ok' | 'err'; text: string } | null

const toDraft = (v: Vehicle): Draft => ({
  id: v.id,
  name: v.name,
  category: v.category,
  selfDrivePrice: v.selfDrivePrice?.toString() ?? '',
  chauffeurPrice: v.chauffeurPrice?.toString() ?? '',
  seats: v.seats?.toString() ?? '',
  transmission: v.transmission ?? '',
  image: v.image,
  available: v.available !== false,
})

export default function AdminVehicles({ initial }: { initial: Vehicle[] }) {
  const [vehicles, setVehicles] = useState(initial)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setMsg(null)
  }

  const discardUnusedUpload = (url: string | null) => {
    if (!url || vehicles.some((v) => v.image === url)) return
    void api('/api/admin/upload', 'DELETE', { url })
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const prevImage = draft.image
    setUploading(true)
    setMsg(null)
    try {
      const blob = await resizeImage(file)
      const form = new FormData()
      form.append('file', new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
      const r = await api<{ url: string }>('/api/admin/upload', 'POST', form)
      if (r.ok) {
        discardUnusedUpload(prevImage)
        setDraft((d) => ({ ...d, image: r.data.url }))
      } else {
        setMsg({ kind: 'err', text: r.error })
      }
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error).message })
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePhoto = () => {
    discardUnusedUpload(draft.image)
    set({ image: null })
  }

  const cancelEdit = () => {
    discardUnusedUpload(draft.image)
    setDraft(EMPTY)
    setMsg(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const body = {
      name: draft.name,
      category: draft.category,
      selfDrivePrice: draft.selfDrivePrice,
      chauffeurPrice: draft.chauffeurPrice,
      seats: draft.seats,
      transmission: draft.transmission,
      image: draft.image,
      available: draft.available,
    }
    const r = draft.id
      ? await api<{ vehicle: Vehicle }>(`/api/admin/vehicles/${draft.id}`, 'PUT', body)
      : await api<{ vehicle: Vehicle }>('/api/admin/vehicles', 'POST', body)
    setBusy(false)
    if (!r.ok) return setMsg({ kind: 'err', text: r.error })
    const v = r.data.vehicle
    setVehicles((list) => (draft.id ? list.map((x) => (x.id === v.id ? v : x)) : [...list, v]))
    setDraft(EMPTY)
    setMsg({ kind: 'ok', text: draft.id ? `"${v.name}" updated successfully.` : `"${v.name}" added to your fleet.` })
  }

  const toggleAvailable = async (v: Vehicle) => {
    const next = v.available === false
    const r = await api<{ vehicle: Vehicle }>(`/api/admin/vehicles/${v.id}`, 'PATCH', { available: next })
    if (!r.ok) return setMsg({ kind: 'err', text: r.error })
    setVehicles((list) => list.map((x) => (x.id === v.id ? r.data.vehicle : x)))
    if (draft.id === v.id) setDraft((d) => ({ ...d, available: next }))
  }

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= vehicles.length) return
    const next = [...vehicles]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setVehicles(next)
    const r = await api<{ vehicles: Vehicle[] }>('/api/admin/vehicles', 'PATCH', { ids: next.map((v) => v.id) })
    if (!r.ok) {
      setVehicles(vehicles)
      setMsg({ kind: 'err', text: r.error })
    }
  }

  const remove = async (v: Vehicle) => {
    if (!confirm(`Delete "${v.name}"? This cannot be undone.`)) return
    const r = await api(`/api/admin/vehicles/${v.id}`, 'DELETE')
    if (!r.ok) return setMsg({ kind: 'err', text: r.error })
    setVehicles((list) => list.filter((x) => x.id !== v.id))
    if (draft.id === v.id) setDraft(EMPTY)
    setMsg({ kind: 'ok', text: `"${v.name}" removed from fleet.` })
  }

  const edit = (v: Vehicle) => {
    discardUnusedUpload(draft.image)
    setDraft(toDraft(v))
    setMsg(null)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="adm-stack">
      {/* VEHICLE FORM */}
      <form ref={formRef} className="adm-card form" onSubmit={submit}>
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name={draft.id ? 'edit' : 'plus'} size={20} />
          </div>
          <div className="adm-card-title-group">
            <h2>{draft.id ? `Edit "${draft.name || 'Vehicle'}"` : 'Add New Vehicle'}</h2>
            <p className="adm-card-desc">
              {draft.id
                ? 'Update specifications, pricing, photo or availability'
                : 'Enter vehicle details and rates to display it in your online fleet'}
            </p>
          </div>
          {draft.id && (
            <button type="button" className="btn ghost sm" onClick={cancelEdit}>
              Cancel editing
            </button>
          )}
        </div>

        <div className="adm-fields-grid">
          <label className="adm-field">
            <span className="adm-label">Vehicle Name *</span>
            <input
              placeholder="e.g. Toyota Corolla Altis"
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              maxLength={80}
              required
            />
          </label>

          <label className="adm-field">
            <span className="adm-label">Category *</span>
            <select
              value={draft.category}
              onChange={(e) => set({ category: e.target.value as Category })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="adm-field">
            <span className="adm-label">Self-Drive Price (PKR / Day)</span>
            <div className="adm-input-prefix-wrap">
              <span className="adm-prefix">PKR</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="e.g. 7000"
                value={draft.selfDrivePrice}
                onChange={(e) => set({ selfDrivePrice: e.target.value })}
              />
            </div>
            <span className="adm-hint">Leave blank if not offered for self-drive</span>
          </label>

          <label className="adm-field">
            <span className="adm-label">Chauffeur Price (PKR / Day)</span>
            <div className="adm-input-prefix-wrap">
              <span className="adm-prefix">PKR</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="e.g. 9500"
                value={draft.chauffeurPrice}
                onChange={(e) => set({ chauffeurPrice: e.target.value })}
              />
            </div>
            <span className="adm-hint">Leave blank if not offered with driver</span>
          </label>

          <label className="adm-field">
            <span className="adm-label">Seating Capacity (optional)</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="60"
              step="1"
              placeholder="e.g. 5"
              value={draft.seats}
              onChange={(e) => set({ seats: e.target.value })}
            />
          </label>

          <label className="adm-field">
            <span className="adm-label">Transmission (optional)</span>
            <select
              value={draft.transmission}
              onChange={(e) => set({ transmission: e.target.value })}
            >
              <option value="">Not specified</option>
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
            </select>
          </label>
        </div>

        {/* STATUS TOGGLE */}
        <div className="adm-toggle-card">
          <label className="adm-switch-label">
            <input
              type="checkbox"
              className="adm-switch"
              checked={draft.available}
              onChange={(e) => set({ available: e.target.checked })}
            />
            <div className="adm-switch-text">
              <strong>Available for Booking</strong>
              <span>
                {draft.available
                  ? 'Active — This vehicle is visible to customers on the website'
                  : 'Hidden — Marked as booked or unavailable (hidden from website)'}
              </span>
            </div>
          </label>
        </div>

        {/* PHOTO DROPZONE */}
        <div className="adm-field">
          <span className="adm-label">Vehicle Photo *</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleFileChange}
            id="vehicle-photo-upload"
          />

          {!draft.image ? (
            <label
              htmlFor="vehicle-photo-upload"
              className={`adm-dropzone ${uploading ? 'uploading' : ''}`}
            >
              <div className="adm-dropzone-icon">
                <Icon name={uploading ? 'clock' : 'upload'} size={32} />
              </div>
              <div className="adm-dropzone-content">
                <strong>{uploading ? 'Uploading and optimizing photo...' : 'Click or tap to upload photo'}</strong>
                <p>Supports JPG, PNG or WebP up to 5MB · Auto-optimized for web</p>
              </div>
            </label>
          ) : (
            <div className="adm-photo-preview-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.image} alt="Vehicle preview" className="adm-photo-preview-img" />
              <div className="adm-photo-preview-meta">
                <div className="adm-photo-status">
                  <span className="dot on" />
                  <strong>Photo Ready</strong>
                </div>
                <p>Saved & linked to this vehicle</p>
                <div className="adm-photo-actions">
                  <label htmlFor="vehicle-photo-upload" className="btn ghost sm">
                    <Icon name="upload" size={14} />
                    <span>Change Photo</span>
                  </label>
                  <button type="button" className="btn ghost sm danger-hover" onClick={removePhoto}>
                    <Icon name="trash" size={14} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* NOTIFICATION FEEDBACK */}
        {msg && (
          <div className={`adm-alert ${msg.kind}`}>
            <Icon name={msg.kind === 'ok' ? 'check' : 'alert'} size={18} />
            <span>{msg.text}</span>
          </div>
        )}

        {/* SUBMIT ROW */}
        <div className="adm-form-footer">
          <button className="btn copper lg" type="submit" disabled={busy || uploading}>
            <Icon name={draft.id ? 'check' : 'plus'} size={18} />
            <span>{busy ? 'Saving...' : draft.id ? 'Update Vehicle' : 'Add Vehicle to Fleet'}</span>
          </button>
          {draft.id && (
            <button className="btn ghost lg" type="button" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* VEHICLES LIST */}
      <div className="adm-list-section">
        <div className="adm-section-header">
          <div>
            <h2>Current Fleet ({vehicles.length})</h2>
            <p>Order, update rates, or toggle visibility of your vehicles</p>
          </div>
        </div>

        {vehicles.length === 0 ? (
          <div className="adm-empty-card">
            <div className="adm-empty-icon">
              <Icon name="car" size={48} />
            </div>
            <h3>No vehicles added yet</h3>
            <p>
              Fill out the form above to list your first car. Once added, it will immediately show on the live
              website with its daily rates and WhatsApp booking link.
            </p>
          </div>
        ) : (
          <div className="adm-vehicle-cards">
            {vehicles.map((v, i) => (
              <div key={v.id} className={`adm-vehicle-item ${v.available === false ? 'is-hidden' : ''}`}>
                <div className="adm-vehicle-thumb-box">
                  {v.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.image} alt={v.name} className="adm-vehicle-thumb" />
                  ) : (
                    <div className="adm-vehicle-nothumb">
                      <Icon name="car" size={28} />
                    </div>
                  )}
                  <span className="adm-vehicle-cat-tag">
                    {CATEGORIES.find((c) => c.id === v.category)?.tag || v.category}
                  </span>
                </div>

                <div className="adm-vehicle-details">
                  <div className="adm-vehicle-title-row">
                    <h3>{v.name}</h3>
                    <span className={`adm-status-badge ${v.available === false ? 'booked' : 'active'}`}>
                      <span className="dot" />
                      {v.available === false ? 'Hidden / Booked' : 'Available'}
                    </span>
                  </div>

                  <div className="adm-vehicle-specs">
                    <span>{CATEGORIES.find((c) => c.id === v.category)?.label}</span>
                    {v.seats && <span>· {v.seats} Seats</span>}
                    {v.transmission && <span>· {v.transmission}</span>}
                  </div>

                  <div className="adm-vehicle-rates">
                    <div className="adm-rate-chip">
                      <span className="adm-rate-type">Self-Drive:</span>
                      <strong className={v.selfDrivePrice ? 'price-val' : 'na'}>
                        {v.selfDrivePrice ? pkr(v.selfDrivePrice) : 'Not offered'}
                      </strong>
                    </div>
                    <div className="adm-rate-chip">
                      <span className="adm-rate-type">With Chauffeur:</span>
                      <strong className={v.chauffeurPrice ? 'price-val' : 'na'}>
                        {v.chauffeurPrice ? pkr(v.chauffeurPrice) : 'Not offered'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="adm-vehicle-actions">
                  {vehicles.length > 1 && (
                    <div className="adm-reorder-group" aria-label="Reorder">
                      <button
                        className="adm-btn-icon"
                        disabled={i === 0}
                        aria-label={`Move ${v.name} up`}
                        title="Move up"
                        onClick={() => move(i, -1)}
                      >
                        <Icon name="chevronUp" size={16} />
                      </button>
                      <button
                        className="adm-btn-icon"
                        disabled={i === vehicles.length - 1}
                        aria-label={`Move ${v.name} down`}
                        title="Move down"
                        onClick={() => move(i, 1)}
                      >
                        <Icon name="chevronDown" size={16} />
                      </button>
                    </div>
                  )}

                  <button
                    className={`btn ghost sm ${v.available === false ? 'btn-active-state' : ''}`}
                    onClick={() => toggleAvailable(v)}
                    title={v.available === false ? 'Show on website' : 'Hide from website'}
                  >
                    <Icon name={v.available === false ? 'eye' : 'eyeOff'} size={14} />
                    <span>{v.available === false ? 'Show' : 'Hide'}</span>
                  </button>

                  <button className="btn ghost sm" onClick={() => edit(v)} title="Edit vehicle details">
                    <Icon name="edit" size={14} />
                    <span>Edit</span>
                  </button>

                  <button
                    className="btn ghost sm danger-hover"
                    onClick={() => remove(v)}
                    title="Delete vehicle permanently"
                  >
                    <Icon name="trash" size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
