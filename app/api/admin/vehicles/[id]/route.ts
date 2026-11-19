import { guard, ok, bad, readJson } from '@/lib/api'
import { deleteImageIfUnused, mutate } from '@/lib/db'
import { parseVehicle } from '@/lib/validate'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: Ctx) {
  const denied = await guard()
  if (denied) return denied
  const { id } = await params
  const parsed = parseVehicle(await readJson(req), id)
  if (!parsed.ok) return bad(parsed.error)
  try {
    const res = await mutate((db) => {
      const i = db.vehicles.findIndex((v) => v.id === id)
      if (i < 0) return null
      const oldImage = db.vehicles[i].image
      db.vehicles[i] = parsed.value
      return { oldImage, vehicles: [...db.vehicles] }
    })
    if (!res) return bad('Vehicle not found.', 404)
    if (res.oldImage !== parsed.value.image) await deleteImageIfUnused(res.oldImage, res.vehicles)
    return ok({ vehicle: parsed.value })
  } catch { return bad('Could not save. Check your storage configuration.', 500) }
}

/** Quick toggle of `available` without resending the full form. */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await guard()
  if (denied) return denied
  const { id } = await params
  const body = (await readJson(req)) as { available?: unknown } | null
  if (typeof body?.available !== 'boolean') return bad('Invalid availability value.')
  const available = body.available
  try {
    const vehicle = await mutate((db) => {
      const v = db.vehicles.find((x) => x.id === id)
      if (!v) return null
      v.available = available
      return v
    })
    if (!vehicle) return bad('Vehicle not found.', 404)
    return ok({ vehicle })
  } catch { return bad('Could not update vehicle.', 500) }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await guard()
  if (denied) return denied
  const { id } = await params
  try {
    const res = await mutate((db) => {
      const v = db.vehicles.find((x) => x.id === id)
      if (!v) return null
      db.vehicles = db.vehicles.filter((x) => x.id !== id)
      return { image: v.image ?? null, vehicles: [...db.vehicles] }
    })
    if (!res) return bad('Vehicle not found.', 404)
    await deleteImageIfUnused(res.image, res.vehicles)
    return ok()
  } catch { return bad('Could not delete. Check your storage configuration.', 500) }
}
