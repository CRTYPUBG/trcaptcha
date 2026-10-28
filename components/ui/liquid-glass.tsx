"use client"

import * as React from "react"
import type { ButtonHTMLAttributes, HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

/**
 * Apple "Tahoe Liquid Glass" esinli cam yüzey sarmalayıcıları.
 *
 * Not: Bu, o devasa referans bileşenin bütün davranışlarını (ışık kırılımı,
 * hareket duyarlılığı, çok katmanlı dinamik gölge) birebir taşıyan bir port
 * değildir; amacı aynı *hissi* veren, bağımlılıksız ve erişilebilir bir cam
 * yüzey sunmaktır. `backdrop-filter` desteklemeyen ortamlarda düz bir yüzeye
 * düşer.
 */

export type GlassAppearance = "light" | "dark"
export type GlassMaterial = "clear" | "regular"

const SURFACE: Record<GlassMaterial, Record<GlassAppearance, string>> = {
  clear: {
    light: "bg-white/25",
    dark: "bg-white/5",
  },
  regular: {
    light: "bg-white/45",
    dark: "bg-black/40",
  },
}

const BORDER: Record<GlassAppearance, string> = {
  light: "border-white/50",
  dark: "border-white/15",
}

function glassSurface(appearance: GlassAppearance, material: GlassMaterial) {
  return [
    "backdrop-blur-xl backdrop-saturate-150",
    "supports-[not_(backdrop-filter)]:bg-white/80",
    SURFACE[material][appearance],
    BORDER[appearance],
  ].join(" ")
}

export interface LiquidGlassProps extends HTMLAttributes<HTMLDivElement> {
  appearance?: GlassAppearance
  material?: GlassMaterial
  /** Basılabilir yüzey: hafif ölçekleme + fare imleci. */
  interactive?: boolean
  /** radius sınıfı (varsayılan 2xl). */
  rounded?: string
}

export function LiquidGlass({
  appearance = "dark",
  material = "regular",
  interactive = false,
  rounded = "rounded-2xl",
  className,
  children,
  ...props
}: LiquidGlassProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border shadow-lg",
        glassSurface(appearance, material),
        rounded,
        interactive && "cursor-pointer transition-transform active:scale-[0.99]",
        className
      )}
      style={{
        // Camın kenarındaki ince ışık çizgisi
        boxShadow:
          appearance === "light"
            ? "inset 0 1px 0 rgba(255,255,255,0.6), 0 8px 32px rgba(0,0,0,0.12)"
            : "inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.4)",
        ...props.style,
      }}
      {...props}
    >
      {/* Üstten gelen parlaklık katmanı */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent"
      />
      <div className="relative">{children}</div>
    </div>
  )
}

export interface LiquidGlassButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  appearance?: GlassAppearance
  material?: GlassMaterial
  size?: "sm" | "md" | "lg"
  /** Basılabilir buton: hafif ölçekleme tepkisi. */
  interactive?: boolean
}

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
} as const

export function LiquidGlassButton({
  appearance = "dark",
  material = "clear",
  size = "md",
  interactive = false,
  className,
  children,
  ...props
}: LiquidGlassButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full border font-medium",
        "transition-all duration-200 active:scale-95",
        "disabled:pointer-events-none disabled:opacity-50",
        interactive && "hover:brightness-125",
        glassSurface(appearance, material),
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
