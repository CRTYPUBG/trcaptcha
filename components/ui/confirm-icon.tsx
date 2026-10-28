import type { SVGProps } from "react"

/**
 * Animasyonlu tik ikonu.
 *
 * Dikkat: `<animate>` elemanı `<path>`'in İÇİNDE olmalı. Aksi halde animasyon
 * path yerine svg'nin kendisini hedefler ve tik doldurmasi çalışmaz.
 */
export function ConfirmIcon({
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeDasharray="26"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 11l6 6l10 -10"
      >
        <animate
          fill="freeze"
          attributeName="stroke-dashoffset"
          dur="0.6s"
          values="26;0"
        />
      </path>
    </svg>
  )
}
