import { randomInt as nodeRandomInt, randomUUID } from "node:crypto"
import { CHALLENGE_TTL_MS, GRID_SIZE } from "./constants"
import { signImageId } from "./crypto"
import { getAllPlaces, type Place } from "./places"
import type {
  AiHallucinationData,
  CaptchaAnswer,
  CaptchaChallengeType,
  CaptchaCustomData,
  CaptchaImageTile,
  CaptchaTileData,
  Difficulty,
  LatentSpaceData,
  PromptMasterData,
  PromptOption,
  PromptOptionId,
} from "./custom-types"

/** Özel (AI) oyun tipleri. */
export const CUSTOM_TYPES: CaptchaChallengeType[] = [
  "trAIHallucination",
  "trPromptMaster",
  "trLatentSpace",
]

/* --------------------------------- yardımcı -------------------------------- */

/** Kriptografik rastgele sayı — `Math.random()` botlar için tahmin edilebilir. */
export function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error("maxExclusive pozitif olmalıdır.")
  return nodeRandomInt(maxExclusive)
}

/** Fisher-Yates karıştırma (kriptografik kaynaklı). */
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(arr.length)]
}

/** Kısa süre önce kullanılan etiketleri tutar; art arda aynı etiket gelmesin. */
const recentTags: string[] = []
const RECENT_TAG_LIMIT = 4

function rememberTag(tag: string): void {
  recentTags.push(tag)
  if (recentTags.length > RECENT_TAG_LIMIT) recentTags.shift()
}

/* ------------------------------ görev tanımları ----------------------------- */

export interface ChallengeDefinition {
  type: CaptchaChallengeType
  prompt: string
  /** Doğru cevap — istemciye ASLA gönderilmez. */
  correct: CaptchaAnswer
  tiles?: CaptchaTileData[]
  customData?: CaptchaCustomData
}

function toTiles(places: Place[]): CaptchaTileData[] {
  const bucket = Math.floor(Date.now() / 86_400_000)
  return places.map((p) => ({
    id: p.id,
    imageUrl: `/api/img/${signImageId(p.id, bucket)}`,
  }))
}

/* --------------------------- 1) Klasik (easy) görev ------------------------- */

/**
 * Tek doğru cevaplı klasik görev. Üç alt tipi rastgele seçilir:
 * yer bulma, "Türkiye'de olmayan" ve bölge eşleştirme.
 */
function createClassic(): ChallengeDefinition {
  const all = getAllPlaces()
  const tr = all.filter((p) => p.isTurkish)
  const fr = all.filter((p) => !p.isTurkish)

  const kind = randomInt(3)

  if (kind === 0) {
    const target = pick(tr)
    const tiles = shuffle([
      target,
      ...shuffle(tr.filter((p) => p.id !== target.id)).slice(
        0,
        GRID_SIZE - 1
      ),
    ])
    return {
      type: "default",
      prompt: `${target.name} olan kareyi seç`,
      correct: [target.id],
      tiles: toTiles(tiles),
    }
  }

  if (kind === 1 && fr.length > 0) {
    const outlier = pick(fr)
    const tiles = shuffle([
      outlier,
      ...shuffle(tr).slice(0, GRID_SIZE - 1),
    ])
    return {
      type: "default",
      prompt: "Türkiye'de olmayan kareyi seç",
      correct: [outlier.id],
      tiles: toTiles(tiles),
    }
  }

  const regions = Array.from(new Set(tr.map((p) => p.region)))
  const region = pick(regions)
  const inRegion = shuffle(tr.filter((p) => p.region === region)).slice(
    0,
    Math.min(3, tr.filter((p) => p.region === region).length)
  )
  const outRegion = shuffle(
    tr.filter((p) => p.region !== region)
  ).slice(0, GRID_SIZE - inRegion.length)
  return {
    type: "default",
    prompt: `${region} bölgesinden olan kareleri seç`,
    correct: inRegion.map((p) => p.id),
    tiles: toTiles(shuffle([...inRegion, ...outRegion])),
  }
}

/* ---------------------------- 2) Etiket (medium) ---------------------------- */

/**
 * Veri setindeki `tags` alanından beslenen görev. 9 kareden 2-3'ü etiketi taşır.
 */
function createTagBased(): ChallengeDefinition | null {
  const all = getAllPlaces()
  const tr = all.filter((p) => p.isTurkish)
  if (tr.length === 0) return null

  // Etiket -> kareler
  const byTag = new Map<string, Place[]>()
  for (const place of tr) {
    for (const tag of place.tags) {
      const list = byTag.get(tag)
      if (list) list.push(place)
      else byTag.set(tag, [place])
    }
  }

  // En az 2, en fazla 3 doğru cevap üretebilen etiketler
  const usable = [...byTag.entries()].filter(
    ([, places]) => places.length >= 2 && places.length <= 4
  )
  if (usable.length === 0) return null

  const fresh = usable.filter(([tag]) => !recentTags.includes(tag))
  const [tag, holders] = pick(fresh.length > 0 ? fresh : usable)
  rememberTag(tag)

  const wanted = randomInt(2) === 0 ? 2 : 3
  const correct = Math.min(wanted, holders.length)
  const correctPlaces = shuffle(holders).slice(0, correct)
  const fillers = shuffle(tr.filter((p) => !holders.includes(p))).slice(
    0,
    GRID_SIZE - correct
  )

  return {
    type: "medium",
    prompt: `İçinde ${tag} olan tüm kareleri seçin`,
    correct: correctPlaces.map((p) => p.id),
    tiles: toTiles(shuffle([...correctPlaces, ...fillers])),
  }
}

/* ------------------------- 3) Özel (AI) oyun tipleri ------------------------ */

/**
 * Halüsinasyon görevinde kullanılan görseller.
 *
 * ÖNEMLİ: `alt` metinleri bilerek nötrdür. Açıklayıcı alt yazıları
 * ("anlamsız yazılı tabela", "havada duran fincan") hangi karelerin cevap
 * olduğunu açıkça sızdırır ve botların görsel yerine metinden kazanmasına
 * yol açar.
 */
const HALLUCINATION_IMAGES: CaptchaImageTile[] = [
  { src: "/captcha/ai-hallucination/cat.svg", alt: "Kare 1" },
  { src: "/captcha/ai-hallucination/six-finger-hand.svg", alt: "Kare 2" },
  { src: "/captcha/ai-hallucination/mug-on-table.svg", alt: "Kare 3" },
  { src: "/captcha/ai-hallucination/floating-mug.svg", alt: "Kare 4" },
  { src: "/captcha/ai-hallucination/red-car.svg", alt: "Kare 5" },
  { src: "/captcha/ai-hallucination/mountain.svg", alt: "Kare 6" },
  { src: "/captcha/ai-hallucination/gibberish-sign.svg", alt: "Kare 7" },
  { src: "/captcha/ai-hallucination/dog.svg", alt: "Kare 8" },
  { src: "/captcha/ai-hallucination/tree.svg", alt: "Kare 9" },
]

/** Yapay zekanın "saçmaladığı" karelerin indeksleri (6 parmak, uçan fincan, saçma tabela). */
const HALLUCINATION_CORRECT = [1, 3, 6]

interface PromptChallenge {
  data: Omit<PromptMasterData, "instruction">
  answer: PromptOptionId
}

/** Prompt uzmanı havuzu. */
const PROMPT_CHALLENGES: PromptChallenge[] = [
  {
    data: {
      targetOutput:
        "Önden üç çeyrek açıyla görünen, kırmızı, iki kapılı spor otomobil illüstrasyonu.",
      options: [
        { id: "a", text: "Bana bir araba çiz." },
        { id: "b", text: "Mavi bir kamyonu yandan göster." },
        {
          id: "c",
          text: "Önden üç çeyrek açıyla görünen, kırmızı, iki kapılı bir spor otomobil illüstrasyonu oluştur.",
        },
        { id: "d", text: "Hızlı araçlarla ilgili bir paragraf yaz." },
      ],
    },
    answer: "c",
  },
  {
    data: {
      targetOutput:
        "Gün batımında, mor ve turuncu tonlarda, dağların üzerinde uçan küçük bir kâğıt uçak illüstrasyonu.",
      options: [
        { id: "a", text: "Bir uçak resmi yap." },
        {
          id: "b",
          text: "Gün batımında dağların üstünde uçan küçük bir kâğıt uçağı mor ve turuncu paletle resmet.",
        },
        { id: "c", text: "Bir dağ fotoğrafı göster." },
        { id: "d", text: "Turuncu renk nedir, açıkla." },
      ],
    },
    answer: "b",
  },
  {
    data: {
      targetOutput:
        "Beyaz keten üzerine dizilmiş, üzerinde köpüğü olan sıcak Türk kahvesi fincanı, samimi sıcak ışık.",
      options: [
        { id: "a", text: "Bir fincan çiz." },
        {
          id: "b",
          text: "Beyaz keten üzerinde, köpüklü, sıcak bir Türk kahvesi fincanı oluştur; samimi sıcak ışık kullan.",
        },
        { id: "c", text: "Kahve nasıl yapılır yaz." },
        { id: "d", text: "Soğuk bir kahve reklamı hazırla." },
      ],
    },
    answer: "b",
  },
  {
    data: {
      targetOutput:
        "Sis içinde, iki minareli, göbeği mavi çinili tarihi bir cami, geniş açıdan fotoğraf gerçekçiliğinde.",
      options: [
        { id: "a", text: "Bir cami çiz." },
        { id: "b", text: "İstanbul'da bir sokak göster." },
        {
          id: "c",
          text: "Sis içinde, iki minareli, göbeği mavi çinili tarihi bir camiyi geniş açıdan fotoğraf gerçekçiliğinde oluştur.",
        },
        { id: "d", text: "Mavi çini hakkında bir yazı yaz." },
      ],
    },
    answer: "c",
  },
  {
    data: {
      targetOutput:
        "Kürk mantolu, kısa bacaklı, karlı bir tundada yürüyen erkek bir kurt, belgesel tarzı.",
      options: [
        { id: "a", text: "Bir hayvan resmi yap." },
        { id: "b", text: "Kar yağıyor bir sahne çiz." },
        {
          id: "c",
          text: "Kürk mantolu, kısa bacaklı, karlı bir tundada yürüyen erkek bir kurdun belgesel tarzı fotoğrafını oluştur.",
        },
        { id: "d", text: "Kurt ne yer yaz." },
      ],
    },
    answer: "c",
  },
  {
    data: {
      targetOutput:
        "Turuncu ışıklarla aydınlanmış, yağmurdan ıslak asfaltın yansımasını yansıtan gece şehir sokağı, sinematik.",
      options: [
        { id: "a", text: "Gece bir şehir göster." },
        { id: "b", text: "Sokak lambası çiz." },
        {
          id: "c",
          text: "Turuncu ışıklarla aydınlanmış, yağmurdan ıslak asfalttaki yansımalarla birlikte gece şehir sokağını sinematik tarzda oluştur.",
        },
        { id: "d", text: "Yağmurun sesini tarif et." },
      ],
    },
    answer: "c",
  },
]

/** Latent space görevinde kullanılan görsel çiftleri. */
const LATENT_PAIRS: Array<{
  start: { src: string; label: string }
  end: { src: string; label: string }
}> = [
  {
    start: { src: "/captcha/latent/cat.svg", label: "Kedi" },
    end: { src: "/captcha/latent/dog.svg", label: "Köpek" },
  },
  {
    start: { src: "/captcha/latent/mountain.svg", label: "Dağ" },
    end: { src: "/captcha/latent/red-car.svg", label: "Kırmızı otomobil" },
  },
]

function createAiHallucination(): ChallengeDefinition {
  const data: AiHallucinationData = {
    images: HALLUCINATION_IMAGES.map((image) => ({ ...image })),
    instruction: "Yapay zekanın saçmaladığı tüm kareleri seçin.",
  }
  return {
    type: "trAIHallucination",
    prompt: data.instruction,
    correct: [...HALLUCINATION_CORRECT],
    customData: data,
  }
}

function createPromptMaster(): ChallengeDefinition {
  const challenge = pick(PROMPT_CHALLENGES)
  const ids: PromptOptionId[] = ["a", "b", "c", "d"]
  const shuffled: PromptOption[] = shuffle(challenge.data.options).map(
    (option, index) => ({ id: ids[index], text: option.text })
  )
  const data: PromptMasterData = {
    targetOutput: challenge.data.targetOutput,
    options: shuffled,
    instruction: "Hangi prompt bu çıktıyı üretir?",
  }
  const correct: CaptchaAnswer =
    shuffled.find((option) => option.text ===
      challenge.data.options.find((o) => o.id === challenge.answer)?.text
    )?.id ?? "a"

  return {
    type: "trPromptMaster",
    prompt: data.instruction,
    correct,
    customData: data,
  }
}

function createLatentSpace(): ChallengeDefinition {
  const pair = pick(LATENT_PAIRS)
  const reversed = randomInt(2) === 0
  // 15..85 arası, 5'in katı — rastgele olmayan adımlarla tahmin edilmesi zorlaşır.
  const targetPercent = 15 + randomInt(15) * 5

  const data: LatentSpaceData = {
    startImage: pair.start.src,
    endImage: pair.end.src,
    startLabel: pair.start.label,
    endLabel: pair.end.label,
    reversed,
    instruction: "Kaydırıcıyı iki görsel arasındaki geçişin tam noktasına getirin.",
  }

  return {
    type: "trLatentSpace",
    prompt: data.instruction,
    correct: targetPercent,
    customData: data,
  }
}

function createCustom(type: CaptchaChallengeType): ChallengeDefinition {
  switch (type) {
    case "trAIHallucination":
      return createAiHallucination()
    case "trPromptMaster":
      return createPromptMaster()
    case "trLatentSpace":
      return createLatentSpace()
    default:
      return createAiHallucination()
  }
}

/* --------------------------------- seçici ---------------------------------- */

/**
 * Zorluğa ve isteğe bağlı zorlanmış tipe göre görev üretir.
 *
 * - `easy`  → tek doğru cevaplı klasık ızgara
 * - `medium`→ etiket tabanlı ızgara (2-3 doğru)
 * - `hard`  → özel (AI) oyun tipi
 * - `easy` / `medium` → %30 ihtimalle de özel oyun tipi
 */
export function createChallenge(
  difficulty: Difficulty,
  forcedType?: CaptchaChallengeType
): ChallengeDefinition {
  const level: Difficulty =
    difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
      ? difficulty
      : "medium"

  // Geçerli özel bir tip zorlanmışsa direkt onu üret
  if (forcedType && CUSTOM_TYPES.includes(forcedType)) {
    return createCustom(forcedType)
  }
  if (forcedType === "default" || forcedType === "medium") {
    return forcedType === "medium"
      ? createTagBased() ?? createClassic()
      : createClassic()
  }

  const wantsCustom = level === "hard" || randomInt(10) < 3
  if (wantsCustom) return createCustom(pick(CUSTOM_TYPES))

  if (level === "medium") return createTagBased() ?? createClassic()
  return createClassic()
}

/** Yeni tek kullanımlık görev kimliği. */
export function nextSid(): string {
  return randomUUID()
}
