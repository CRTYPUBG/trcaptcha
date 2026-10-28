import type { CaptchaAnswer, CaptchaChallengeType } from "./custom-types"

/** Latent space görevinde kabul edilen tolerans (yüzde puanı). */
export const LATENT_TOLERANCE = 5

/**
 * İstemciden gelen seçimin tipine göre geçerli olup olmadığını runtime'da
 * doğrular. Zod şeması "her tip" için tek tip kullanamayacağı için burada
 * manuel daraltma yapılır (unknown → bilinen tip).
 *
 * Bu modül YALNIZCA saf JavaScript içerir; istemci bileşenleri de güvenle
 * import edebilir (sunucu tarafındaki karşılaştırma ayrı dosyadadır).
 */
export function isSelectedValidForType(
  type: CaptchaChallengeType,
  value: unknown
): value is CaptchaAnswer {
  switch (type) {
    case "default":
    case "medium":
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.length <= 9 &&
        value.every(
          (v) => typeof v === "string" && v.length > 0 && v.length < 64
        )
      )
    case "trAIHallucination":
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.length <= 9 &&
        value.every(
          (v) =>
            typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 9
        )
      )
    case "trPromptMaster":
      return typeof value === "string" && ["a", "b", "c", "d"].includes(value)
    case "trLatentSpace":
      return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
      )
    default:
      return false
  }
}

/**
 * İki diziyi sırasız, tekrarsız küme olarak karşılaştırır ve karşılaştırma
 * öncesi normalize edilmiş tek bir diziye indirger. Sunucu tarafında bu
 * normalizasyon, zamanlama sabit karşılaştırmaya verilir (bkz. verify-answer).
 */
export function normalizeSet(values: readonly unknown[]): string {
  return [...values]
    .map((v) => String(v))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .join(",")
}
