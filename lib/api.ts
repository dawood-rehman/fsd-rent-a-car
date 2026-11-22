import { NextResponse } from 'next/server'
import { isAdmin } from './auth'

export const bad = (error: string, status = 400) =>
  NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })

export const ok = (body: unknown = { ok: true }, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** Lightweight CSRF origin check for state-changing requests. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (!host) return true
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase()
  } catch {
    return false
  }
}

/** Returns an error response when the caller is not signed in as admin (or invalid origin), otherwise null. */
export async function guard(req?: Request) {
  if (req && req.method !== 'GET' && req.method !== 'HEAD' && !isSameOrigin(req)) {
    return bad('Forbidden request origin.', 403)
  }
  return (await isAdmin()) ? null : bad('Your session expired. Please sign in again.', 401)
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return null
  }
}
