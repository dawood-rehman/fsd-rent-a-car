// Bounded, memory-safe in-memory rate limiter for high-traffic resilience.
// Prevents unbounded Map growth under brute-force or DDoS bursts.

type RateLimiter = {
  isLimited: (key: string) => boolean
  hit: (key: string) => boolean
  reset: (key: string) => void
}

export function createRateLimiter(opts: { max: number; windowMs: number; maxEntries?: number }): RateLimiter {
  const { max, windowMs, maxEntries = 5000 } = opts
  const map = new Map<string, { n: number; resetAt: number }>()

  const prune = (now: number) => {
    for (const [k, v] of map) {
      if (v.resetAt <= now) map.delete(k)
    }
    while (map.size >= maxEntries) {
      const oldest = map.keys().next().value
      if (oldest === undefined) break
      map.delete(oldest)
    }
  }

  return {
    isLimited(key: string): boolean {
      const now = Date.now()
      const entry = map.get(key)
      if (!entry) return false
      if (entry.resetAt <= now) {
        map.delete(key)
        return false
      }
      return entry.n >= max
    },
    /** Records an attempt and returns `true` if the caller is now over the limit. */
    hit(key: string): boolean {
      const now = Date.now()
      const entry = map.get(key)
      if (!entry || entry.resetAt <= now) {
        if (map.size >= maxEntries) prune(now)
        map.set(key, { n: 1, resetAt: now + windowMs })
        return 1 > max
      }
      entry.n += 1
      return entry.n > max
    },
    reset(key: string) {
      map.delete(key)
    },
  }
}

export function getClientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (xff) return xff
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real
  return 'local'
}
