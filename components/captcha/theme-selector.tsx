"use client"

import { Moon, Sparkles, Sun } from "lucide-react"
import {
  LiquidGlass,
  LiquidGlassButton,
} from "@/components/ui/liquid-glass"
import type { ThemeMode } from "@/lib/captcha/custom-types"

interface ThemeSelectorProps {
  currentTheme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  accentColor?: string
}

/** Light / Dark / Liquid (cam) tema seçici. */
export function ThemeSelector({
  currentTheme,
  onThemeChange,
  accentColor = "#47c87c",
}: ThemeSelectorProps) {
  return (
    <LiquidGlass
      appearance="dark"
      material="clear"
      className="mb-2 inline-flex items-center gap-2 rounded-2xl p-2"
    >
      <span className="px-2 text-xs font-medium text-white/60">
        Tema Seç:
      </span>

      <LiquidGlassButton
        size="sm"
        interactive
        appearance={currentTheme === "light" ? "light" : "dark"}
        aria-pressed={currentTheme === "light"}
        aria-label="Light tema"
        onClick={() => onThemeChange("light")}
        style={{
          color: currentTheme === "light" ? accentColor : "inherit",
        }}
      >
        <Sun size={14} className="mr-1" aria-hidden="true" />
        Light
      </LiquidGlassButton>

      <LiquidGlassButton
        size="sm"
        interactive
        appearance={currentTheme === "dark" ? "light" : "dark"}
        aria-pressed={currentTheme === "dark"}
        aria-label="Dark tema"
        onClick={() => onThemeChange("dark")}
        style={{
          color: currentTheme === "dark" ? accentColor : "inherit",
        }}
      >
        <Moon size={14} className="mr-1" aria-hidden="true" />
        Dark
      </LiquidGlassButton>

      <LiquidGlassButton
        size="sm"
        interactive
        appearance={currentTheme === "glass" ? "light" : "dark"}
        aria-pressed={currentTheme === "glass"}
        aria-label="Liquid cam tema"
        onClick={() => onThemeChange("glass")}
        style={{
          color: currentTheme === "glass" ? accentColor : "inherit",
        }}
      >
        <Sparkles size={14} className="mr-1" aria-hidden="true" />
        Liquid
      </LiquidGlassButton>
    </LiquidGlass>
  )
}
