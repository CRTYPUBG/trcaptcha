/**
 * Tek kullanımlık görev store'u (in-memory).
 *
 * Not: Çok örnekli (Vercel gibi) ortamlarda instance başına çalışır; gerçek
 * tek kullanımlık garanti için Redis veya D1 gibi paylaşılan bir store gerekir.
 * (bkz. README)
 */
const used = new Map<string, number>()
const silentTimes = new Map<string, number>()

/** Sessiz geçişler arasında zorunlu bekleme süresi. */
export const SILENT_PASS_COOLDOWN_MS = 20_000

export function markUsed(sid: string, expMs: number) {
  used.set(sid, expMs)
}

export function isUsed(sid: string): boolean {
  const exp = used.get(sid)
  if (!exp) return false
  if (exp < Date.now()) {
    used.delete(sid)
    return false
  }
  return true
}

/**
 * Sessiz geçiş isteğini cooldown'a sokar: son geçişten `SILENT_PASS_COOLDOWN_MS`
 * geçmeden tekrar sessiz geçiş verilmez. Böylece sessiz geçiş, isteği
 * tekrarlayarak sistemi aşmak için kullanılamaz.
 */
export function canSilentPass(ip: string): boolean {
  const last = silentTimes.get(ip)
  if (!last) return true
  return Date.now() - last >= SILENT_PASS_COOLDOWN_MS
}

export function markSilentPass(ip: string): void {
  silentTimes.set(ip, Date.now())
}
