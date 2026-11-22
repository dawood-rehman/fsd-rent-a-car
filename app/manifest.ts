import type { MetadataRoute } from 'next'
import { getSiteDb } from '@/lib/db'

export const revalidate = 300

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { site } = await getSiteDb()
  return {
    name: site.name,
    short_name: site.name.slice(0, 20),
    description: site.description || undefined,
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f0e4',
    theme_color: '#231d19',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
