import { randomUUID } from 'node:crypto'
import { bad, isSameOrigin, ok, readJson } from '@/lib/api'
import { mutate } from '@/lib/db'
import { createRateLimiter, getClientIp } from '@/lib/rateLimit'
import { parseBooking } from '@/lib/validate'

// Protect booking endpoint against spam/flood under high traffic (12 bookings / 15 min per IP).
const bookingLimiter = createRateLimiter({ max: 12, windowMs: 15 * 60 * 1000, maxEntries: 10_000 })

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return bad('Forbidden request origin.', 403)
  const ip = getClientIp(req)
  if (bookingLimiter.hit(ip)) {
    return bad('Too many booking requests from this device. Please contact us directly on WhatsApp.', 429)
  }
  const body = await readJson(req)
  const id = randomUUID()
  try {
    const res = await mutate((db, cancel) => {
      const parsed = parseBooking(body, db.vehicles, id)
      if (!parsed.ok) {
        cancel()
        return { error: parsed.error }
      }
      db.bookings.unshift(parsed.value)
      return { booking: parsed.value }
    })
    if ('error' in res && res.error) return bad(res.error, 400)
    return ok({ booking: res.booking }, 201)
  } catch {
    return bad('Could not submit your booking request. Please message us on WhatsApp directly.', 500)
  }
}
