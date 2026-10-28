"use client"

import { CaptchaTile, type CaptchaTileData } from "./captcha-tile"
import type { CaptchaTheme } from "@/lib/captcha/custom-types"

interface CaptchaGridProps {
  tiles: CaptchaTileData[]
  selected: string[]
  onToggle: (id: string) => void
  accentColor: string
  theme: CaptchaTheme
  /** Görsellerin yapay zeka karesi olup olmadığı (alt metni için). */
  kind?: "place" | "ai"
}

/**
 * 3x3 kare ızgarası. Alt bar (yenile / ses / yardım / DOĞRULA) ayrı ve ortak
 * bir bileşendir: `captcha-footer.tsx`.
 */
export function CaptchaGrid({
  tiles,
  selected,
  onToggle,
  accentColor,
  theme: _theme,
  kind = "place",
}: CaptchaGridProps) {
  return (
    <div className="grid grid-cols-3 gap-1 bg-black/20 p-1">
      {tiles.map((tile, index) => (
        <CaptchaTile
          key={tile.id}
          tile={tile}
          isSelected={selected.includes(tile.id)}
          onToggle={onToggle}
          accentColor={accentColor}
          priority={index < 3}
          kind={kind}
        />
      ))}
    </div>
  )
}
