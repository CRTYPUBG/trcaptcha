import { NextResponse, type NextRequest } from "next/server"
import { TRCAPTCHA_PROTECTED_BY } from "@/lib/captcha/constants"

export function middleware(request: NextRequest) {
  // Edge runtime'da Buffer global olmayabilir; btoa her ortamda mevcut.
  const nonce = btoa(crypto.randomUUID())

  // Next.js React Refresh (dev) eval() kullanır -> CSP 'unsafe-eval' gerektirir.
  // Production build eval kullanmaz, orada CSP sıkı kalır.
  const isDev = process.env.NODE_ENV === "development"
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' 'unsafe-inline'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`

  /*
   * `img-src` bilerek dar tutulur: yalnızca kendi kaynaklar + AGENTS.md'de
   * izinli host üzerinden gelen tanıtım arka plan görseli. `next.config.ts`
   * içindeki `images.remotePatterns` ile aynı listeyi paylaşır; biri boşlanırsa
   * diğeri güvenlik açığına dönüşür, bu yüzden ikisi birlikte güncellenir.
   */
  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ")

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  // Next.js bu istek başlığından nonce'u okuyup kendi script etiketlerine ekler.
  requestHeaders.set("content-security-policy", csp)

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set("Content-Security-Policy", csp)
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  )
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin")
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin")
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  )
  res.headers.delete("X-Powered-By")
  /*
   * Teknoloji bildirim header'ı: Wappalyzer gibi teknoloji tarayıcılarının
   * sitenin trCAPTCHA ile korunduğunu HTTP katmanında tespit etmesini sağlar.
   * (reCAPTCHA'nın kendi header'ı yoktur; bu bizim açık bildirimimizdir.)
   */
  res.headers.set("X-Protected-By", TRCAPTCHA_PROTECTED_BY)
  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
