import { guard, ok, bad, readJson } from '@/lib/api'
import { deleteImageIfUnused, readDbSafe, saveImage } from '@/lib/db'
import { createRateLimiter, getClientIp } from '@/lib/rateLimit'
import { isValidImageUrl, sniffImage } from '@/lib/validate'

const MAX = 5 * 1024 * 1024
const uploadLimiter = createRateLimiter({ max: 40, windowMs: 5 * 60 * 1000, maxEntries: 1000 })

export async function POST(req: Request) {
  const denied = await guard(req)
  if (denied) return denied
  if (uploadLimiter.hit(getClientIp(req))) {
    return bad('Too many uploads in a short time. Please wait a moment.', 429)
  }
  let file: FormDataEntryValue | null
  try {
    file = (await req.formData()).get('file')
  } catch {
    return bad('Invalid upload.')
  }
  if (!(file instanceof File)) return bad('Choose an image to upload.')
  if (file.size > MAX) return bad('Image is larger than 5 MB.')
  const buf = Buffer.from(await file.arrayBuffer())
  const ext = sniffImage(buf)
  if (!ext) return bad('Only JPG, PNG or WebP images are allowed.')
  try {
    return ok({ url: await saveImage(buf, ext) }, 201)
  } catch {
    return bad('Could not store the image.', 500)
  }
}

/** Clean up an uploaded photo that was discarded before saving a vehicle. */
export async function DELETE(req: Request) {
  const denied = await guard(req)
  if (denied) return denied
  const body = (await readJson(req)) as { url?: unknown } | null
  if (typeof body?.url !== 'string' || !isValidImageUrl(body.url)) return bad('Invalid image URL.')
  const { vehicles } = await readDbSafe()
  await deleteImageIfUnused(body.url, vehicles)
  return ok()
}
