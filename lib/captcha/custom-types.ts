/**
 * Genişletilmiş CAPTCHA tipleri.
 *
 * `CaptchaAnswer` tek merkezden yönetilir: klasik ızgara için `string[]` (yer id'leri),
 * oyun bazlı görevler için `number[]` / `string` / `number`. `any` kullanılmaz.
 */

export type CaptchaTheme = "dark" | "light"

/** tr-captcha.tsx dışarıdan alan tema modu. */
export type ThemeMode = "dark" | "light" | "glass"

/** BorderBeam renk varyantları. */
export type BeamColor = "colorful" | "ocean" | "sunset" | "mono"

/**
 * BorderBeam boyutu. `border-beam` paketi "lg"i desteklemez; "lg" olarak
 * "md" + genişletilmiş ışıma kullanılır (bkz. challenge-modal.tsx).
 */
export type BeamSize = "sm" | "md" | "lg"

export type Difficulty = "easy" | "medium" | "hard"

/**
 * Sunucu token'ında saklanan cevap. Türü doğrulama sırasında runtime'da
 * daraltılır (bkz. `isCaptchaAnswer`).
 */
export type CaptchaAnswer = number[] | string[] | string | number

export type CustomCaptchaType =
  | "trAIHallucination"
  | "trPromptMaster"
  | "trLatentSpace"

/** `/api/captcha` yanıtındaki görev tipi. */
export type CaptchaChallengeType = "default" | "medium" | CustomCaptchaType

/* ---------------------------------- images --------------------------------- */

export interface CaptchaTileData {
  id: string
  /** `/api/img/<imzali>` — imzalı proxy üzerinden gelir. */
  imageUrl: string
}

export interface CaptchaImageTile {
  src: string
  alt: string
}

/* ------------------------------ AI hallucination ---------------------------- */

export interface AiHallucinationData {
  images: CaptchaImageTile[]
  instruction: string
}

/* -------------------------------- prompt master ---------------------------- */

export type PromptOptionId = "a" | "b" | "c" | "d"

export interface PromptOption {
  id: PromptOptionId
  text: string
}

export interface PromptMasterData {
  targetOutput: string
  options: PromptOption[]
  instruction: string
}

/* -------------------------------- latent space ----------------------------- */

export interface LatentSpaceData {
  startImage: string
  endImage: string
  startLabel: string
  endLabel: string
  /**
   * Kaydırıcının ters yönde çalışıp çalışmadığı. Hedef yüzde burada YOK:
   * yalnızca şifreli token'da bulunur.
   */
  reversed: boolean
  instruction: string
}

export type CaptchaCustomData =
  | AiHallucinationData
  | PromptMasterData
  | LatentSpaceData

/* ------------------------------- payload / API ----------------------------- */

/** `/api/captcha` yanıtı — doğru cevaplar hiçbir zaman burada olmaz. */
export interface CaptchaChallengeResponse {
  token: string
  type: CaptchaChallengeType
  prompt: string
  exp: number
  /** Sadece `default` / `medium` için dolu gelir. */
  tiles?: CaptchaTileData[]
  /** Sadece özel oyun tipleri için dolu gelir. */
  customData?: CaptchaCustomData
}

/** İstemciden gelen ve runtime'da doğrulanacak seçim. */
export type CaptchaSelected = unknown
