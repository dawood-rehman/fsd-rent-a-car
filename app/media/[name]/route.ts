import { readImage } from '@/lib/db'

const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

function mediaHeaders(name: string, size: number) {
  return {
    'Content-Type': TYPES[name.split('.').pop() ?? ''] ?? 'application/octet-stream',
    'Content-Length': String(size),
    ETag: `"${name}"`,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const etag = `"${name}"`
  if (req.headers.get('if-none-match') === etag) {
    // Still ensure file exists before returning 304
    const buf = await readImage(name)
    if (!buf) return new Response('Not found', { status: 404 })
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  }
  const buf = await readImage(name)
  if (!buf) return new Response('Not found', { status: 404 })
  // File names are random UUIDs and never reused, so they can be cached forever.
  return new Response(new Uint8Array(buf), { headers: mediaHeaders(name, buf.length) })
}

export async function HEAD(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const buf = await readImage(name)
  if (!buf) return new Response(null, { status: 404 })
  return new Response(null, { status: 200, headers: mediaHeaders(name, buf.length) })
}
