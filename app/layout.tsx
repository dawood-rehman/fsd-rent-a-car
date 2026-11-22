import type { Metadata, Viewport } from 'next'
import { Fraunces, Manrope, Space_Mono } from 'next/font/google'
import { getSiteDb } from '@/lib/db'
import './globals.css'

const serif = Fraunces({ subsets: ['latin'], variable: '--font-serif', style: ['normal', 'italic'], display: 'swap' })
const sans = Manrope({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const mono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono', display: 'swap' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#231d19',
}

function getMetadataBase(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  if (!raw) return undefined
  try {
    return new URL(raw)
  } catch {
    return undefined
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteDb()
  const title = site.tagline ? `${site.name} | ${site.tagline}` : `${site.name} | Self-Drive & Chauffeur Car Rental`
  const description = site.description || undefined
  return {
    metadataBase: getMetadataBase(),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'en_US',
      siteName: site.name,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
