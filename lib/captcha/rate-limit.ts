type Bucket = { count: number; reset: number }
const buckets = new Map<string, Bucket>()

export function checkRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (b.count >= limit) return false
  b.count += 1
  return true
}

// Sürüklenen pencereyi şişmemek için süresi dolan bucket'ları temizle
if (typeof setInterval !== "undefined") {
  const t = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k)
  }, 300_000)
  if (typeof (t as unknown as { unref?: () => void }).unref === "function") {
    ;(t as unknown as { unref: () => void }).unref()
  }
}
