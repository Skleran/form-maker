interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/**
 * Fixed-window limiter held in memory, so it suits a single server process. Limits reset on restart
 * and aren't shared between instances, which means it would need a shared store on a serverless host.
 * Returns false once the key has used up its window.
 */
export function consumeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  if (buckets.size >= MAX_BUCKETS) pruneExpired(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}

export function resetRateLimit(key: string): void {
  buckets.delete(key)
}

/**
 * The rightmost x-forwarded-for entry is the one added by our own proxy. Entries to its left come
 * from the client and can be made up to dodge the limit.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  const last = forwarded?.split(",").pop()?.trim()
  return last || headers.get("x-real-ip") || "unknown"
}
