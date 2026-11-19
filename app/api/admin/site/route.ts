import { guard, ok, bad, readJson } from '@/lib/api'
import { mutate } from '@/lib/db'
import { parseSite } from '@/lib/validate'

export async function PUT(req: Request) {
  const denied = await guard()
  if (denied) return denied
  const parsed = parseSite(await readJson(req))
  if (!parsed.ok) return bad(parsed.error)
  try {
    await mutate((db) => { db.site = parsed.value })
    return ok({ site: parsed.value })
  } catch { return bad('Could not save. Check that the server can write to the data folder.', 500) }
}
