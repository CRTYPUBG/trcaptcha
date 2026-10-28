"use client"

import * as React from "react"
import { BorderBeam } from "@/components/ui/border-beam"
import { Loader2, ShieldCheck } from "lucide-react"
import { ConfirmIcon } from "@/components/ui/confirm-icon"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import { ThemeSelector } from "./theme-selector"
import { ChallengeModal } from "./challenge-modal"
import { CHALLENGE_TTL_MS, SILENT_THRESHOLDS, SILENT_DWELL_MS, DIFFICULTY_LABELS, TRCAPTCHA_VERSION } from "@/lib/captcha/constants"
import { isSelectedValidForType } from "@/lib/captcha/answers"
import type {
  BeamColor,
  BeamSize,
  CaptchaAnswer,
  CaptchaChallengeResponse,
  Difficulty,
  ThemeMode,
} from "@/lib/captcha/custom-types"

/**
 * trCAPTCHA — görünmez geçiş + resim/eşleştirme görevi hibrit akışı.
 *
 * State machine:
 *
 *   idle ──tıkla──▶ checking ──risk düşük──▶ success (soru sormaz)
 *                       │
 *                       └──risk yüksek──▶ challenge ──doğru──▶ success
 *                                                   │
 *                                                   └──hatalı──▶ error ──▶ challenge (yeni görev)
 *                                              Zamanlayıcı dolarsa ──▶ sessiz yeni görev
 */
type Status = "idle" | "checking" | "challenge" | "success" | "error"

export interface TrCaptchaProps {
  /** Sağ altta yazacak marka adı. */
  siteName?: string
  /** Sağ üstte gösterilecek logo; yoksa kalkan ikonu. */
  logoUrl?: string
  /** Başlangıç teması (ThemeSelector ile canlı değişebilir). */
  theme?: ThemeMode
  beamColor?: BeamColor
  beamSize?: BeamSize
  /** Buton, tik ve başlık şeridi rengi. */
  accentColor?: string
  /** "Kolay / Orta / Zor" seçici görünsün mü? */
  showDifficultySelector?: boolean
  /** "Light / Dark / Liquid" tema seçici görünsün mü? */
  showThemeSelector?: boolean
  /** Açılıştaki zorluk seviyesi. */
  defaultDifficulty?: Difficulty
  /** Doğrulama sonucu: ikinci argüman sunucu imzalı geçiş biletidir. */
  onVerify?: (ok: boolean, passToken?: string) => void
  /**
   * Dış kapsayıcının HTML `id` değeri. Aynı sayfada birden fazla widget
   * kullanan entegrasyonlar bunu benzersiz yapabilir; varsayılan değer
   * teknoloji tespit parmak iziyle eşleşir (`#trcaptcha-widget`).
   */
  widgetId?: string
}

/** Hata mesajının okunabilir kalma süresi, sonra yeni görev gelir. */
const ERROR_DISPLAY_MS = 1500
/**
 * `/api/verify` ayrıca 1 saniyeden önce gelen istekleri reddeder
 * (botların anında denemesini engeller). İstemci de aynı süre boyunca
 * "DOĞRULA" butonunu kilitli tutar.
 */
const MIN_SOLVE_MS = 1000
/** "checking" gösterim süresi (kullanıcı analizin çalıştığını görsün). */
const CHECK_DELAY_MS = 800
/** `checking`'den önce kutunun içindeki kısa bekleme. */
const SILENT_DISPLAY_MS = 600

/** Sunucu ile aynı kuralı yeniden uygular: boş/uygunsuz seçimde buton pasif. */
function canVerifyChallengeLocal(
  type: CaptchaChallengeResponse["type"],
  selected: CaptchaAnswer | null
): boolean {
  if (selected === null) return false
  return isSelectedValidForType(type, selected)
}

export function TrCaptcha({
  siteName = "trCAPTCHA",
  logoUrl,
  theme: initialTheme = "dark",
  beamColor = "colorful",
  beamSize = "md",
  accentColor = "#47c87c",
  showDifficultySelector = true,
  showThemeSelector = false,
  defaultDifficulty = "medium",
  onVerify,
  widgetId = "trcaptcha-widget",
}: TrCaptchaProps) {
  const [status, setStatus] = React.useState<Status>("idle")
  const [challenge, setChallenge] =
    React.useState<CaptchaChallengeResponse | null>(null)
  const [selected, setSelected] = React.useState<CaptchaAnswer | null>(null)
  const [timeLeft, setTimeLeft] = React.useState(
    Math.floor(CHALLENGE_TTL_MS / 1000)
  )
  const [message, setMessage] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [shakeKey, setShakeKey] = React.useState(0)
  /** Geri sayım tik'leriyle güncellenen "şimdi"; kilidi türetmek için kullanılır. */
  const [now, setNow] = React.useState(() => Date.now())
  const [difficulty, setDifficulty] =
    React.useState<Difficulty>(defaultDifficulty)
  const [themeMode, setThemeMode] = React.useState<ThemeMode>(initialTheme)
  const [honey, setHoney] = React.useState("")

  const mountTime = React.useRef<number>(Date.now())
  const t0Ref = React.useRef<number>(Date.now())
  const sessionRef = React.useRef<number>(0)
  const checkTimerRef = React.useRef<number | null>(null)
  const errorTimerRef = React.useRef<number | null>(null)

  const isGlass = themeMode === "glass"
  const dark = themeMode !== "light"
  const captchaTheme = dark ? "dark" : "light"

  const clearCheckTimer = React.useCallback(() => {
    if (checkTimerRef.current !== null) {
      window.clearTimeout(checkTimerRef.current)
      checkTimerRef.current = null
    }
  }, [])

  const clearErrorTimer = React.useCallback(() => {
    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current)
      errorTimerRef.current = null
    }
  }, [])

  React.useEffect(() => {
    return () => {
      clearCheckTimer()
      clearErrorTimer()
    }
  }, [clearCheckTimer, clearErrorTimer])

  /* ------------------------------- görev çekme ------------------------------ */

  /**
   * Yeni görev + yeni token getirir. Hata anında da çağrılır; eski içeriğin
   * ekranda kalmasını istemediğimiz için mevcut görev önce temizlenir.
   *
   * @param forceType Hata sonrası aynı mekanikten yeni soru istemek için.
   */
  const fetchChallenge = React.useCallback(
    async (forceType?: string) => {
      setLoading(true)
      setChallenge(null)
      setSelected(null)
      clearErrorTimer()

      try {
        const params = new URLSearchParams({ difficulty })
        if (forceType) params.set("type", forceType)
        const res = await fetch(`/api/captcha?${params.toString()}`, {
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`HTTP_${res.status}`)
        const json = (await res.json()) as CaptchaChallengeResponse

        t0Ref.current = Date.now()
        setChallenge(json)
        setTimeLeft(Math.floor(CHALLENGE_TTL_MS / 1000))
        setMessage("")
        setShakeKey(0)
        setStatus("challenge")
      } catch (err) {
        console.error("fetch captcha error:", err)
        setShakeKey(0)
        setMessage("Yüklenemedi, lütfen tekrar deneyin.")
        setStatus("challenge")
      } finally {
        setLoading(false)
      }
    },
    [difficulty, clearErrorTimer]
  )

  /* ------------------------------ geri sayım ------------------------------- */

  /*
   * Geri sayım sunucunun ürettiği `exp` değerine dayanır. Böylece istemci ve
   * sunucu aynı süreyi görür ve sayaç elle bozulmaz. Interval kimliği yerel
   * bir değişkende tutulur: başka hiçbir kod yolu onu temizleyemez.
   */
  React.useEffect(() => {
    if (status !== "challenge" || challenge === null) return

    const deadline = challenge.exp
    const total = Math.floor(CHALLENGE_TTL_MS / 1000)

    const tick = () => {
      const now = Date.now()
      setNow(now)
      const left = Math.max(0, Math.ceil((deadline - now) / 1000))
      setTimeLeft(left > total ? total : left)
      if (left <= 0) {
        // Süre dolunca hata vermeden sessizce yeni görev
        window.clearInterval(id)
        void fetchChallenge()
      }
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [status, challenge, fetchChallenge])

  /*
   * Minimum çözüm süresi: ayrı bir zamanlayıcı tutmak yerine `now` ile
   * türetilir. Böylece efekt yeniden çalışsa bile kilit sıfırlanmaz.
   * (/api/verify de 1 saniyeden önceki istekleri reddeder.)
   */
  const solveGateOpen = now - t0Ref.current >= MIN_SOLVE_MS

  /* --------------------------------- akış --------------------------------- */

  const openChallenge = React.useCallback(
    async (forceType?: string) => {
      setStatus("checking")
      clearCheckTimer()
      await new Promise((resolve) => window.setTimeout(resolve, CHECK_DELAY_MS))
      await fetchChallenge(forceType)
    },
    [clearCheckTimer, fetchChallenge]
  )

  const verifySilent = React.useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ silent: true, t0: mountTime.current, honey }),
      })
      const json = (await res.json()) as {
        ok: boolean
        passToken?: string
        message?: string
        reason?: string
      }
      if (json.ok) {
        setStatus("success")
        setMessage("")
        setChallenge(null)
        onVerify?.(true, json.passToken)
        return true
      }
      /*
       * Sunucu reddetti (çok hızlı tıklama, risk kapısı veya cooldown) veya
       * ağ hatası oldu. Güvenli taraf olan görev yoluna düşülür: kullanıcı
       * "boşuna tıkladım" hissine kapılmadan resim sorusunu görür.
       */
      await openChallenge()
      return false
    } catch (err) {
      console.error("silent verify error:", err)
      // Hata da güvenli tarafa: görev aç
      await openChallenge()
      return false
    }
  }, [honey, onVerify, openChallenge])

  const handleCheckboxClick = React.useCallback(async () => {
    if (status !== "idle") return
    setStatus("checking")
    setMessage("")

    const dwell = Date.now() - mountTime.current
    const risk = Math.random()

    /*
     * Sessiz geçiş: sayfada yeterince süre geçirmiş ve risk skoru düşükse soru
     * sorulmaz. GÜVENLİK: bu karar istemcidir; asıl doğrulama sunucuda
     * yapılır ve bilet (passToken) yalnızca kontrolleri geçen isteğe verilir.
     * Zorluk arttıkça "soru sormadan geçme" ihtimali düşer.
     */
    const threshold = SILENT_THRESHOLDS[difficulty]
    if (dwell > SILENT_DWELL_MS && risk < threshold) {
      clearCheckTimer()
      checkTimerRef.current = window.setTimeout(async () => {
        await verifySilent()
      }, SILENT_DISPLAY_MS)
      return
    }

    await openChallenge()
  }, [
    status,
    difficulty,
    clearCheckTimer,
    verifySilent,
    openChallenge,
  ])

  const handleVerify = React.useCallback(async () => {
    if (!challenge || selected === null || verifying) return
    // Boş seçimle doğrulamaya izin verilmez
    if (!canVerifyChallengeLocal(challenge.type, selected)) return

    const session = sessionRef.current
    const token = challenge.token
    setVerifying(true)

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          selected,
          t0: t0Ref.current,
          honey,
        }),
      })
      if (session !== sessionRef.current) return
      const json = (await res.json()) as {
        ok: boolean
        passToken?: string
        message?: string
      }

      if (json.ok) {
        setStatus("success")
        setMessage("")
        setChallenge(null)
        setSelected(null)
        setShakeKey(0)
        onVerify?.(true, json.passToken)
      } else {
        /*
         * HATA: sallanma + kırmızı mesaj. Eski görev ANINDA kaldırılır,
         * yerine iskelet gövde görünür; 1.5 sn sonra aynı mekanikten yeni
         * token + yepyeni içerik yüklenir. Aynı görev asla tekrar gösterilmez.
         */
        setStatus("error")
        setMessage(json.message || "Lütfen tüm eşleşen resimleri seçin.")
        setShakeKey((k) => k + 1)
        setVerifying(false)
        setChallenge(null)
        setSelected(null)
        onVerify?.(false)

        clearErrorTimer()
        errorTimerRef.current = window.setTimeout(() => {
          void fetchChallenge(failedType(challenge.type))
        }, ERROR_DISPLAY_MS)
      }
    } catch (err) {
      if (session !== sessionRef.current) return
      console.error("verify error:", err)
      setStatus("error")
      setMessage("Bağlantı hatası.")
      setShakeKey((k) => k + 1)
      setVerifying(false)
      setChallenge(null)
      setSelected(null)
      onVerify?.(false)

      clearErrorTimer()
      errorTimerRef.current = window.setTimeout(() => {
        void fetchChallenge(failedType(challenge.type))
      }, ERROR_DISPLAY_MS)
    }
  }, [
    challenge,
    selected,
    verifying,
    honey,
    onVerify,
    clearErrorTimer,
    fetchChallenge,
  ])

  const closeModal = React.useCallback(() => {
    sessionRef.current += 1
    clearCheckTimer()
    clearErrorTimer()
    setChallenge(null)
    setSelected(null)
    setVerifying(false)
    setMessage("")
    setStatus("idle")
  }, [clearCheckTimer, clearErrorTimer])

  // Modal açıkken sayfa kaydırmasını kilitle + ESC ile kapat
  const modalOpen = status === "challenge" || status === "error"

  React.useEffect(() => {
    if (!modalOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [modalOpen, closeModal])

  /* --------------------------------- render -------------------------------- */

  /*
   * Hem düz panel hem cam (LiquidGlass) modu aynı erişilebilirlik davranışını
   * paylaşır: checkbox rolü, aria bilgisi, klavye ile Enter/Space tetikleme.
   */
  const boxA11y = {
    role: "checkbox" as const,
    "aria-checked": status === "success",
    "aria-label":
      status === "success" ? "Doğrulandı" : "Ben robot değilim",
    tabIndex: status === "idle" ? 0 : -1,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation()
      void handleCheckboxClick()
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        void handleCheckboxClick()
      }
    },
  }

  const panelClass = isGlass
    ? ""
    : dark
      ? "bg-[#1d1d1d] text-white"
      : "bg-white text-black"

  const boxInner = (
    <>
      <div className="flex items-center gap-3">
        {status === "success" ? (
          <span
            className="grid h-7 w-7 place-items-center rounded-full"
            style={{ backgroundColor: `${accentColor}33`, color: accentColor }}
          >
            <ConfirmIcon size={22} />
          </span>
        ) : status === "checking" ? (
          <Loader2 size={24} className="animate-spin text-zinc-400" />
        ) : (
          <span
            className={
              dark ? "h-6 w-6 rounded border-2 border-zinc-500" : "h-6 w-6 rounded border-2 border-zinc-400"
            }
          />
        )}

        <div className="flex flex-col">
          <span className="text-[15px] font-medium leading-tight">
            {status === "success"
              ? "Helal olsun hemşerim! \uD83E\uDED6"
              : "Ben robot de\u011filim"}
          </span>
          <span
            className={
              dark ? "text-[11px] text-zinc-500" : "text-[11px] text-zinc-400"
            }
          >
            {siteName}
          </span>
        </div>
      </div>

      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          aria-hidden="true"
          className="h-9 w-9 object-contain opacity-70"
        />
      ) : (
        <ShieldCheck size={28} className="opacity-50" aria-hidden="true" />
      )}
    </>
  )

  return (
    /*
     * Teknoloji tespit parmak izleri (Wappalyzer):
     *   - `data-trcaptcha` / `data-trcaptcha-version`
     *   - `id="trcaptcha-widget"`
     *   - `.tr-captcha-container`
     * Bunlar yalnızca "hangi teknoloji" bilgisini taşır; güvenlik verisi
     * (doğru cevaplar, token'lar) burada ASLA bulunmaz.
     */
    <div
      id={widgetId}
      data-trcaptcha="true"
      data-trcaptcha-version={TRCAPTCHA_VERSION}
      className="tr-captcha-container flex w-full flex-col items-center gap-3"
    >
      {/* Zorluk seçici (idle durumunda) */}
      {showDifficultySelector && status === "idle" && (
        <div
          className={
            dark
              ? "flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1"
              : "flex items-center gap-1 rounded-lg border border-black/10 bg-white/70 p-1"
          }
        >
          {(["easy", "medium", "hard"] as const).map((level) => {
            const active = difficulty === level
            return (
              <button
                key={level}
                type="button"
                aria-pressed={active}
                onClick={() => setDifficulty(level)}
                style={
                  active
                    ? {
                        backgroundColor: `${accentColor}22`,
                        color: accentColor,
                      }
                    : undefined
                }
                className={
                  active
                    ? "rounded-md px-3 py-1 text-xs font-medium transition-colors"
                    : dark
                      ? "rounded-md px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
                      : "rounded-md px-3 py-1 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-700"
                }
              >
                {DIFFICULTY_LABELS[level]}
              </button>
            )
          })}
        </div>
      )}

      {/* Tema seçici */}
      {showThemeSelector && status === "idle" && (
        <ThemeSelector
          currentTheme={themeMode}
          onThemeChange={setThemeMode}
          accentColor={accentColor}
        />
      )}

      {/* Honeypot: ekran dışı alan, botlar doldurur */}
      <input
        type="text"
        name="honey"
        value={honey}
        onChange={(e) => setHoney(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          opacity: 0,
          width: 1,
          height: 1,
        }}
      />

      {/* ANA KUTU */}
      {!modalOpen && (
        <BorderBeam
          size={beamSize === "sm" ? "sm" : "md"}
          colorVariant={beamColor}
          theme={dark ? "dark" : "light"}
          glowSize={beamSize === "lg" ? 1.9 : beamSize === "sm" ? 0.7 : 1}
          className="w-full max-w-[330px]"
        >
          {isGlass ? (
            <LiquidGlass
              {...boxA11y}
              appearance={dark ? "dark" : "light"}
              material="clear"
              interactive
              rounded="rounded-xl"
              className="flex h-[78px] w-full items-center justify-between p-4 select-none"
            >
              {boxInner}
            </LiquidGlass>
          ) : (
            <div
              {...boxA11y}
              className={`relative flex h-[78px] w-full items-center justify-between rounded-xl p-4 select-none transition-colors ${
                status === "idle" ? "cursor-pointer" : "cursor-default"
              } ${panelClass}`}
            >
              {boxInner}
            </div>
          )}
        </BorderBeam>
      )}

      {/* MODAL */}
      <ChallengeModal
        open={modalOpen}
        challenge={challenge}
        selected={selected}
        loading={loading}
        verifying={verifying}
        canVerify={
          selected !== null &&
          canVerifyChallengeLocal(
            challenge?.type ?? "default",
            selected
          ) &&
          solveGateOpen &&
          !loading
        }
        timeLeft={timeLeft}
        message={message}
        shakeKey={shakeKey}
        accentColor={accentColor}
        theme={captchaTheme}
        beamColor={beamColor}
        beamSize={beamSize}
        onSelectedChange={setSelected}
        onRefresh={() => void fetchChallenge()}
        onVerify={handleVerify}
        onClose={closeModal}
      />
    </div>
  )
}

/* --------------------------------- yardımcı -------------------------------- */

/**
 * Hata sonrası aynı mekanikten yeni görev istenir. `undefined` gönderilirse
 * sunucu zorluğa göre serbestçe seçer.
 */
function failedType(type: CaptchaChallengeResponse["type"]): string {
  return type
}
