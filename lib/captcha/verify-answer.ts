import { safeEqual } from "./crypto"
import { LATENT_TOLERANCE, normalizeSet } from "./answers"
import type { CaptchaAnswer, CaptchaChallengeType } from "./custom-types"

/**
 * Sunucu tarafı cevap karşılaştırması.
 *
 * Bu modül `node:crypto` (timing-safe karşılaştırma) kullandığı için YALNIZCA
 * sunucudan import edilmelidir; istemci bileşenleri `isSelectedValidForType`
 * için `./answers` modülünü kullanmalıdır.
 */
export function verifyAnswer(
  type: CaptchaChallengeType,
  expected: CaptchaAnswer,
  actual: CaptchaAnswer
): boolean {
  switch (type) {
    case "default":
    case "medium":
    case "trAIHallucination": {
      if (!Array.isArray(actual) || !Array.isArray(expected)) return false
      return safeEqual([normalizeSet(actual)], [normalizeSet(expected)])
    }
    case "trPromptMaster": {
      if (typeof actual !== "string" || typeof expected !== "string")
        return false
      return safeEqual([actual], [expected])
    }
    case "trLatentSpace": {
      if (typeof actual !== "number" || typeof expected !== "number")
        return false
      // Toleranslı karşılaştırma: zamanlama analizi burada anlamlı değil,
      // çünkü hedef sayısal bir aralıktır.
      return Math.abs(actual - expected) <= LATENT_TOLERANCE
    }
    default:
      return false
  }
}
