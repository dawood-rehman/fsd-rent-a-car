'use client'
import { useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { FUEL_TYPES, pkr, type CategoryItem, type Vehicle } from '@/lib/data'
import Icon from '@/components/Icon'
import { api } from './api'
import ImageEditorModal, { type EditedPhoto } from './ImageEditorModal'

type Draft = {
  id?: string
  name: string
  category: string
  selfDrivePrice: string
  chauffeurPrice: string
  seats: string
  transmission: string
  fuel: string
  image: string | null
  available: boolean
}

type MediaListItem = { url: string; name: string; usedBy: { id: string; name: string }[] }
type Msg = { kind: 'ok' | 'err'; text: string } | null

const makeEmpty = (defaultCategory: string): Draft => ({
  name: '',
  category: defaultCategory,
  selfDrivePrice: '',
  chauffeurPrice: '',
  seats: '',
  transmission: '',
  fuel: '',
  image: null,
  available: true,
})

const toDraft = (v: Vehicle): Draft => ({
  id: v.id,
  name: v.name,
  category: v.category,
  selfDrivePrice: v.selfDrivePrice?.toString() ?? '',
  chauffeurPrice: v.chauffeurPrice?.toString() ?? '',
  seats: v.seats?.toString() ?? '',
  transmission: v.transmission ?? '',
  fuel: v.fuel ?? '',
  image: v.image,
  available: v.available !== false,
})

export default function AdminVehicles({
  vehicles,
  categories,
  onVehiclesChange,
}: {
  vehicles: Vehicle[]
  categories: CategoryItem[]
  onVehiclesChange: (next: Vehicle[]) => void
}) {
  const defaultCategory = categories[0]?.id ?? 'economy'
  const [draft, setDraft] = useState<Draft>(() => makeEmpty(defaultCategory))
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | Blob | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Fleet list filters
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'hidden'>('all')

  // Media picker drawer inside form
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerItems, setPickerItems] = useState<MediaListItem[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const effectiveCategory = categories.some((c) => c.id === draft.category) ? draft.category : defaultCategory
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const isFiltered = search.trim() !== '' || catFilter !== 'all' || statusFilter !== 'all'

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vehicles.filter((v) => {
      if (catFilter !== 'all' && v.category !== catFilter) return false
      if (statusFilter === 'available' && v.available === false) return false
      if (statusFilter === 'hidden' && v.available !== false) return false
      if (!q) return true
      const catLabel = categoryMap.get(v.category)?.label.toLowerCase() ?? ''
      return v.name.toLowerCase().includes(q) || catLabel.includes(q)
    })
  }, [vehicles, search, catFilter, statusFilter, categoryMap])

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setMsg(null)
  }

  const discardUnusedUpload = (url: string | null) => {
    if (!url || vehicles.some((v) => v.image === url)) return
    void api('/api/admin/upload', 'DELETE', { url })
  }

  const openEditorWithFile = (file: File) => {
    setMsg(null)
    setPendingFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const editExistingPhoto = async () => {
    if (!draft.image) return
    setUploading(true)
    setMsg(null)
    try {
      const res = await fetch(draft.image)
      if (!res.ok) throw new Error('Could not load existing photo for editing.')
      const blob = await res.blob()
      setPendingFile(blob)
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error).message || 'Could not open photo in editor.' })
    } finally {
      setUploading(false)
    }
  }

  const uploadEdited = async (edited: EditedPhoto) => {
    const prevImage = draft.image
    setUploading(true)
    setMsg(null)
    try {
      const form = new FormData()
      form.append('file', new File([edited.blob], edited.filename, { type: edited.mime }))
      const r = await api<{ url: string }>('/api/admin/upload', 'POST', form)
      if (r.ok) {
        discardUnusedUpload(prevImage)
        setDraft((d) => ({ ...d, image: r.data.url }))
        setPickerOpen(false)
        setPendingFile(null)
      } else {
        setMsg({ kind: 'err', text: r.error })
        setPendingFile(null)
      }
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error).message })
      setPendingFile(null)
    }
    setUploading(false)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) openEditorWithFile(file)
  }

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragging(false)
    if (uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) openEditorWithFile(file)
  }

  const openPicker = async () => {
    if (pickerOpen) {
      setPickerOpen(false)
      return
    }
    setPickerOpen(true)
    setPickerLoading(true)
    const r = await api<{ items: MediaListItem[] }>('/api/admin/media', 'GET')
    setPickerLoading(false)
    if (r.ok) setPickerItems(r.data.items)
  }

  const pickExistingImage = (url: string) => {
    if (draft.image !== url) discardUnusedUpload(draft.image)
    set({ image: url })
    setPickerOpen(false)
  }

  const removePhoto = () => {
    discardUnusedUpload(draft.image)
    set({ image: null })
  }

  const cancelEdit = () => {
    discardUnusedUpload(draft.image)
    setDraft(makeEmpty(defaultCategory))
    setPickerOpen(false)
    setMsg(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!draft.selfDrivePrice.trim() && !draft.chauffeurPrice.trim()) {
      setMsg({ kind: 'err', text: 'Enter at least one daily price (Self-Drive or With Chauffeur).' })
      return
    }
    if (!draft.image) {
      setMsg({ kind: 'err', text: 'Upload or select a vehicle photo before saving.' })
      return
    }
    setBusy(true)
    setMsg(null)
    const body = {
      name: draft.name,
      category: effectiveCategory,
      selfDrivePrice: draft.selfDrivePrice,
      chauffeurPrice: draft.chauffeurPrice,
      seats: draft.seats,
      transmission: draft.transmission,
      fuel: draft.fuel,
      image: draft.image,
      available: draft.available,
    }
    const r = draft.id
      ? await api<{ vehicle: Vehicle }>(`/api/admin/vehicles/${draft.id}`, 'PUT', body)
      : await api<{ vehicle: Vehicle }>('/api/admin/vehicles', 'POST', body)
    setBusy(false)
    if (!r.ok) return setMsg({ kind: 'err', text: r.error })
    const v = r.data.vehicle
    onVehiclesChange(draft.id ? vehicles.map((x) => (x.id === v.id ? v : x)) : [...vehicles, v])
    setDraft(makeEmpty(defaultCategory))
    setPickerOpen(false)
    setMsg({ kind: 'ok', text: draft.id ? `"${v.name}" updated successfully.` : `"${v.name}" added to your fleet.` })
  }

  const toggleAvailable = async (v: Vehicle) => {
    const next = v.available === false
    const r = await api<{ vehicle: Vehicle }>(`/api/admin/vehicles/${v.id}`, 'PATCH', { available: next })
    if (!r.ok) return setMsg({ kind: 'err', text: r.error })
    onVehiclesChange(vehicles.map((x) => (x.id === v.id ? r.data.vehicle : x)))
    if (draft.id === v.id) setDraft((d) => ({ ...d, available: next }))
  }

  const move = async (index: number, dir: -1 | 1) => {
    if (reordering) return
    const target = index + dir
    if (target < 0 || target >= vehicles.length) return
    const prev = vehicles
    const next = [...vehicles]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setReordering(true)
    onVehiclesChange(next)
    const r = await api<{ vehicles: Vehicle[] }>('/api/admin/vehicles', 'PATCH', { ids: next.map((v) => v.id) })
    setReordering(false)
    if (!r.ok) {
      onVehiclesChange(prev)
      setMsg({ kind: 'err', text: r.error })
    } else {
      onVehiclesChange(r.data.vehicles)
    }
  }

  const remove = async (v: Vehicle) => {
    const r = await api(`/api/admin/vehicles/${v.id}`, 'DELETE')
    setConfirmDeleteId(null)
    if (!r.ok) return setMsg({ kind: 'err', text: r.error })
    if (draft.id === v.id) {
      if (draft.image && draft.image !== v.image) discardUnusedUpload(draft.image)
      setDraft(makeEmpty(defaultCategory))
    }
    onVehiclesChange(vehicles.filter((x) => x.id !== v.id))
    setMsg({ kind: 'ok', text: `"${v.name}" removed from fleet.` })
  }

  const edit = (v: Vehicle) => {
    discardUnusedUpload(draft.image)
    setDraft(toDraft(v))
    setPickerOpen(false)
    setMsg(null)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const duplicate = (v: Vehicle) => {
    discardUnusedUpload(draft.image)
    setDraft({ ...toDraft(v), id: undefined, name: `${v.name} (Copy)` })
    setPickerOpen(false)
    setMsg({ kind: 'ok', text: `Loaded a copy of "${v.name}". Adjust details and click "Add Vehicle to Fleet".` })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="adm-stack">
      {/* VEHICLE FORM */}
      <form ref={formRef} className="adm-card" onSubmit={submit}>
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
            <select value={effectiveCategory} onChange={(e) => set({ category: e.target.value })}>
              {categories.map((c) => (
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
            <select value={draft.transmission} onChange={(e) => set({ transmission: e.target.value })}>
              <option value="">Not specified</option>
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
            </select>
          </label>

          <label className="adm-field">
            <span className="adm-label">Fuel Type (optional)</span>
            <select value={draft.fuel} onChange={(e) => set({ fuel: e.target.value })}>
              <option value="">Not specified</option>
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
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

        {/* PHOTO DROPZONE + LIBRARY PICKER */}
        <div className="adm-field">
          <div className="adm-photo-label-row">
            <span className="adm-label">Vehicle Photo *</span>
            <button type="button" className="btn ghost sm" onClick={openPicker}>
              <Icon name="image" size={14} />
              <span>{pickerOpen ? 'Hide Media Library' : 'Choose from Library'}</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleFileChange}
            id="vehicle-photo-upload"
          />

          {pickerOpen && (
            <div className="adm-picker-drawer">
              {pickerLoading ? (
                <p className="adm-hint">Loading uploaded images...</p>
              ) : pickerItems.length === 0 ? (
                <p className="adm-hint">No uploaded images in storage yet. Upload a new photo below.</p>
              ) : (
                <div className="adm-picker-grid">
                  {pickerItems.map((item) => (
                    <button
                      key={item.url}
                      type="button"
                      className={`adm-picker-item ${draft.image === item.url ? 'on' : ''}`}
                      onClick={() => pickExistingImage(item.url)}
                      title={item.usedBy.length ? `Used by: ${item.usedBy.map((u) => u.name).join(', ')}` : 'Unused'}
                    >
                      <img src={item.url} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!draft.image ? (
            <label
              htmlFor="vehicle-photo-upload"
              className={`adm-dropzone ${uploading ? 'uploading' : ''} ${dragging ? 'dragging' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="adm-dropzone-icon">
                <Icon name={uploading ? 'clock' : 'upload'} size={30} />
              </div>
              <div className="adm-dropzone-content">
                <strong>
                  {uploading
                    ? 'Uploading and optimizing photo...'
                    : dragging
                      ? 'Drop image here to upload'
                      : 'Click, tap, or drag a photo here'}
                </strong>
                <p>Supports JPG, PNG or WebP up to 5MB · Crop, rotate, resize &amp; adjust before upload</p>
              </div>
            </label>
          ) : (
            <div className="adm-photo-preview-card">
              <img src={draft.image} alt="Vehicle preview" className="adm-photo-preview-img" />
              <div className="adm-photo-preview-meta">
                <div className="adm-photo-status">
                  <span className="dot" />
                  <strong>Photo Ready</strong>
                </div>
                <p>Optimized &amp; ready to publish with this vehicle</p>
                <div className="adm-photo-actions">
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={uploading}
                    onClick={editExistingPhoto}
                  >
                    <Icon name="crop" size={14} />
                    <span>Edit / Crop</span>
                  </button>
                  <label htmlFor="vehicle-photo-upload" className="btn ghost sm">
                    <Icon name="upload" size={14} />
                    <span>{uploading ? 'Uploading...' : 'Change Photo'}</span>
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
          <div className={`adm-alert ${msg.kind}`} role="status">
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
            <p>Order, search, filter, update rates, or toggle visibility of your vehicles</p>
          </div>
        </div>

        {vehicles.length > 0 && (
          <div className="adm-toolbar">
            <div className="adm-search-wrap">
              <Icon name="search" size={16} />
              <input
                type="search"
                placeholder="Search vehicles by name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="adm-filter-row">
              <select aria-label="Filter by category" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'available' | 'hidden')}
              >
                <option value="all">All statuses</option>
                <option value="available">Available only</option>
                <option value="hidden">Hidden / Booked only</option>
              </select>
            </div>
          </div>
        )}

        {vehicles.length === 0 ? (
          <div className="adm-empty-card">
            <div className="adm-empty-icon">
              <Icon name="car" size={48} />
            </div>
            <h3>No vehicles added yet</h3>
            <p>
              Fill out the form above to list your first car. Once added, it will immediately show on the live website
              with its daily rates and WhatsApp booking option.
            </p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="adm-empty-card">
            <h3>No matching vehicles</h3>
            <p>Clear your search or filters to see all {vehicles.length} vehicles in your fleet.</p>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                setSearch('')
                setCatFilter('all')
                setStatusFilter('all')
              }}
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="adm-vehicle-cards">
            {filteredVehicles.map((v) => {
              const realIdx = vehicles.findIndex((x) => x.id === v.id)
              const catInfo = categoryMap.get(v.category)
              return (
                <div key={v.id} className={`adm-vehicle-item ${v.available === false ? 'is-hidden' : ''}`}>
                  <div className="adm-vehicle-thumb-box">
                    {v.image ? (
                      <img src={v.image} alt={v.name} className="adm-vehicle-thumb" loading="lazy" />
                    ) : (
                      <div className="adm-vehicle-nothumb">
                        <Icon name="car" size={28} />
                      </div>
                    )}
                    <span className="adm-vehicle-cat-tag">{catInfo?.tag || v.category}</span>
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
                      <span>{catInfo?.label ?? v.category}</span>
                      {v.seats && <span> · {v.seats} Seats</span>}
                      {v.transmission && <span> · {v.transmission}</span>}
                      {v.fuel && <span> · {v.fuel}</span>}
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
                    {vehicles.length > 1 && !isFiltered && (
                      <div className="adm-reorder-group" aria-label="Reorder">
                        <button
                          type="button"
                          className="adm-btn-icon"
                          disabled={realIdx === 0 || reordering}
                          aria-label={`Move ${v.name} up`}
                          title="Move up"
                          onClick={() => move(realIdx, -1)}
                        >
                          <Icon name="chevronUp" size={16} />
                        </button>
                        <button
                          type="button"
                          className="adm-btn-icon"
                          disabled={realIdx === vehicles.length - 1 || reordering}
                          aria-label={`Move ${v.name} down`}
                          title="Move down"
                          onClick={() => move(realIdx, 1)}
                        >
                          <Icon name="chevronDown" size={16} />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      className={`btn ghost sm ${v.available === false ? 'btn-active-state' : ''}`}
                      onClick={() => toggleAvailable(v)}
                      title={v.available === false ? 'Show on website' : 'Hide from website'}
                    >
                      <Icon name={v.available === false ? 'eye' : 'eyeOff'} size={14} />
                      <span>{v.available === false ? 'Show' : 'Hide'}</span>
                    </button>

                    <button type="button" className="btn ghost sm" onClick={() => edit(v)} title="Edit vehicle details">
                      <Icon name="edit" size={14} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => duplicate(v)}
                      title="Duplicate vehicle"
                    >
                      <Icon name="copy" size={14} />
                      <span>Copy</span>
                    </button>

                    {confirmDeleteId === v.id ? (
                      <div className="adm-confirm-inline">
                        <button type="button" className="btn danger-solid sm" onClick={() => remove(v)}>
                          Confirm
                        </button>
                        <button type="button" className="btn ghost sm" onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn ghost sm danger-hover"
                        onClick={() => setConfirmDeleteId(v.id)}
                        title="Delete vehicle permanently"
                      >
                        <Icon name="trash" size={14} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {pendingFile && (
        <ImageEditorModal
          file={pendingFile}
          busy={uploading}
          onCancel={() => setPendingFile(null)}
          onApply={uploadEdited}
        />
      )}
    </div>
  )
}
