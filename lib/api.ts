import { NextResponse } from 'next/server'
import { isAdmin } from './auth'

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
export const ok = (body: unknown = { ok: true }) => NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } })

/** Returns an error response when the caller is not signed in as admin, otherwise null. */
export async function guard() {
  return (await isAdmin()) ? null : bad('Your session expired. Please sign in again.', 401)
}

export async function readJson(req: Request): Promise<unknown> {
  try { return await req.json() } catch { return null }
}
