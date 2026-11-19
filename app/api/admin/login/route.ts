import type { NextRequest } from 'next/server'
import { adminConfigured, checkPassword, clearFailures, endSession, recordFailure, startSession, tooManyAttempts } from '@/lib/auth'
import { bad, ok, readJson } from '@/lib/api'

const ipOf = (req: NextRequest) => req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'

export async function POST(req: NextRequest) {
  if (!adminConfigured()) return bad('Admin is not configured. Set ADMIN_PASSWORD in .env.local.', 503)
  const ip = ipOf(req)
  if (tooManyAttempts(ip)) return bad('Too many attempts. Try again in a few minutes.', 429)
  const body = (await readJson(req)) as { password?: unknown } | null
  if (typeof body?.password !== 'string' || !checkPassword(body.password)) {
    recordFailure(ip)
    return bad('Incorrect password.', 401)
  }
  clearFailures(ip)
  const secure = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
  await startSession(secure)
  return ok()
}

export async function DELETE() {
  await endSession()
  return ok()
}
