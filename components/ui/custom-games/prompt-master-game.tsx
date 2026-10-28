"use client"

import * as React from "react"
import { ConfirmIcon } from "@/components/ui/confirm-icon"
import type {
  CaptchaTheme,
  PromptMasterData,
} from "@/lib/captcha/custom-types"
import { cn } from "@/lib/utils"

interface PromptMasterGameProps {
  data: PromptMasterData
  value: string | null
  onChange: (value: string) => void
  accentColor: string
  theme: CaptchaTheme
}

/** Prompt uzmanı: verilen çıktıyı hangi prompt üretir? */
export function PromptMasterGame({
  data,
  value,
  onChange,
  accentColor,
  theme,
}: PromptMasterGameProps) {
  const dark = theme === "dark"

  return (
    <div className="w-full space-y-3">
      <p className={cn("text-sm", dark ? "text-zinc-200" : "text-zinc-700")}>
        {data.instruction}
      </p>

      <div
        className={cn(
          "rounded-md border p-3 text-sm italic leading-relaxed",
          dark
            ? "border-zinc-700 bg-zinc-900 text-zinc-100"
            : "border-zinc-300 bg-zinc-50 text-zinc-900"
        )}
      >
        &ldquo;{data.targetOutput}&rdquo;
      </div>

      <div className="grid gap-2">
        {data.options.map((option, index) => {
          const active = value === option.id
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className={cn(
                "flex w-full items-start gap-2 rounded-md border p-2.5 text-left text-sm transition-colors",
                dark ? "text-zinc-100" : "text-zinc-900"
              )}
              style={{
                borderColor: active ? accentColor : dark ? "#3f3f46" : "#d4d4d8",
                backgroundColor: active ? `${accentColor}22` : "transparent",
              }}
            >
              <span
                className="font-bold"
                style={{ color: active ? accentColor : undefined }}
              >
                {"ABCD"[index]})
              </span>
              <span className="flex-1 leading-tight">{option.text}</span>
              {active && (
                <span style={{ color: accentColor }}>
                  <ConfirmIcon size={18} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
