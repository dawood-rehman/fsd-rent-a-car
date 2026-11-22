'use client'
import { useEffect, useRef, type ReactNode } from 'react'

// Shared singleton observer keeps scroll reveal lightweight even with many sections/cards.
let sharedObserver: IntersectionObserver | null = null

function getObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return null
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            sharedObserver?.unobserve(entry.target)
          }
        }
      },
      // Low threshold ensures tall sections on mobile screens always trigger reliably.
      { threshold: 0.01, rootMargin: '0px 0px -24px 0px' }
    )
  }
  return sharedObserver
}

export default function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = getObserver()
    if (!io) {
      el.classList.add('in')
      return
    }
    io.observe(el)
    return () => io.unobserve(el)
  }, [])
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}
