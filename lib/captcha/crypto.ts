import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"
import type { CaptchaAnswer, CaptchaChallengeType } from "./custom-types"

const TOKEN_KEY = () => {
  const s = process.env.CAPTCHA_SECRET
  if (!s || s.length < 32) throw new Error("CAPTCHA_SECRET must be 32+ chars")
  return Buffer.from(s, "utf8").subarray(0, 32)
}
const IMAGE_KEY = () => {
  const s = process.env.IMAGE_SECRET
  if (!s || s.length < 32) throw new Error("IMAGE_SECRET must be 32+ chars")
  return Buffer.from(s, "utf8").subarray(0, 32)
}

/**
 * Şifreli token içinde taşınan görev bilgisi.
 *
 * `type` hangi görev türünün doğrulandığını, `correct` o türün cevabını taşır
 * (`string[]` / `number[]` / `string` / `number`).
 */
export type CaptchaPayload = {
  sid: string
  type: CaptchaChallengeType
  correct: CaptchaAnswer
  exp: number
  t0: number
}

export function encryptToken(p: CaptchaPayload): string {
  const iv = randomBytes(12)
  const c = createCipheriv("aes-256-gcm", TOKEN_KEY(), iv)
  const enc = Buffer.concat([c.update(JSON.stringify(p), "utf8"), c.final()])
  const tag = c.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString("base64url")
}

export function decryptToken(t: string): CaptchaPayload | null {
  try {
    const b = Buffer.from(t, "base64url")
    const iv = b.subarray(0, 12),
      tag = b.subarray(12, 28),
      enc = b.subarray(28)
    const d = createDecipheriv("aes-256-gcm", TOKEN_KEY(), iv)
    d.setAuthTag(tag)
    const dec = Buffer.concat([d.update(enc), d.final()])
    return JSON.parse(dec.toString("utf8")) as CaptchaPayload
  } catch {
    return null
  }
}

export function signImageId(id: string, bucket: number): string {
  const mac = createHmac("sha256", IMAGE_KEY())
    .update(`${id}.${bucket}`)
    .digest("base64url")
  return `${id}.${bucket}.${mac}`
}

export function verifyImageSignature(signed: string): { id: string } | null {
  const parts = signed.split(".")
  if (parts.length !== 3) return null
  const [id, bucketStr, mac] = parts
  const bucket = Number(bucketStr)
  const current = Math.floor(Date.now() / 86_400_000)
  if (!Number.isFinite(bucket) || bucket < current - 1 || bucket > current + 1)
    return null
  const expected = createHmac("sha256", IMAGE_KEY())
    .update(`${id}.${bucket}`)
    .digest("base64url")
  const a = Buffer.from(mac),
    b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return { id }
}

export function safeEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const A = [...a].sort().join(","),
    B = [...b].sort().join(",")
  const ba = Buffer.from(A),
    bb = Buffer.from(B)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}
