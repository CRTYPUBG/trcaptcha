"use client"

import * as React from "react"
import { CaptchaGrid } from "@/components/ui/captcha-grid"
import { CaptchaFooter } from "@/components/ui/captcha-footer"
import { AiHallucinationGame } from "@/components/ui/custom-games/ai-hallucination-game"
import { PromptMasterGame } from "@/components/ui/custom-games/prompt-master-game"
import { LatentSpaceGame } from "@/components/ui/custom-games/latent-space-game"
import { LATENT_TOLERANCE } from "@/lib/captcha/answers"
import type {
  AiHallucinationData,
  CaptchaAnswer,
  CaptchaCustomData,
  CaptchaChallengeResponse,
  CaptchaTheme,
  LatentSpaceData,
  PromptMasterData,
} from "@/lib/captcha/custom-types"

/* ----------------------------- tip daraltmaları ---------------------------- */

function isAiHallucination(
  type: CaptchaChallengeResponse["type"],
  data: CaptchaCustomData | undefined
): data is AiHallucinationData {
  return type === "trAIHallucination" && data !== undefined && "images" in data
}

function isPromptMaster(
  type: CaptchaChallengeResponse["type"],
  data: CaptchaCustomData | undefined
): data is PromptMasterData {
  return (
    type === "trPromptMaster" &&
    data !== undefined &&
    Array.isArray((data as PromptMasterData).options)
  )
}

function isLatentSpace(
  type: CaptchaChallengeResponse["type"],
  data: CaptchaCustomData | undefined
): data is LatentSpaceData {
  return type === "trLatentSpace" && data !== undefined && "startImage" in data
}

function hintFor(
  type: CaptchaChallengeResponse["type"],
  score: number
): string {
  switch (type) {
    case "trAIHallucination":
      return `${score} kare işaretlediniz.`
    case "trPromptMaster":
      return score > 0 ? "Bir prompt seçtiniz." : "4 şıktan birini seçin."
    case "trLatentSpace":
      return `Kaydırıcıyı hedef noktaya getirdiğinizden emin olun (±${LATENT_TOLERANCE}).`
    default:
      return `${score} kare işaretlediniz.`
  }
}

/* --------------------------------- render ---------------------------------- */

export interface ChallengeBodyProps {
  challenge: CaptchaChallengeResponse
  selected: CaptchaAnswer | null
  onSelectedChange: (value: CaptchaAnswer) => void
  onRefresh: () => void
  onVerify: () => void
  isVerifying: boolean
  /** Minimum çözüm süresi geçti ve seçim geçerli. */
  canVerify: boolean
  accentColor: string
  theme: CaptchaTheme
}

/**
 * Görev tipine göre doğru arayüzü render eder. Alt bar (DOĞRULA, yenile, ses,
 * yardım) her tip için ortaktır. Bilinmeyen tip güvenli bir fallback'e düşer.
 */
export function ChallengeBody({
  challenge,
  selected,
  onSelectedChange,
  onRefresh,
  onVerify,
  isVerifying,
  canVerify,
  accentColor,
  theme,
}: ChallengeBodyProps) {
  const dark = theme === "dark"
  const { type, customData, tiles } = challenge

  const footer = (
    <CaptchaFooter
      onRefresh={onRefresh}
      onVerify={onVerify}
      isVerifying={isVerifying}
      canVerify={canVerify}
      accentColor={accentColor}
      theme={theme}
      prompt={challenge.prompt}
      hint={hintFor(type, selectionCount(selected))}
    />
  )

  /* 1) Klasik / etiket tabanlı görsel ızgarası */
  if (type === "default" || type === "medium") {
    if (!tiles || tiles.length === 0) {
      return (
        <>
          <FallbackNote dark={dark} />
          {footer}
        </>
      )
    }
    const ids = Array.isArray(selected)
      ? selected.filter((v): v is string => typeof v === "string")
      : []
    return (
      <>
        <CaptchaGrid
          tiles={tiles}
          selected={ids}
          onToggle={(id) => {
            const next = ids.includes(id)
              ? ids.filter((x) => x !== id)
              : [...ids, id]
            onSelectedChange(next)
          }}
          accentColor={accentColor}
          theme={theme}
          kind="place"
        />
        {footer}
      </>
    )
  }

  /* 2) Yapay zeka halüsinasyonu */
  if (isAiHallucination(type, customData)) {
    const value = Array.isArray(selected)
      ? selected.filter((v): v is number => typeof v === "number")
      : []
    return (
      <>
        <AiHallucinationGame
          data={customData}
          value={value}
          onChange={onSelectedChange}
          accentColor={accentColor}
          theme={theme}
        />
        {footer}
      </>
    )
  }

  /* 3) Prompt uzmanı */
  if (isPromptMaster(type, customData)) {
    return (
      <>
        <PromptMasterGame
          data={customData}
          value={typeof selected === "string" ? selected : null}
          onChange={onSelectedChange}
          accentColor={accentColor}
          theme={theme}
        />
        {footer}
      </>
    )
  }

  /* 4) Latent space */
  if (isLatentSpace(type, customData)) {
    return (
      <>
        <LatentSpaceGame
          data={customData}
          value={typeof selected === "number" ? selected : 50}
          onChange={onSelectedChange}
          accentColor={accentColor}
          theme={theme}
        />
        {footer}
      </>
    )
  }

  return (
    <>
      <FallbackNote dark={dark} />
      {footer}
    </>
  )
}

/* --------------------------------- yardımcı -------------------------------- */

function selectionCount(selected: CaptchaAnswer | null): number {
  if (selected === null) return 0
  if (Array.isArray(selected)) return selected.length
  return 1
}

function FallbackNote({ dark }: { dark: boolean }) {
  return (
    <p className={dark ? "p-4 text-sm text-zinc-400" : "p-4 text-sm text-zinc-600"}>
      Bu görev tipi gösterilemiyor, lütfen yenileyin.
    </p>
  )
}
