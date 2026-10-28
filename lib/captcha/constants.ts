/**
 * Sunucu ve istemci tarafından paylaşılan sabitler.
 *
 * Bu dosyada `node:crypto` gibi yalnızca sunucuda çalışan importlar BULUNMAZ:
 * aksi halde istemci bundle'ına sızar ve build hatası oluşur (webpack
 * "node:crypto is not handled").
 */

/** Görev cevaplarının geçerli olduğu süre (60 saniye). */
export const CHALLENGE_TTL_MS = 60_000

/** Görsel ızgaralarda gösterilen kare sayısı. */
export const GRID_SIZE = 9

/**
 * Zorluk seviyesine göre "soru sormadan geçme" eşikleri.
 * Zorluk arttıkça sessiz geçiş ihtimali düşer.
 */
export const SILENT_THRESHOLDS = {
  easy: 0.6,
  medium: 0.3,
  hard: 0.1,
} as const

/** Sessiz geçiş için sayfada geçirilmesi gereken minimum süre. */
export const SILENT_DWELL_MS = 2500

export const DIFFICULTY_LABELS = {
  easy: "Kolay",
  medium: "Orta",
  hard: "Zor",
} as const

/**
 * trCAPTCHA sürümü — DOM parmak izi (`data-trcaptcha-version`) ve global JS
 * değişkeni (`window.__TRCAPTCHA__.version`) aynı kaynaktan beslenir.
 */
export const TRCAPTCHA_VERSION = "2.0.0"

/** Sunucu yanıtlarına eklenen teknoloji bildirim header'ı. */
export const TRCAPTCHA_PROTECTED_BY = "trCAPTCHA"

/** Desteklenen özel (AI) görev tipleri — ağ parmak izi olarak da kullanılır. */
export const CUSTOM_CHALLENGE_TYPES = [
  "trAIHallucination",
  "trPromptMaster",
  "trLatentSpace",
] as const
