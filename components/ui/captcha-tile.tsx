"use client"

import * as React from "react"
import { ConfirmIcon } from "./confirm-icon"
import { cn } from "@/lib/utils"

export interface CaptchaTileData {
  id: string
  /** `/api/img/<imzali>` — imzalı proxy üzerinden gelir. */
  imageUrl: string
}

interface CaptchaTileProps {
  tile: CaptchaTileData
  isSelected: boolean
  onToggle: (id: string) => void
  /** Seçim çerçevesi, tik ve katman rengi. */
  accentColor: string
  /** İlk 3 kare önden çekilir. */
  priority?: boolean
  /** Görev tipi (erişilebilirlik metni için). */
  kind?: "place" | "ai"
}

/** Yer adı istemciye gitmez; alt metni nötr tutulur. */
const ALT_PLACE = "CAPTCHA karesi"
const ALT_AI = "Yapay zeka karesi"

export function CaptchaTile({
  tile,
  isSelected,
  onToggle,
  accentColor,
  priority = false,
  kind = "place",
}: CaptchaTileProps) {
  const altText = `${kind === "place" ? ALT_PLACE : ALT_AI} ${tile.id}`

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={altText}
      onClick={() => onToggle(tile.id)}
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-md",
        "transition-transform duration-150 active:scale-95"
      )}
    >
      <img
        src={tile.imageUrl}
        alt={altText}
        width={200}
        height={200}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        decoding="async"
        draggable={false}
        className={cn(
          "h-full w-full object-cover transition-all duration-200",
          isSelected ? "scale-105 opacity-80" : "opacity-100"
        )}
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement
          if (!el.dataset.fallback) {
            el.dataset.fallback = "1"
            el.src = "/brand/placeholder.svg"
          }
        }}
      />

      {isSelected && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40"
          style={{ border: `3px solid ${accentColor}` }}
        >
          <span
            className="grid place-items-center rounded-full bg-white p-1 shadow-lg"
            style={{ color: accentColor }}
          >
            <ConfirmIcon size={24} />
          </span>
        </div>
      )}
    </button>
  )
}
