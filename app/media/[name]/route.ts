import { readImage } from '@/lib/db'

const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const buf = await readImage(name)
  if (!buf) return new Response('Not found', { status: 404 })
  // File names are random UUIDs and never reused, so they can be cached forever.
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': TYPES[name.split('.').pop() ?? ''] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
