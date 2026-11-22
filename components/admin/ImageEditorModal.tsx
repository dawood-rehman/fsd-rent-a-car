'use client'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import Icon from '@/components/Icon'

export type EditedPhoto = {
  blob: Blob
  filename: string
  mime: string
}

type AspectPreset = '4:3' | '16:9' | '1:1' | 'original' | 'custom'
type EditorTab = 'transform' | 'resize' | 'adjust'

type EditorState = {
  aspect: AspectPreset
  rotate90: number
  straighten: number
  flipH: boolean
  flipV: boolean
  zoom: number
  panX: number
  panY: number
  outputWidth: number
  outputHeight: number
  quality: number
  brightness: number
  contrast: number
  saturation: number
}

const ASPECT_PRESETS: { id: Exclude<AspectPreset, 'custom'>; label: string; ratio?: number }[] = [
  { id: '4:3', label: '4:3 Card', ratio: 4 / 3 },
  { id: '16:9', label: '16:9 Wide', ratio: 16 / 9 },
  { id: '1:1', label: '1:1 Square', ratio: 1 },
  { id: 'original', label: 'Original' },
]

const WIDTH_PRESETS = [
  { label: '1400px HD', value: 1400 },
  { label: '1200px Web', value: 1200 },
  { label: '960px Fast', value: 960 },
  { label: '800px Light', value: 800 },
]

const QUALITY_PRESETS = [
  { label: 'High (92%)', value: 0.92 },
  { label: 'Balanced (86%)', value: 0.86 },
  { label: 'Compact (74%)', value: 0.74 },
]

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function getAspectRatio(
  aspect: AspectPreset,
  imgW: number,
  imgH: number,
  rotate90: number,
  outputW: number,
  outputH: number
): number {
  if (aspect === '4:3') return 4 / 3
  if (aspect === '16:9') return 16 / 9
  if (aspect === '1:1') return 1
  if (aspect === 'custom') return Math.max(0.2, Math.min(5, outputW / Math.max(1, outputH)))
  const swapped = Math.abs(rotate90) % 180 === 90
  const w = swapped ? imgH : imgW
  const h = swapped ? imgW : imgH
  return Math.max(0.2, Math.min(5, w / Math.max(1, h)))
}

/** Shared canvas renderer used by BOTH the live preview and final export for 100% WYSIWYG accuracy. */
function drawEditedImage(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  img: HTMLImageElement,
  state: EditorState
) {
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)

  ctx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%)`

  const swapped = Math.abs(state.rotate90) % 180 === 90
  const effW = swapped ? img.naturalHeight : img.naturalWidth
  const effH = swapped ? img.naturalWidth : img.naturalHeight
  const baseScale = Math.max(w / Math.max(1, effW), h / Math.max(1, effH))
  const scale = baseScale * state.zoom
  const rad = ((state.rotate90 + state.straighten) * Math.PI) / 180

  ctx.translate(w / 2 + state.panX * w, h / 2 + state.panY * h)
  ctx.rotate(rad)
  ctx.scale(state.flipH ? -scale : scale, state.flipV ? -scale : scale)
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
  ctx.restore()
}

function makeDefaultState(imgW = 1200, imgH = 900): EditorState {
  const defaultW = clamp(Math.min(1200, imgW), 400, 1400)
  return {
    aspect: '4:3',
    rotate90: 0,
    straighten: 0,
    flipH: false,
    flipV: false,
    zoom: 1,
    panX: 0,
    panY: 0,
    outputWidth: defaultW,
    outputHeight: Math.round(defaultW / (4 / 3)),
    quality: 0.86,
    brightness: 100,
    contrast: 100,
    saturation: 100,
  }
}

export default function ImageEditorModal({
  file,
  busy = false,
  onCancel,
  onApply,
}: {
  file: File | Blob
  busy?: boolean
  onCancel: () => void
  onApply: (edited: EditedPhoto) => Promise<void> | void
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState<EditorTab>('transform')
  const [showGrid, setShowGrid] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [state, setState] = useState<EditorState>(() => makeDefaultState())

  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stageBounds, setStageBounds] = useState({ w: 460, h: 345 })

  // Pointer drag + pinch tracking
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ dist: number; startZoom: number } | null>(null)

  // Load image from File/Blob
  useEffect(() => {
    let active = true
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      if (!active) return
      setImg(image)
      setLoadError('')
      setState(makeDefaultState(image.naturalWidth, image.naturalHeight))
    }
    image.onerror = () => {
      if (!active) return
      setLoadError('Could not open this image. Choose a valid JPG, PNG, or WebP photo.')
    }
    image.src = url
    return () => {
      active = false
      URL.revokeObjectURL(url)
    }
  }, [file])

  // Lock body scroll and close on Escape
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy && !exporting) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onCancel, busy, exporting])

  // Track responsive stage container size
  useEffect(() => {
    const el = stageRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      setStageBounds({
        w: Math.max(220, Math.floor(rect.width)),
        h: Math.max(200, Math.floor(rect.height)),
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const aspectRatio = useMemo(() => {
    if (!img) return 4 / 3
    return getAspectRatio(
      state.aspect,
      img.naturalWidth,
      img.naturalHeight,
      state.rotate90,
      state.outputWidth,
      state.outputHeight
    )
  }, [img, state.aspect, state.rotate90, state.outputWidth, state.outputHeight])

  // Final export pixel dimensions
  const outputDims = useMemo(() => {
    const w = clamp(Math.round(state.outputWidth || 1200), 200, 2400)
    const h =
      state.aspect === 'custom'
        ? clamp(Math.round(state.outputHeight || 900), 200, 2400)
        : clamp(Math.round(w / aspectRatio), 200, 2400)
    return { w, h }
  }, [state.outputWidth, state.outputHeight, state.aspect, aspectRatio])

  // Fit preview canvas cleanly inside available stage bounds
  const previewDims = useMemo(() => {
    const maxW = Math.max(200, stageBounds.w - 24)
    const maxH = Math.max(180, stageBounds.h - 24)
    let w = maxW
    let h = w / aspectRatio
    if (h > maxH) {
      h = maxH
      w = h * aspectRatio
    }
    return { w: Math.max(140, Math.round(w)), h: Math.max(120, Math.round(h)) }
  }, [stageBounds, aspectRatio])

  // Render live WYSIWYG canvas whenever state or size updates
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(previewDims.w * dpr)
    canvas.height = Math.round(previewDims.h * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawEditedImage(ctx, previewDims.w, previewDims.h, img, state)
  }, [img, previewDims, state])

  const setAspect = useCallback(
    (nextAspect: Exclude<AspectPreset, 'custom'>) => {
      if (!img) return
      setState((prev) => {
        const ratio = getAspectRatio(
          nextAspect,
          img.naturalWidth,
          img.naturalHeight,
          prev.rotate90,
          prev.outputWidth,
          prev.outputHeight
        )
        return {
          ...prev,
          aspect: nextAspect,
          outputHeight: clamp(Math.round(prev.outputWidth / ratio), 200, 2400),
          panX: 0,
          panY: 0,
        }
      })
    },
    [img]
  )

  const rotateBy = (delta: 90 | -90) => {
    setState((prev) => {
      const nextRot = (prev.rotate90 + delta + 360) % 360
      if (img && prev.aspect === 'original') {
        const ratio = getAspectRatio('original', img.naturalWidth, img.naturalHeight, nextRot, prev.outputWidth, prev.outputHeight)
        return {
          ...prev,
          rotate90: nextRot,
          outputHeight: clamp(Math.round(prev.outputWidth / ratio), 200, 2400),
          panX: 0,
          panY: 0,
        }
      }
      return { ...prev, rotate90: nextRot, panX: 0, panY: 0 }
    })
  }

  const fitWholeImage = () => {
    if (!img) return
    const swapped = Math.abs(state.rotate90) % 180 === 90
    const effW = swapped ? img.naturalHeight : img.naturalWidth
    const effH = swapped ? img.naturalWidth : img.naturalHeight
    const coverScale = Math.max(previewDims.w / effW, previewDims.h / effH)
    const containScale = Math.min(previewDims.w / effW, previewDims.h / effH)
    const fitZoom = clamp(Number((containScale / coverScale).toFixed(2)), 0.5, 1)
    setState((prev) => ({ ...prev, zoom: fitZoom, panX: 0, panY: 0 }))
  }

  const resetAll = () => {
    if (!img) return
    setState(makeDefaultState(img.naturalWidth, img.naturalHeight))
  }

  // Pointer drag-to-pan and 2-finger pinch-to-zoom
  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      pinchRef.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        startZoom: state.zoom,
      }
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const prevPos = pointersRef.current.get(e.pointerId)
    if (!prevPos) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchRef.current.dist > 0) {
        const nextZoom = clamp(pinchRef.current.startZoom * (dist / pinchRef.current.dist), 0.5, 3)
        setState((s) => ({ ...s, zoom: Number(nextZoom.toFixed(2)) }))
      }
      return
    }

    if (pointersRef.current.size === 1) {
      const dx = (e.clientX - prevPos.x) / Math.max(1, previewDims.w)
      const dy = (e.clientY - prevPos.y) / Math.max(1, previewDims.h)
      setState((s) => ({
        ...s,
        panX: clamp(s.panX + dx, -1.2, 1.2),
        panY: clamp(s.panY + dy, -1.2, 1.2),
      }))
    }
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
  }

  const onWheel = (e: ReactWheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const step = e.deltaY < 0 ? 0.08 : -0.08
    setState((s) => ({ ...s, zoom: Number(clamp(s.zoom + step, 0.5, 3).toFixed(2)) }))
  }

  const handleApply = async () => {
    if (!img || exporting || busy) return
    setExporting(true)
    try {
      const out = document.createElement('canvas')
      out.width = outputDims.w
      out.height = outputDims.h
      const ctx = out.getContext('2d')
      if (!ctx) throw new Error('Could not initialize image export canvas.')
      drawEditedImage(ctx, outputDims.w, outputDims.h, img, state)

      const edited = await new Promise<EditedPhoto>((resolve, reject) => {
        out.toBlob(
          (webp) => {
            if (webp && webp.type === 'image/webp') {
              resolve({ blob: webp, filename: 'photo.webp', mime: 'image/webp' })
              return
            }
            out.toBlob(
              (jpg) =>
                jpg
                  ? resolve({ blob: jpg, filename: 'photo.jpg', mime: 'image/jpeg' })
                  : reject(new Error('Could not export edited image.')),
              'image/jpeg',
              state.quality
            )
          },
          'image/webp',
          state.quality
        )
      })
      await onApply(edited)
    } catch (err) {
      setLoadError((err as Error).message)
    } finally {
      setExporting(false)
    }
  }

  const working = busy || exporting

  return (
    <div
      className="imged-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="imged-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !working) onCancel()
      }}
    >
      <div className="imged-modal">
        {/* Top Bar */}
        <div className="imged-head">
          <div className="imged-head-title">
            <div className="adm-card-icon">
              <Icon name="crop" size={18} />
            </div>
            <div>
              <h2 id="imged-title">Edit Photo Before Upload</h2>
              <p>
                {img
                  ? `Original ${img.naturalWidth} × ${img.naturalHeight} px · Output ${outputDims.w} × ${outputDims.h} px`
                  : 'Loading image...'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="bk-close"
            aria-label="Close image editor"
            disabled={working}
            onClick={onCancel}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {loadError ? (
          <div className="imged-error-body">
            <div className="adm-alert err" role="alert">
              <Icon name="alert" size={18} />
              <span>{loadError}</span>
            </div>
            <button type="button" className="btn ghost" onClick={onCancel}>
              Close
            </button>
          </div>
        ) : (
          <div className="imged-body">
            {/* Interactive Canvas Preview Stage */}
            <div className="imged-stage-col">
              <div ref={stageRef} className="imged-stage">
                <div className="imged-frame" style={{ width: previewDims.w, height: previewDims.h }}>
                  <canvas
                    ref={canvasRef}
                    className="imged-canvas"
                    style={{ width: previewDims.w, height: previewDims.h }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onWheel={onWheel}
                  />
                  {showGrid && <div className="imged-grid" aria-hidden="true" />}
                </div>
              </div>
              <div className="imged-stage-meta">
                <span>Drag photo to reposition · Scroll or pinch to zoom</span>
                <label className="imged-grid-toggle">
                  <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                  <span>Crop grid</span>
                </label>
              </div>
            </div>

            {/* Editor Controls Sidebar */}
            <div className="imged-controls">
              <div className="imged-tabs" role="tablist" aria-label="Image edit tools">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'transform'}
                  className={`imged-tab ${tab === 'transform' ? 'on' : ''}`}
                  onClick={() => setTab('transform')}
                >
                  <Icon name="crop" size={15} />
                  <span>Crop &amp; Rotate</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'resize'}
                  className={`imged-tab ${tab === 'resize' ? 'on' : ''}`}
                  onClick={() => setTab('resize')}
                >
                  <Icon name="maximize" size={15} />
                  <span>Resize</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'adjust'}
                  className={`imged-tab ${tab === 'adjust' ? 'on' : ''}`}
                  onClick={() => setTab('adjust')}
                >
                  <Icon name="sliders" size={15} />
                  <span>Adjust</span>
                </button>
              </div>

              {tab === 'transform' && (
                <div className="imged-panel">
                  <div className="imged-group">
                    <span className="imged-label">Rotate &amp; Flip</span>
                    <div className="imged-btn-row">
                      <button type="button" className="imged-tool-btn" onClick={() => rotateBy(-90)} title="Rotate 90° left">
                        <Icon name="rotateCcw" size={16} />
                        <span>Left 90°</span>
                      </button>
                      <button type="button" className="imged-tool-btn" onClick={() => rotateBy(90)} title="Rotate 90° right">
                        <Icon name="rotateCw" size={16} />
                        <span>Right 90°</span>
                      </button>
                      <button
                        type="button"
                        className={`imged-tool-btn ${state.flipH ? 'on' : ''}`}
                        onClick={() => setState((s) => ({ ...s, flipH: !s.flipH }))}
                        title="Flip horizontally"
                      >
                        <Icon name="flipH" size={16} />
                        <span>Flip H</span>
                      </button>
                      <button
                        type="button"
                        className={`imged-tool-btn ${state.flipV ? 'on' : ''}`}
                        onClick={() => setState((s) => ({ ...s, flipV: !s.flipV }))}
                        title="Flip vertically"
                      >
                        <Icon name="flipV" size={16} />
                        <span>Flip V</span>
                      </button>
                    </div>
                  </div>

                  <div className="imged-group">
                    <span className="imged-label">Crop Ratio</span>
                    <div className="imged-chip-row">
                      {ASPECT_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`adm-chip ${state.aspect === p.id ? 'on' : ''}`}
                          onClick={() => setAspect(p.id)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="imged-group">
                    <div className="imged-slider-head">
                      <span className="imged-label">Zoom</span>
                      <div className="imged-slider-actions">
                        <button type="button" className="imged-mini-link" onClick={fitWholeImage}>
                          Fit all
                        </button>
                        <button
                          type="button"
                          className="imged-mini-link"
                          onClick={() => setState((s) => ({ ...s, zoom: 1, panX: 0, panY: 0 }))}
                        >
                          Center
                        </button>
                        <strong>{Math.round(state.zoom * 100)}%</strong>
                      </div>
                    </div>
                    <input
                      type="range"
                      className="imged-range"
                      min="0.5"
                      max="3"
                      step="0.02"
                      value={state.zoom}
                      onChange={(e) => setState((s) => ({ ...s, zoom: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="imged-group">
                    <div className="imged-slider-head">
                      <span className="imged-label">Straighten Angle</span>
                      <div className="imged-slider-actions">
                        {state.straighten !== 0 && (
                          <button
                            type="button"
                            className="imged-mini-link"
                            onClick={() => setState((s) => ({ ...s, straighten: 0 }))}
                          >
                            0°
                          </button>
                        )}
                        <strong>{state.straighten > 0 ? `+${state.straighten}°` : `${state.straighten}°`}</strong>
                      </div>
                    </div>
                    <input
                      type="range"
                      className="imged-range"
                      min="-45"
                      max="45"
                      step="1"
                      value={state.straighten}
                      onChange={(e) => setState((s) => ({ ...s, straighten: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              )}

              {tab === 'resize' && (
                <div className="imged-panel">
                  <div className="imged-group">
                    <span className="imged-label">Quick Resize Presets</span>
                    <div className="imged-chip-row">
                      {WIDTH_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          className={`adm-chip ${outputDims.w === p.value ? 'on' : ''}`}
                          onClick={() =>
                            setState((s) => ({
                              ...s,
                              outputWidth: p.value,
                              outputHeight: clamp(Math.round(p.value / aspectRatio), 200, 2400),
                            }))
                          }
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="imged-dims-grid">
                    <label className="adm-field">
                      <span className="adm-label">Width (px)</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={200}
                        max={2400}
                        step={10}
                        value={state.outputWidth || ''}
                        onChange={(e) => {
                          const raw = Number(e.target.value)
                          setState((s) => ({
                            ...s,
                            outputWidth: Number.isFinite(raw) ? raw : 0,
                            ...(s.aspect !== 'custom' && raw >= 200
                              ? { outputHeight: clamp(Math.round(raw / aspectRatio), 200, 2400) }
                              : {}),
                          }))
                        }}
                        onBlur={() =>
                          setState((s) => {
                            const w = clamp(Math.round(s.outputWidth || 1200), 200, 2400)
                            return {
                              ...s,
                              outputWidth: w,
                              ...(s.aspect !== 'custom'
                                ? { outputHeight: clamp(Math.round(w / aspectRatio), 200, 2400) }
                                : {}),
                            }
                          })
                        }
                      />
                    </label>
                    <label className="adm-field">
                      <span className="adm-label">Height (px)</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={200}
                        max={2400}
                        step={10}
                        value={state.aspect === 'custom' ? state.outputHeight || '' : outputDims.h}
                        onChange={(e) => {
                          const raw = Number(e.target.value)
                          setState((s) => ({
                            ...s,
                            aspect: 'custom',
                            outputHeight: Number.isFinite(raw) ? raw : 0,
                          }))
                        }}
                        onBlur={() =>
                          setState((s) => ({
                            ...s,
                            outputHeight: clamp(Math.round(s.outputHeight || outputDims.h), 200, 2400),
                          }))
                        }
                      />
                    </label>
                  </div>
                  <p className="adm-hint">
                    Editing height directly switches to custom dimensions. Select a preset in Crop &amp; Rotate to lock ratios again.
                  </p>

                  <div className="imged-group">
                    <span className="imged-label">Image Quality</span>
                    <div className="imged-chip-row">
                      {QUALITY_PRESETS.map((q) => (
                        <button
                          key={q.value}
                          type="button"
                          className={`adm-chip ${state.quality === q.value ? 'on' : ''}`}
                          onClick={() => setState((s) => ({ ...s, quality: q.value }))}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'adjust' && (
                <div className="imged-panel">
                  <div className="imged-group">
                    <div className="imged-slider-head">
                      <span className="imged-label">Brightness</span>
                      <strong>{state.brightness}%</strong>
                    </div>
                    <input
                      type="range"
                      className="imged-range"
                      min="60"
                      max="140"
                      step="1"
                      value={state.brightness}
                      onChange={(e) => setState((s) => ({ ...s, brightness: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="imged-group">
                    <div className="imged-slider-head">
                      <span className="imged-label">Contrast</span>
                      <strong>{state.contrast}%</strong>
                    </div>
                    <input
                      type="range"
                      className="imged-range"
                      min="60"
                      max="140"
                      step="1"
                      value={state.contrast}
                      onChange={(e) => setState((s) => ({ ...s, contrast: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="imged-group">
                    <div className="imged-slider-head">
                      <span className="imged-label">Saturation</span>
                      <strong>{state.saturation}%</strong>
                    </div>
                    <input
                      type="range"
                      className="imged-range"
                      min="50"
                      max="150"
                      step="1"
                      value={state.saturation}
                      onChange={(e) => setState((s) => ({ ...s, saturation: Number(e.target.value) }))}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setState((s) => ({ ...s, brightness: 100, contrast: 100, saturation: 100 }))}
                  >
                    Reset color adjustments
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!loadError && (
          <div className="imged-foot">
            <button type="button" className="btn ghost sm" disabled={working || !img} onClick={resetAll}>
              <Icon name="refresh" size={14} />
              <span>Reset All</span>
            </button>
            <div className="imged-foot-right">
              <button type="button" className="btn ghost" disabled={working} onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="btn copper" disabled={working || !img} onClick={handleApply}>
                <Icon name="upload" size={16} />
                <span>{working ? 'Uploading...' : 'Apply & Upload'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
