import { bad, guard, ok, readJson } from '@/lib/api'
import { deleteImage, listMedia, readDb } from '@/lib/db'
import { isValidImageUrl } from '@/lib/validate'

export async function GET() {
  const denied = await guard()
  if (denied) return denied
  try {
    const [media, db] = await Promise.all([listMedia(), readDb()])
    const items = media.map((m) => ({
      ...m,
      usedBy: db.vehicles.filter((v) => v.image === m.url).map((v) => ({ id: v.id, name: v.name })),
    }))
    return ok({ items })
  } catch {
    return bad('Could not list media files.', 500)
  }
}

export async function DELETE(req: Request) {
  const denied = await guard(req)
  if (denied) return denied
  const body = (await readJson(req)) as { url?: unknown; unused?: unknown } | null
  try {
    const db = await readDb()
    const inUse = new Set(db.vehicles.map((v) => v.image).filter((x): x is string => typeof x === 'string'))

    if (body?.unused === true) {
      const all = await listMedia()
      let removed = 0
      for (const m of all) {
        if (!inUse.has(m.url)) {
          await deleteImage(m.url)
          removed += 1
        }
      }
      return ok({ removed })
    }

    if (typeof body?.url !== 'string' || !isValidImageUrl(body.url)) {
      return bad('Invalid image URL.')
    }
    if (inUse.has(body.url)) {
      return bad('Cannot delete an image currently assigned to a vehicle.', 409)
    }
    await deleteImage(body.url)
    return ok({ deleted: body.url })
  } catch {
    return bad('Could not delete media file.', 500)
  }
}
