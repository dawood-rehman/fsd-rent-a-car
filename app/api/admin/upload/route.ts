import { guard, ok, bad, readJson } from '@/lib/api'
import { deleteImageIfUnused, readDbSafe, saveImage } from '@/lib/db'
import { isValidImageUrl, sniffImage } from '@/lib/validate'

const MAX = 5 * 1024 * 1024

export async function POST(req: Request) {
  const denied = await guard()
  if (denied) return denied
  let file: FormDataEntryValue | null
  try { file = (await req.formData()).get('file') } catch { return bad('Invalid upload.') }
  if (!(file instanceof File)) return bad('Choose an image to upload.')
  if (file.size > MAX) return bad('Image is larger than 5 MB.')
  const buf = Buffer.from(await file.arrayBuffer())
  const ext = sniffImage(buf)
  if (!ext) return bad('Only JPG, PNG or WebP images are allowed.')
  try { return ok({ url: await saveImage(buf, ext) }) } catch { return bad('Could not store the image.', 500) }
}

/** Clean up an uploaded photo that was discarded before saving a vehicle. */
export async function DELETE(req: Request) {
  const denied = await guard()
  if (denied) return denied
  const body = (await readJson(req)) as { url?: unknown } | null
  if (typeof body?.url !== 'string' || !isValidImageUrl(body.url)) return bad('Invalid image URL.')
  const { vehicles } = await readDbSafe()
  await deleteImageIfUnused(body.url, vehicles)
  return ok()
}
