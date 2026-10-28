import { NextResponse, type NextRequest } from "next/server"
import { encryptToken } from "@/lib/captcha/crypto"
import { checkRateLimit } from "@/lib/captcha/rate-limit"
import { CUSTOM_TYPES, createChallenge, nextSid } from "@/lib/captcha/generators"
import { CHALLENGE_TTL_MS } from "@/lib/captcha/constants"
import type { CaptchaChallengeType, Difficulty } from "@/lib/captcha/custom-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function readDifficulty(value: string | null): Difficulty {
  switch (value?.toLowerCase()) {
    case "easy":
      return "easy"
    case "medium":
      return "medium"
    case "hard":
      return "hard"
    default:
      return "medium"
  }
}

/**
 * `?type=` yalnızca bilinen değerleri kabul eder; bilinmeyen değerler yok
 * sayılır (görev tipine istemci karar veremez, sadece önerebilir).
 */
function readForcedType(value: string | null): CaptchaChallengeType | undefined {
  if (!value) return undefined
  const allowed: CaptchaChallengeType[] = [
    "default",
    "medium",
    ...CUSTOM_TYPES,
  ]
  return (allowed as string[]).includes(value)
    ? (value as CaptchaChallengeType)
    : undefined
}

export async function GET(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "unknown")
    .split(",")[0]
    .trim()
  if (!checkRateLimit(`captcha:${ip}`, 30, 60_000))
    return NextResponse.json(
      { error: "çok hızlı be hemşerim" },
      { status: 429 }
    )

  const { searchParams } = new URL(req.url)
  const difficulty = readDifficulty(searchParams.get("difficulty"))
  const forcedType = readForcedType(searchParams.get("type"))

  const challenge = createChallenge(difficulty, forcedType)
  const now = Date.now()
  const exp = now + CHALLENGE_TTL_MS

  const token = encryptToken({
    type: challenge.type,
    correct: challenge.correct,
    exp,
    t0: now,
    sid: nextSid(),
  })

  // Doğru cevaplar ASLA istemciye düz gitmez; yalnızca şifreli token'da.
  return NextResponse.json({
    token,
    type: challenge.type,
    prompt: challenge.prompt,
    exp,
    ...(challenge.tiles ? { tiles: challenge.tiles } : {}),
    ...(challenge.customData ? { customData: challenge.customData } : {}),
  })
}
