import { randomUUID } from 'node:crypto'
import { guard, ok, bad, readJson } from '@/lib/api'
import { mutate } from '@/lib/db'
import { parseVehicle } from '@/lib/validate'

export async function POST(req: Request) {
  const denied = await guard()
  if (denied) return denied
  const parsed = parseVehicle(await readJson(req), randomUUID())
  if (!parsed.ok) return bad(parsed.error)
  try {
    await mutate((db) => { db.vehicles.push(parsed.value) })
    return ok({ vehicle: parsed.value })
  } catch { return bad('Could not save. Check your storage configuration.', 500) }
}

/** Reorder vehicles by providing `{ ids: string[] }`. */
export async function PATCH(req: Request) {
  const denied = await guard()
  if (denied) return denied
  const body = (await readJson(req)) as { ids?: unknown } | null
  if (!Array.isArray(body?.ids) || !body.ids.every((x): x is string => typeof x === 'string')) {
    return bad('Invalid vehicle order.')
  }
  const order = body.ids
  try {
    const vehicles = await mutate((db) => {
      const byId = new Map(db.vehicles.map((v) => [v.id, v]))
      const next = order.map((id) => byId.get(id)).filter((v): v is NonNullable<typeof v> => !!v)
      for (const v of db.vehicles) if (!order.includes(v.id)) next.push(v)
      db.vehicles = next
      return db.vehicles
    })
    return ok({ vehicles })
  } catch { return bad('Could not reorder vehicles.', 500) }
}
