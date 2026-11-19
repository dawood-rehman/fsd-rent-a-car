// Server-only admin authentication: password from ADMIN_PASSWORD (never sent to the browser)
// and a signed, httpOnly session cookie.
import { cookies } from 'next/headers'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE = 'rc_admin'
const TTL_SECONDS = 60 * 60 * 8

export const adminConfigured = () => !!process.env.ADMIN_PASSWORD

const sha = (s: string) => createHash('sha256').update(s).digest()
const sign = (exp: string) => createHmac('sha256', sha(`rentacar-fsd:${process.env.ADMIN_PASSWORD ?? ''}`)).update(exp).digest('base64url')

export function checkPassword(input: string): boolean {
  const real = process.env.ADMIN_PASSWORD
  if (!real) return false
  return timingSafeEqual(sha(input), sha(real))
}

export async function startSession(secure: boolean) {
  const exp = String(Date.now() + TTL_SECONDS * 1000)
  const jar = await cookies()
  jar.set(COOKIE, `${exp}.${sign(exp)}`, { httpOnly: true, sameSite: 'strict', secure, path: '/', maxAge: TTL_SECONDS })
}

export async function endSession() {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false
  const v = (await cookies()).get(COOKIE)?.value
  if (!v) return false
  const [exp, sig] = v.split('.')
  if (!exp || !sig || !(Number(exp) > Date.now())) return false
  const a = Buffer.from(sig), b = Buffer.from(sign(exp))
  return a.length === b.length && timingSafeEqual(a, b)
}

// Basic brute-force protection (per server process).
const attempts = new Map<string, { n: number; reset: number }>()
export function tooManyAttempts(ip: string): boolean {
  const now = Date.now()
  const a = attempts.get(ip)
  return !!a && a.reset > now && a.n >= 8
}
export function recordFailure(ip: string) {
  const now = Date.now()
  const a = attempts.get(ip)
  if (!a || a.reset <= now) attempts.set(ip, { n: 1, reset: now + 10 * 60 * 1000 })
  else a.n++
}
export function clearFailures(ip: string) { attempts.delete(ip) }
