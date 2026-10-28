import { NextResponse, type NextRequest } from "next/server"
import { randomInt } from "node:crypto"
import { z } from "zod"
import { decryptToken } from "@/lib/captcha/crypto"
import { checkRateLimit } from "@/lib/captcha/rate-limit"
import {
  canSilentPass,
  isUsed,
  markSilentPass,
  markUsed,
} from "@/lib/captcha/store"
import { isSelectedValidForType } from "@/lib/captcha/answers"
import { verifyAnswer } from "@/lib/captcha/verify-answer"
import { issuePassToken } from "@/lib/captcha/pass-token"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Doğrulama öncesi zorunlu minimum bekleme. */
const MIN_SOLVE_MS = 1000
/** Sessiz geçiş için sayfada geçirilmesi gereken minimum süre. */
const SILENT_DWELL_MS = 2500
/** Sessiz geçişte sunucu tarafındaki kabul oranı: 10'da 4. */
const SILENT_ACCEPT_NUM = 4
const SILENT_ACCEPT_DEN = 10

const Body = z.object({
  token: z.string().min(1).optional(),
  /**
   * Seçim, tipine göre `string[]` (klasik/etiket), `number[]` (halüsinasyon),
   * `string` (prompt) veya `number` (latent space) olabilir. Tip daraltması
   * sunucuda `isSelectedValidForType` ile yapılır.
   */
  selected: z.unknown().optional(),
  t0: z.number().int(),
  honey: z.string().max(200).optional(),
  /** İstemci "sessiz geçiş" kararı verdiğinde true gelir. */
  silent: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "unknown")
    .split(",")[0]
    .trim()
  if (!checkRateLimit(`verify:${ip}`, 30, 60_000))
    return NextResponse.json(
      { ok: false, message: "çok hızlı be hemşerim" },
      { status: 429 }
    )

  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await req.json())
  } catch {
    return NextResponse.json(
      { ok: false, message: "bozuk istek" },
      { status: 400 }
    )
  }

  if (body.honey)
    return NextResponse.json(
      { ok: false, message: "robot kokusu aldım" },
      { status: 400 }
    )

  // Botlar çok kısa sürede istek atamaz
  if (Date.now() - body.t0 < MIN_SOLVE_MS)
    return NextResponse.json(
      { ok: false, message: "acele etme, çayını iç" },
      { status: 400 }
    )

  /* -------------------------- sessiz geçiş yolu -------------------------- */
  /*
   * GÜVENLİK NOTU: İstemcideki `Math.random()` tabanlı sessiz geçiş tek başına
   * güvenlik sağlamaz; bu yalnızca bir kullanıcı deneyimi kısayoludur. Bilet
   * (passToken) bu yüzden sunucu tarafından, aşağıdaki kontrollerden geçtikten
   * sonra imzalanır:
   *   1) IP başına rate limit (yukarıda)
   *   2) honeypot alanı boş
   *   3) gözlenen minimum bekleme ve sayfada geçen süre (>= 2.5 sn)
   *   4) IP başına sessiz geçişler arası cooldown
   *   5) sunucu tarafındaki kriptografik risk kapısı
   * Entegrasyon yapan siteler kullanıcıyı "doğrulanmış" sayıp saymayacağına
   * `verifyPassToken()` ile karar vermelidir.
   */
  if (body.silent) {
    if (Date.now() - body.t0 < SILENT_DWELL_MS)
      return NextResponse.json({
        ok: false,
        reason: "challenge",
        message: "acele etme, çayını iç",
      })
    if (!canSilentPass(ip))
      return NextResponse.json({
        ok: false,
        reason: "challenge",
        message: "çok sık geçiş istedin, bir soru çöz bakalım",
      })
    if (randomInt(SILENT_ACCEPT_DEN) >= SILENT_ACCEPT_NUM)
      return NextResponse.json({
        ok: false,
        reason: "challenge",
        message: "risk skoru yüksek, soruyu çözmen gerekiyor",
      })

    markSilentPass(ip)
    const { passToken } = issuePassToken("trcaptcha", "silent")
    return NextResponse.json({
      ok: true,
      passToken,
      message: "Helal olsun hemşerim! 🫖",
    })
  }

  /* ------------------------------ görev yolu ----------------------------- */

  if (!body.token)
    return NextResponse.json(
      { ok: false, message: "token eksik" },
      { status: 400 }
    )

  const payload = decryptToken(body.token)
  if (!payload)
    return NextResponse.json(
      { ok: false, message: "geçersiz token" },
      { status: 400 }
    )
  if (payload.exp < Date.now())
    return NextResponse.json(
      { ok: false, message: "süre doldu" },
      { status: 400 }
    )
  if (isUsed(payload.sid))
    return NextResponse.json(
      { ok: false, message: "tek kullanımlık" },
      { status: 400 }
    )

  if (!isSelectedValidForType(payload.type, body.selected))
    return NextResponse.json(
      { ok: false, message: "seçim geçersiz" },
      { status: 400 }
    )

  /*
   * Nonce tek kullanımlıklığı: BAŞARILI ya da BAŞARISIZ her denemede token
   * harcanır. Aksi halde aynı token üzerinde farklı seçimler denenerek brute
   * force yapılabilirdi. (Paylaşımlı store gerektirir; bkz. README.)
   */
  markUsed(payload.sid, payload.exp + 60_000)

  if (!verifyAnswer(payload.type, payload.correct, body.selected as never))
    return NextResponse.json({
      ok: false,
      message: "Yanlış be ya, bir çay iç gel 🍵",
    })

  const { passToken } = issuePassToken("trcaptcha", payload.type)
  return NextResponse.json({
    ok: true,
    passToken,
    message: "Helal olsun hemşerim! 🫖",
  })
}
