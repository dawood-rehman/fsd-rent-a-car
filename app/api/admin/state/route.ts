import { bad, guard, ok } from '@/lib/api'
import { readDb } from '@/lib/db'

export async function GET() {
  const denied = await guard()
  if (denied) return denied
  try {
    const db = await readDb()
    return ok(db)
  } catch {
    return bad('Could not load stored data.', 500)
  }
}
