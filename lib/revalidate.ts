import { revalidatePath } from 'next/cache'

/** Immediately refreshes cached public pages, metadata, sitemap, and manifest after any admin change. */
export function revalidatePublicSite() {
  try {
    revalidatePath('/', 'layout')
    revalidatePath('/')
    revalidatePath('/manifest.webmanifest')
    revalidatePath('/sitemap.xml')
  } catch {
    // Safe no-op outside a Next.js request context
  }
}
