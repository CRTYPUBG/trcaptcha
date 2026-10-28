"use client"

import * as React from "react"
import type {
  CaptchaTheme,
  LatentSpaceData,
} from "@/lib/captcha/custom-types"
import { cn } from "@/lib/utils"

interface LatentSpaceGameProps {
  data: LatentSpaceData
  value: number
  onChange: (value: number) => void
  accentColor: string
  theme: CaptchaTheme
}

/** İki görsel arasındaki geçişi istenen noktaya getirme oyunu. */
export function LatentSpaceGame({
  data,
  value,
  onChange,
  accentColor,
  theme,
}: LatentSpaceGameProps) {
  const dark = theme === "dark"
  const track = dark ? "#3f3f46" : "#e4e4e7"

  /**
   * Kaydırıcı ters yönde ise görünür oran `100 - value` olur. Üst bileşene
   * "etkin yüzde" gönderilir; böylece sunucudaki hedefle aynı ölçekte
   * karşılaştırılır. Hedef yüzde istemciye hiç gönderilmez.
   */
  const effective = data.reversed ? 100 - value : value

  return (
    <div className="w-full space-y-3">
      <p className={cn("text-sm", dark ? "text-zinc-200" : "text-zinc-700")}>
        {data.instruction}
      </p>

      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-white/10 shadow-inner">
        <img
          src={data.startImage}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <img
          src={data.endImage}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: effective / 100 }}
        />

        <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90">
          {data.startLabel}
        </span>
        <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90">
          {data.endLabel}
        </span>
        <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-mono text-white/90">
          %{effective}
        </span>
      </div>

      <label className="sr-only" htmlFor="trcaptcha-latent-slider">
        Geçiş oranı
      </label>
      <input
        id="trcaptcha-latent-slider"
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-label="Geçiş oranı"
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg"
        style={{
          background: `linear-gradient(to right, ${accentColor} ${value}%, ${track} ${value}%)`,
        }}
      />
    </div>
  )
}
