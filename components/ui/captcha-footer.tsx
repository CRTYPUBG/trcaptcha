"use client"

import * as React from "react"
import { Headphones, Info, RotateCw } from "lucide-react"
import type { CaptchaTheme } from "@/lib/captcha/custom-types"
import { cn } from "@/lib/utils"

export interface CaptchaFooterProps {
  /** Yeni görev çeker. */
  onRefresh: () => void
  /** Doğrulama isteği atar. */
  onVerify: () => void
  /** Doğrulama sürerken buton kilitli. */
  isVerifying: boolean
  /** Boş/geçersiz seçimde "DOĞRULA" pasif. */
  canVerify: boolean
  /** Buton ve tiklerin rengi. */
  accentColor: string
  theme: CaptchaTheme
  /** Yardım paneli ve sesli okuma için görev metni. */
  prompt: string
  /** Yardım metninin göreve özel kısmı. */
  hint: string
}

/**
 * Modalın alt barı: solda yenile / ses / yardım ikonları, sağda
 * `accentColor` arka planlı "DOĞRULA" butonu.
 *
 * Hem klasik ızgara hem de özel oyun tipleri için TEK ortak bardır (spec:
 * "Custom oyunlarda DOĞRULA butonu modal alt barında ortak olsun").
 */
export function CaptchaFooter({
  onRefresh,
  onVerify,
  isVerifying,
  canVerify,
  accentColor,
  theme,
  prompt,
  hint,
}: CaptchaFooterProps) {
  const [showHelp, setShowHelp] = React.useState(false)
  const [speaking, setSpeaking] = React.useState(false)

  const toggleSpeech = React.useCallback(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null
    if (!synth) return
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(`${prompt} ${hint}`)
    utterance.lang = "tr-TR"
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    synth.speak(utterance)
    setSpeaking(true)
  }, [prompt, hint, speaking])

  const dark = theme === "dark"
  const barBg = dark ? "bg-[#1d1d1d]" : "bg-white"

  return (
    <div className="shrink-0">
      {showHelp && (
        <p
          className={cn(
            "border-t border-white/10 px-3 py-2 text-xs leading-relaxed",
            dark
              ? "bg-[#1d1d1d] text-zinc-400"
              : "bg-white text-zinc-600"
          )}
        >
          {prompt} {hint}
        </p>
      )}

      <div
        className={cn(
          "flex items-center justify-between border-t border-white/10 p-3",
          barBg
        )}
      >
        <div
          className={cn(
            "flex items-center gap-4",
            dark ? "text-zinc-400" : "text-zinc-500"
          )}
        >
          <button
            type="button"
            onClick={onRefresh}
            disabled={isVerifying}
            aria-label="Yeni soru yükle"
            title="Yeni soru yükle"
            className={cn(
              "transition-colors disabled:opacity-40",
              dark ? "hover:text-white" : "hover:text-zinc-900"
            )}
          >
            <RotateCw size={20} />
          </button>
          <button
            type="button"
            onClick={toggleSpeech}
            aria-label={speaking ? "Sesli okumayı durdur" : "Soruyu sesli oku"}
            aria-pressed={speaking}
            title={speaking ? "Sesli okumayı durdur" : "Soruyu sesli oku"}
            className={cn(
              "transition-colors",
              dark ? "hover:text-white" : "hover:text-zinc-900",
              speaking && (dark ? "text-white" : "text-zinc-900")
            )}
          >
            <Headphones size={20} />
          </button>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-label="Yardım"
            aria-pressed={showHelp}
            title="Yardım"
            className={cn(
              "transition-colors",
              dark ? "hover:text-white" : "hover:text-zinc-900",
              showHelp && (dark ? "text-white" : "text-zinc-900")
            )}
          >
            <Info size={20} />
          </button>
        </div>

        <button
          type="button"
          onClick={onVerify}
          disabled={isVerifying || !canVerify}
          className="rounded-md px-6 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {isVerifying ? "..." : "DOĞRULA"}
        </button>
      </div>
    </div>
  )
}
