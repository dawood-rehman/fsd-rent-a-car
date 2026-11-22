import { revalidatePath, revalidateTag } from 'next/cache'

/** Immediately refreshes cached public pages, data cache, metadata, sitemap, and manifest after any admin change. */
export function revalidatePublicSite() {
  try {
    revalidateTag('site-data', { expire: 0 })
    revalidatePath('/', 'layout')
    revalidatePath('/')
    revalidatePath('/manifest.webmanifest')
    revalidatePath('/sitemap.xml')
  } catch {
    // Safe no-op outside a Next.js request context
  }
}
