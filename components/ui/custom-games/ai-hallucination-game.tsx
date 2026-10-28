"use client"

import * as React from "react"
import { CaptchaTile } from "@/components/ui/captcha-tile"
import type {
  AiHallucinationData,
  CaptchaTheme,
} from "@/lib/captcha/custom-types"
import { cn } from "@/lib/utils"

interface AiHallucinationGameProps {
  data: AiHallucinationData
  value: number[]
  onChange: (value: number[]) => void
  accentColor: string
  theme: CaptchaTheme
}

/**
 * Yapay zekanın "halüsinasyon gördüğü" kareleri bulma oyunu.
 *
 * Alt metinler bilerek nötr tutulur: açıklayıcı alt yazıları ("havada duran
 * fincan" gibi) hangi karelerin cevap olduğunu sızdırır ve botların görsel
 * yerine metinden kazanmasına yol açar.
 */
export function AiHallucinationGame({
  data,
  value,
  onChange,
  accentColor,
  theme,
}: AiHallucinationGameProps) {
  const dark = theme === "dark"

  const toggle = (index: number) => {
    onChange(
      value.includes(index)
        ? value.filter((i) => i !== index)
        : [...value, index]
    )
  }

  return (
    <div className="w-full">
      <p
        className={cn(
          "mb-2 text-sm",
          dark ? "text-zinc-200" : "text-zinc-700"
        )}
      >
        {data.instruction}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {data.images.map((image, index) => (
          <CaptchaTile
            key={image.src + index}
            tile={{ id: String(index), imageUrl: image.src }}
            isSelected={value.includes(index)}
            onToggle={(id) => toggle(Number(id))}
            accentColor={accentColor}
            priority={index < 3}
            kind="ai"
          />
        ))}
      </div>
    </div>
  )
}
