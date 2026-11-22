import { guard, ok, bad, readJson } from '@/lib/api'
import { mutate } from '@/lib/db'
import { revalidatePublicSite } from '@/lib/revalidate'
import { parseSite } from '@/lib/validate'

export async function PUT(req: Request) {
  const denied = await guard(req)
  if (denied) return denied
  const parsed = parseSite(await readJson(req))
  if (!parsed.ok) return bad(parsed.error)
  try {
    const res = await mutate((db, cancel) => {
      const nextCatIds = new Set(parsed.value.categories.map((c) => c.id))
      const orphaned = db.vehicles.find((v) => !nextCatIds.has(v.category))
      if (orphaned) {
        cancel()
        const oldCat = db.site.categories.find((c) => c.id === orphaned.category)
        return {
          error: `Cannot delete category "${oldCat?.label ?? orphaned.category}" while vehicles (e.g. ${orphaned.name}) are assigned to it. Reassign those vehicles first.`,
        }
      }
      db.site = parsed.value
      return { site: parsed.value }
    })
    if ('error' in res && res.error) return bad(res.error, 400)
    revalidatePublicSite()
    return ok({ site: parsed.value })
  } catch {
    return bad('Could not save. Check that the server can write to the data folder.', 500)
  }
}
