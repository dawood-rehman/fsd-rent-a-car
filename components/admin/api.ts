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
