'use client'
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import type { Vehicle } from '@/lib/data'
import Icon from '@/components/Icon'
import { api } from './api'
import ImageEditorModal, { type EditedPhoto } from './ImageEditorModal'

type MediaEntry = {
  url: string
  name: string
  usedBy: { id: string; name: string }[]
}

export default function AdminMedia({ active, vehicles }: { active: boolean; vehicles: Vehicle[] }) {
  const [items, setItems] = useState<MediaEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null)
  const [confirmCleanup, setConfirmCleanup] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<{ items: MediaEntry[] }>('/api/admin/media', 'GET')
    setLoading(false)
    if (r.ok) setItems(r.data.items)
    else setMsg({ kind: 'err', text: r.error })
  }, [])

  useEffect(() => {
    if (active) void load()
  }, [active, vehicles.length, load])

  const openEditor = (file: File) => {
    setMsg(null)
    setPendingFile(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const uploadEdited = async (edited: EditedPhoto) => {
    setUploading(true)
    setMsg(null)
    try {
      const form = new FormData()
      form.append('file', new File([edited.blob], edited.filename, { type: edited.mime }))
      const r = await api<{ url: string }>('/api/admin/upload', 'POST', form)
      if (r.ok) {
        setPendingFile(null)
        setMsg({ kind: 'ok', text: 'Photo edited, optimized & uploaded to Media Library.' })
        await load()
      } else {
        setPendingFile(null)
        setMsg({ kind: 'err', text: r.error })
      }
    } catch (err) {
      setPendingFile(null)
      setMsg({ kind: 'err', text: (err as Error).message })
    }
    setUploading(false)
  }

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) openEditor(f)
  }

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragging(false)
    if (uploading) return
    const f = e.dataTransfer.files?.[0]
    if (f) openEditor(f)
  }

  const deleteSingle = async (url: string) => {
    setMsg(null)
    const r = await api('/api/admin/media', 'DELETE', { url })
    setConfirmUrl(null)
    if (!r.ok) return setMsg({ kind: 'err', text: r.error })
    setItems((list) => list.filter((x) => x.url !== url))
    setMsg({ kind: 'ok', text: 'Unused photo deleted permanently.' })
  }

  const cleanupUnused = async () => {
    setMsg(null)
    const r = await api<{ removed: number }>('/api/admin/media', 'DELETE', { unused: true })
    setConfirmCleanup(false)
    if (!r.ok) return setMsg({ kind: 'err', text: r.error })
    setMsg({ kind: 'ok', text: `Cleaned up ${r.data.removed} unused photo(s).` })
    await load()
  }

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  const unusedCount = items.filter((x) => x.usedBy.length === 0).length

  return (
    <div className="adm-stack">
      <div className="adm-card">
        <div className="adm-card-header">
          <div className="adm-card-icon">
            <Icon name="image" size={20} />
          </div>
          <div className="adm-card-title-group">
            <h2>Media Library ({items.length})</h2>
            <p className="adm-card-desc">
              Upload, inspect, reuse, or delete stored vehicle photos. Photos actively linked to vehicles are protected from accidental deletion.
            </p>
          </div>
          <div className="adm-actions">
            <button type="button" className="btn ghost sm" onClick={load} disabled={loading}>
              <Icon name="refresh" size={14} />
              <span>{loading ? 'Loading...' : 'Reload'}</span>
            </button>
            {unusedCount > 0 &&
              (confirmCleanup ? (
                <div className="adm-confirm-inline">
                  <button type="button" className="btn danger-solid sm" onClick={cleanupUnused}>
                    Delete {unusedCount} unused
                  </button>
                  <button type="button" className="btn ghost sm" onClick={() => setConfirmCleanup(false)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn ghost sm danger-hover"
                  onClick={() => setConfirmCleanup(true)}
                >
                  <Icon name="trash" size={14} />
                  <span>Clean up unused ({unusedCount})</span>
                </button>
              ))}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={onFile}
          id="media-library-upload"
        />
        <label
          htmlFor="media-library-upload"
          className={`adm-dropzone ${uploading ? 'uploading' : ''} ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="adm-dropzone-icon">
            <Icon name={uploading ? 'clock' : 'upload'} size={28} />
          </div>
          <div className="adm-dropzone-content">
            <strong>{uploading ? 'Uploading edited photo...' : 'Upload new photo to Media Library'}</strong>
            <p>Click, tap, or drop a JPG, PNG or WebP image · Crop, rotate &amp; resize before upload</p>
          </div>
        </label>

        {msg && (
          <div className={`adm-alert ${msg.kind}`} role="status">
            <Icon name={msg.kind === 'ok' ? 'check' : 'alert'} size={16} />
            <span>{msg.text}</span>
          </div>
        )}

        {items.length === 0 && !loading ? (
          <div className="adm-empty-inline">
            <div className="adm-empty-icon">
              <Icon name="image" size={34} />
            </div>
            <h3>No photos uploaded yet</h3>
            <p>Upload vehicle photos here or inside the Fleet tab to build your media library.</p>
          </div>
        ) : (
          <div className="adm-media-grid">
            {items.map((item) => {
              const inUse = item.usedBy.length > 0
              return (
                <article key={item.url} className="adm-media-card">
                  <div className="adm-media-thumb">
                    <img src={item.url} alt={item.name} loading="lazy" />
                    <span className={`adm-media-badge ${inUse ? 'used' : 'unused'}`}>
                      {inUse ? `Used (${item.usedBy.length})` : 'Unused'}
                    </span>
                  </div>
                  <div className="adm-media-meta">
                    <p className="adm-media-usage">
                      {inUse ? item.usedBy.map((u) => u.name).join(', ') : 'Not assigned to any vehicle'}
                    </p>
                    <div className="adm-media-actions">
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => copyUrl(item.url)}
                        title="Copy image URL"
                      >
                        <Icon name="copy" size={14} />
                        <span>{copiedUrl === item.url ? 'Copied!' : 'Copy URL'}</span>
                      </button>
                      {!inUse &&
                        (confirmUrl === item.url ? (
                          <div className="adm-confirm-inline">
                            <button
                              type="button"
                              className="btn danger-solid sm"
                              onClick={() => deleteSingle(item.url)}
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => setConfirmUrl(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn ghost sm danger-hover"
                            onClick={() => setConfirmUrl(item.url)}
                          >
                            <Icon name="trash" size={14} />
                            <span>Delete</span>
                          </button>
                        ))}
                    </div>
                  </div>
                </article>
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
