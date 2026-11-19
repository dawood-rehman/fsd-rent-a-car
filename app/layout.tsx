import type { Metadata } from 'next'
import { Fraunces, Manrope, Space_Mono } from 'next/font/google'
import { readDbSafe } from '@/lib/db'
import './globals.css'

const serif = Fraunces({ subsets: ['latin'], variable: '--serif', style: ['normal', 'italic'] })
const sans = Manrope({ subsets: ['latin'], variable: '--sans' })
const mono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--mono' })

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await readDbSafe()
  return {
    title: `${site.name} | Self-Drive & Chauffeur Car Rental`,
    description: site.description || undefined,
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
