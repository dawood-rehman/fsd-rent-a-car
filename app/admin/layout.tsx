import type { Metadata } from 'next'
import { getSiteDb } from '@/lib/db'

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteDb()
  return {
    title: `Admin | ${site.name}`,
    robots: { index: false, follow: false },
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
