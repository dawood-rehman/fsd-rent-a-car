import { bad, guard, ok } from '@/lib/api'
import { readDb } from '@/lib/db'

export async function GET() {
  const denied = await guard()
  if (denied) return denied
  try {
    const { bookings } = await readDb()
    return ok({ bookings })
  } catch {
    return bad('Could not load bookings.', 500)
  }
}
