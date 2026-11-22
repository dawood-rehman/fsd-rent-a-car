export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

/** Small fetch wrapper for admin calls. A 401 means the session expired, so reload to show the login. */
export async function api<T = unknown>(url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body instanceof FormData || body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401 && !url.endsWith('/login')) {
      location.reload()
      return { ok: false, error: 'Session expired.' }
    }
    if (!res.ok) return { ok: false, error: (data as { error?: string }).error ?? 'Something went wrong.' }
    return { ok: true, data: data as T }
  } catch {
    return { ok: false, error: 'Network error. Check your connection and try again.' }
  }
}

export type ResizedImage = { blob: Blob; filename: string; mime: string }

/** Shrink and optimize a photo in the browser before upload (max 1400px longest side, WebP with JPEG fallback). */
export function resizeImage(file: File): Promise<ResizedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const longest = Math.max(img.width, img.height)
      const s = longest > 0 ? Math.min(1, 1400 / longest) : 1
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(img.width * s))
      c.height = Math.max(1, Math.round(img.height * s))
      const ctx = c.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Could not initialize image processor.'))
        return
      }
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)

      // Prefer WebP for smaller high-traffic payloads; fall back cleanly to JPEG.
      c.toBlob(
        (webp) => {
          if (webp && webp.type === 'image/webp') {
            resolve({ blob: webp, filename: 'photo.webp', mime: 'image/webp' })
            return
          }
          c.toBlob(
            (jpg) =>
              jpg
                ? resolve({ blob: jpg, filename: 'photo.jpg', mime: 'image/jpeg' })
                : reject(new Error('Could not process this image.')),
            'image/jpeg',
            0.86
          )
        },
        'image/webp',
        0.85
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file is not a valid image.'))
    }
    img.src = url
  })
}
