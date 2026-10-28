"use client"

import * as React from "react"
import { BorderBeam } from "@/components/ui/border-beam"
import { ChallengeBody } from "./challenge-body"
import { cn } from "@/lib/utils"
import type {
  BeamColor,
  BeamSize,
  CaptchaAnswer,
  CaptchaChallengeResponse,
  CaptchaTheme,
} from "@/lib/captcha/custom-types"

export interface ChallengeModalProps {
  open: boolean
  challenge: CaptchaChallengeResponse | null
  selected: CaptchaAnswer | null
  /** Yeni görev yüklenirken eski içerği göstermeyi engeller. */
  loading: boolean
  verifying: boolean
  canVerify: boolean
  timeLeft: number
  message: string
  /** Sallanma animasyonunu yeniden tetiklemek için her hatada artar. */
  shakeKey: number
  accentColor: string
  theme: CaptchaTheme
  beamColor: BeamColor
  beamSize: BeamSize
  onSelectedChange: (value: CaptchaAnswer) => void
  onRefresh: () => void
  onVerify: () => void
  onClose: () => void
}

/** Yüklenirken gösterilen 9 iskelet kare. */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 gap-1 bg-black/20 p-1" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse bg-white/10" />
      ))}
    </div>
  )
}

export function ChallengeModal({
  open,
  challenge,
  selected,
  loading,
  verifying,
  canVerify,
  timeLeft,
  message,
  shakeKey,
  accentColor,
  theme,
  beamColor,
  beamSize,
  onSelectedChange,
  onRefresh,
  onVerify,
  onClose,
}: ChallengeModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
  }, [open])

  if (!open) return null

  const dark = theme === "dark"
  const showBody = !loading && challenge !== null
  const isError = shakeKey > 0 && message.length > 0

  // "lg" daha geniş ışıma ile taklit edilir (paket "lg" boyutunu desteklemez).
  const packageBeamSize = beamSize === "sm" ? "sm" : "md"
  const beamGlow = beamSize === "lg" ? 1.9 : beamSize === "sm" ? 0.7 : 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trcaptcha-challenge-prompt"
        aria-describedby="trcaptcha-challenge-status"
        tabIndex={-1}
        className="relative w-full max-w-[380px] outline-none"
      >
        <BorderBeam
          size={packageBeamSize}
          colorVariant={beamColor}
          theme={dark ? "dark" : "light"}
          glowSize={beamGlow}
        >
          <div
            className={cn(
              "overflow-hidden rounded-xl shadow-2xl",
              dark ? "bg-[#0d0d0f] text-white" : "bg-white text-black"
            )}
          >
            {/* Başlık şeridi — accentColor */}
            <div
              className="relative flex items-start gap-3 p-4 text-sm font-semibold text-white"
              style={{ backgroundColor: accentColor }}
            >
              <span id="trcaptcha-challenge-prompt" className="leading-snug">
                {challenge?.prompt ?? "Hemşerim, bi bakiye..."}
              </span>

              <span className="ml-auto shrink-0 rounded-full bg-black/25 px-2 py-1 text-xs font-normal tabular-nums">
                {timeLeft} sn
              </span>

              <button
                type="button"
                onClick={onClose}
                aria-label="CAPTCHA'yı kapat"
                className="absolute right-2 top-1 grid h-6 w-6 place-items-center rounded-full text-white/80 transition-colors hover:bg-black/30 hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Görev gövdesi */}
            <div key={shakeKey} className={cn(isError && "animate-shake")}>
              {showBody && challenge ? (
                <ChallengeBody
                  challenge={challenge}
                  selected={selected}
                  onSelectedChange={onSelectedChange}
                  onRefresh={onRefresh}
                  onVerify={onVerify}
                  isVerifying={verifying}
                  canVerify={canVerify}
                  accentColor={accentColor}
                  theme={theme}
                />
              ) : (
                <SkeletonGrid />
              )}
            </div>

            {/* Hata / bilgi mesajı */}
            <p
              id="trcaptcha-challenge-status"
              role="status"
              aria-live="polite"
              className={cn(
                "px-4 py-2 text-center text-xs font-medium",
                message
                  ? isError
                    ? "bg-red-500/10 text-red-500"
                    : dark
                      ? "bg-transparent text-zinc-400"
                      : "bg-transparent text-zinc-600"
                  : "sr-only"
              )}
            >
              {message}
            </p>
          </div>
        </BorderBeam>
      </div>
    </div>
  )
}
