import { guard, ok, bad, readJson } from '@/lib/api'
import { deleteImageIfUnused, mutate } from '@/lib/db'
import { revalidatePublicSite } from '@/lib/revalidate'
import { parseVehicle } from '@/lib/validate'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: Ctx) {
  const denied = await guard(req)
  if (denied) return denied
  const { id } = await params
  const body = await readJson(req)
  try {
    const res = await mutate((db, cancel) => {
      const i = db.vehicles.findIndex((v) => v.id === id)
      if (i < 0) {
        cancel()
        return { status: 404 as const, error: 'Vehicle not found.' }
      }
      const parsed = parseVehicle(body, id, db.site.categories)
      if (!parsed.ok) {
        cancel()
        return { status: 400 as const, error: parsed.error }
      }
      const oldImage = db.vehicles[i].image
      db.vehicles[i] = parsed.value
      return { status: 200 as const, vehicle: parsed.value, oldImage, vehicles: [...db.vehicles] }
    })
    if (res.status !== 200) return bad(res.error, res.status)
    if (res.oldImage !== res.vehicle.image) await deleteImageIfUnused(res.oldImage, res.vehicles)
    revalidatePublicSite()
    return ok({ vehicle: res.vehicle })
  } catch {
    return bad('Could not save. Check your storage configuration.', 500)
  }
}

/** Quick toggle of `available` without resending the full form. */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await guard(req)
  if (denied) return denied
  const { id } = await params
  const body = (await readJson(req)) as { available?: unknown } | null
  if (typeof body?.available !== 'boolean') return bad('Invalid availability value.')
  const available = body.available
  try {
    const vehicle = await mutate((db, cancel) => {
      const v = db.vehicles.find((x) => x.id === id)
      if (!v) {
        cancel()
        return null
      }
      v.available = available
      return v
    })
    if (!vehicle) return bad('Vehicle not found.', 404)
    revalidatePublicSite()
    return ok({ vehicle })
  } catch {
    return bad('Could not update vehicle.', 500)
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await guard(req)
  if (denied) return denied
  const { id } = await params
  try {
    const res = await mutate((db, cancel) => {
      const v = db.vehicles.find((x) => x.id === id)
      if (!v) {
        cancel()
        return null
      }
      db.vehicles = db.vehicles.filter((x) => x.id !== id)
      return { image: v.image ?? null, vehicles: [...db.vehicles] }
    })
    if (!res) return bad('Vehicle not found.', 404)
    await deleteImageIfUnused(res.image, res.vehicles)
    revalidatePublicSite()
    return ok()
  } catch {
    return bad('Could not delete. Check your storage configuration.', 500)
  }
}
