import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Sunucu imzalı "geçiş bileti" (pass token).
 *
 * İstemcideki "sessiz geçiş" (silent pass) mantığı tek başına güvenlik sağlamaz —
 * bu yalnızca bir kullanıcı deneyimi kısayoludur. Entegrasyon yapan siteler,
 * kullanıcıyı gerçekten doğrulanmış sayıp saymayacağına bu bileti kullanarak
 * karar vermelidir. Bilet, `CAPTCHA_SECRET` ile HMAC-SHA256 imzalanır ve
 * yalnızca sunucuda doğrulanabilir.
 */

const TOKEN_VERSION = "v1"

/** Biletin geçerlilik süresi: 5 dakika. */
const PASS_TTL_MS = 5 * 60 * 1000

function secretKey(): Buffer {
  const s = process.env.CAPTCHA_SECRET
  if (!s || s.length < 32) {
    throw new Error("CAPTCHA_SECRET must be 32+ chars")
  }
  return Buffer.from(s, "utf8").subarray(0, 32)
}

function toBase64Url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url")
}

function sign(body: string): string {
  return createHmac("sha256", secretKey()).update(body).digest("base64url")
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/**
 * @param subject Bileti doğrulayan tarafın tanımlayabileceği kimlik (örn. "captcha").
 * @param scope  İsteğe bağlı kapsam bilgisi (örn. "login") — siteler kendi
 *               akışlarına göre parmak izini bağlayabilir.
 */
export function issuePassToken(
  subject = "trcaptcha",
  scope?: string
): { passToken: string; expiresAt: number } {
  const expiresAt = Date.now() + PASS_TTL_MS
  const body = toBase64Url(
    JSON.stringify({ sub: subject, scope: scope ?? null, exp: expiresAt })
  )
  return { passToken: `${TOKEN_VERSION}.${body}.${sign(body)}`, expiresAt }
}

export interface PassTokenClaims {
  sub: string
  scope: string | null
  exp: number
}

/**
 * Bileti doğrular. Süresi dolmuş, imzası bozuk veya yapısı hatalıysa `null`.
 * Sadece sunucuda çağrılmalıdır.
 */
export function verifyPassToken(token: string): PassTokenClaims | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [version, body, signature] = parts
  if (version !== TOKEN_VERSION || !body || !signature) return null
  if (!safeEqual(sign(body), signature)) return null

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    )
    if (typeof parsed !== "object" || parsed === null) return null
    const record = parsed as Record<string, unknown>
    if (typeof record.sub !== "string") return null
    if (typeof record.exp !== "number") return null
    if (record.exp < Date.now()) return null
    return {
      sub: record.sub,
      scope: typeof record.scope === "string" ? record.scope : null,
      exp: record.exp,
    }
  } catch {
    return null
  }
}
