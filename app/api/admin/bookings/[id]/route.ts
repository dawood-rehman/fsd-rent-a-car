import { bad, guard, ok, readJson } from '@/lib/api'
import { BOOKING_STATUSES, type BookingStatus } from '@/lib/data'
import { mutate } from '@/lib/db'
import { revalidatePublicSite } from '@/lib/revalidate'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await guard(req)
  if (denied) return denied
  const { id } = await params
  const body = (await readJson(req)) as { status?: unknown; vehicleAvailable?: unknown } | null
  const validStatus = BOOKING_STATUSES.some((s) => s.id === body?.status)
  if (!validStatus) return bad('Invalid booking status.')
  const status = body!.status as BookingStatus
  const vehicleAvailable = typeof body?.vehicleAvailable === 'boolean' ? body.vehicleAvailable : undefined

  try {
    const res = await mutate((db, cancel) => {
      const b = db.bookings.find((x) => x.id === id)
      if (!b) {
        cancel()
        return null
      }
      b.status = status
      let updatedVehicle = null
      if (vehicleAvailable !== undefined && b.vehicleId) {
        const v = db.vehicles.find((x) => x.id === b.vehicleId)
        if (v) {
          v.available = vehicleAvailable
          updatedVehicle = v
        }
      }
      return { booking: b, vehicle: updatedVehicle }
    })
    if (!res) return bad('Booking not found.', 404)
    if (res.vehicle) revalidatePublicSite()
    return ok(res)
  } catch {
    return bad('Could not update booking.', 500)
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await guard(req)
  if (denied) return denied
  const { id } = await params
  try {
    const found = await mutate((db, cancel) => {
      const before = db.bookings.length
      db.bookings = db.bookings.filter((b) => b.id !== id)
      if (db.bookings.length === before) {
        cancel()
        return false
      }
      return true
    })
    if (!found) return bad('Booking not found.', 404)
    return ok()
  } catch {
    return bad('Could not delete booking.', 500)
  }
}
