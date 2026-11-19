import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin | Rent a Car Faisalabad', robots: { index: false, follow: false } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
