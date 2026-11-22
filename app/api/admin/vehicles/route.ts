import { randomUUID } from 'node:crypto'
import { guard, ok, bad, readJson } from '@/lib/api'
import { mutate } from '@/lib/db'
import { revalidatePublicSite } from '@/lib/revalidate'
import { parseVehicle } from '@/lib/validate'

export async function POST(req: Request) {
  const denied = await guard(req)
  if (denied) return denied
  const body = await readJson(req)
  const id = randomUUID()
  try {
    const res = await mutate((db, cancel) => {
      const parsed = parseVehicle(body, id, db.site.categories)
      if (!parsed.ok) {
        cancel()
        return { error: parsed.error }
      }
      db.vehicles.push(parsed.value)
      return { vehicle: parsed.value }
    })
    if ('error' in res && res.error) return bad(res.error, 400)
    revalidatePublicSite()
    return ok({ vehicle: res.vehicle }, 201)
  } catch {
    return bad('Could not save. Check your storage configuration.', 500)
  }
}

/** Reorder vehicles by providing `{ ids: string[] }`. */
export async function PATCH(req: Request) {
  const denied = await guard(req)
  if (denied) return denied
  const body = (await readJson(req)) as { ids?: unknown } | null
  if (!Array.isArray(body?.ids) || !body.ids.every((x): x is string => typeof x === 'string')) {
    return bad('Invalid vehicle order.')
  }
  const order = body.ids
  try {
    const vehicles = await mutate((db) => {
      const byId = new Map(db.vehicles.map((v) => [v.id, v]))
      const seen = new Set<string>()
      const next = []
      for (const id of order) {
        const v = byId.get(id)
        if (v && !seen.has(id)) {
          seen.add(id)
          next.push(v)
        }
      }
      for (const v of db.vehicles) {
        if (!seen.has(v.id)) next.push(v)
      }
      db.vehicles = next
      return db.vehicles
    })
    revalidatePublicSite()
    return ok({ vehicles })
  } catch {
    return bad('Could not reorder vehicles.', 500)
  }
}
