# trCAPTCHA

Türkiye temalı, yapay zeka destekli, tamamen açık kaynaklı CAPTCHA sistemi.
Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 ile yazılmıştır.

**Canlı site:** https://trcaptcha.crty-dev.com · **Demo:** https://trcaptcha.crty-dev.com/demo

---

## Ne bu depoda?

Bu depo, trCAPTCHA'nın **yeniden kullanılabilir çekirdeğini** içerir: CAPTCHA
bileşenleri, sunucu API route'ları ve güvenlik altyapısı. Npm paketi olarak
yayınlanmamıştır; entegrasyon "kopyala-yapıştır" ile yapılır (aşağıya bakın).

> Tanıtım sitesi (landing / docs / pricing) ayrı bir depodadır:
> [`CRTYPUBG/trcaptcha_web`](https://github.com/CRTYPUBG/trcaptcha_web)

---

## Özellikler

| Özellik | Açıklama |
|---|---|
| **Görünmez geçiş** | Kullanıcı sayfada yeterince durmuşsa soru sormadan geçilir (zorluğa göre %60 / %30 / %10) |
| **5 durumlu akış** | `idle` → `checking` → `challenge` → `success` / `error` |
| **4 görev tipi** | klasik 3x3 ızgara, etiket tabanlı ızgara, AI halüsinasyon avı, prompt uzmanı, latent space |
| **Beyaz etiket** | `siteName`, `logoUrl`, `theme`, `beamColor`, `beamSize`, `accentColor` |
| **Liquid Glass + BorderBeam** | Apple cam efekti ve animasyonlu neon kenarlık |
| **Sunucu tarafı güvenlik** | AES-256-GCM token, HMAC imzalı görsel URL'leri, tek kullanımlık nonce |
| **Geçiş bileti** | Başarıda `verifyPassToken()` ile sunucuda doğrulanabilir HMAC bilet |

---

## Kurulum

### 1. Bağımlılıklar

```bash
npm install border-beam lucide-react zod
# Projede zaten olması gerekenler: next react react-dom typescript
# class-variance-authority clsx tailwind-merge @radix-ui/react-slot
```

### 2. Dosyaları kopyala

Bu depodaki aşağıdaki klasörleri Next.js projenizin **aynı yollarına** kopyala:

```
lib/captcha/           → lib/captcha/
components/captcha/    → components/captcha/
components/ui/         → components/ui/          (yalnızca captcha-*, confirm-icon,
                                                   border-beam, liquid-glass, custom-games)
app/api/captcha/        → app/api/captcha/
app/api/verify/         → app/api/verify/
app/api/img/[signed]/   → app/api/img/[signed]/
data/                   → data/
scripts/                → scripts/
public/captcha/         → public/captcha/
public/places/          → public/places/
public/brand/           → public/brand/
middleware.ts           → middleware.ts          (CSP + güvenlik başlıkları — kendi
                                                   yapına göre birleştir)
app/globals.css         → app/globals.css         (dark token'ları ve animasyonlar;
                                                   mevcut CSS'inin ÜZERİNE ekle)
```

> `border-beam` paketinde `"use client"` direktifi **yoktur** ve içinde `useState`
> vardır. Doğrudan Server Component'tan kullanıldığında `useState only works in
> Client Components` hatası verir. Bu yüzden bu depodaki
> `components/ui/border-beam.tsx` sarmalayıcısını kullan ve tüm importları
> `@/components/ui/border-beam` üzerinden yap.

### 3. Ortam değişkenleri

```bash
cp .env.example .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

```dotenv
CAPTCHA_SECRET=   # 32+ karakter — token + geçiş bileti imzası
IMAGE_SECRET=     # 32+ karakter — görsel URL'leri için HMAC
```

---

## Kullanım

```tsx
import { TrCaptcha } from "@/components/captcha/tr-captcha"

export default function MyForm() {
  return (
    <form>
      <TrCaptcha
        siteName="SiteninAdi"
        accentColor="#47c87c"
        defaultTheme="dark"
        defaultDifficulty="medium"
        onVerify={(ok, passToken) => {
          // ok=false → butonu pasif bırak
          // passToken → kendi sunucuna gönder, verifyPassToken() ile doğrula
        }}
      />
      <button type="submit">Giriş Yap</button>
    </form>
  )
}
```

### Sunucu doğrulaması

```ts
// app/api/verify-my-form/route.ts
import { verifyPassToken } from "@/lib/captcha/pass-token"

export async function POST(req: Request) {
  const { passToken } = await req.json()
  const claims = verifyPassToken(passToken ?? "")
  if (!claims) return Response.json({ ok: false }, { status: 400 })
  return Response.json({ ok: true })
}
```

---

## Props

| Prop | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `siteName` | `string` | `"trCAPTCHA"` | Sağ alttaki marka adı |
| `logoUrl` | `string` | — | Sağ üstteki logo; yoksa kalkan ikonu |
| `theme` | `"dark" \| "light" \| "glass"` | `"dark"` | Panel görünümü |
| `beamColor` | `"colorful" \| "ocean" \| "sunset" \| "mono"` | `"colorful"` | BorderBeam rengi |
| `beamSize` | `"sm" \| "md" \| "lg"` | `"md"` | BorderBeam boyutu |
| `accentColor` | `string` | `"#47c87c"` | Buton, tik ve başlık rengi |
| `defaultDifficulty` | `"easy" \| "medium" \| "hard"` | `"medium"` | Açılış zorluğu |
| `showDifficultySelector` | `boolean` | `true` | Kolay / Orta / Zor |
| `showThemeSelector` | `boolean` | `false` | Light / Dark / Liquid |
| `widgetId` | `string` | `"trcaptcha-widget"` | Dış kapsayıcının HTML `id` |
| `onVerify` | `(ok, passToken?) => void` | — | Doğrulama sonucu + bilet |

---

## Güvenlik modeli

- **Doğru cevaplar asla istemciye gitmez.** `/api/captcha` yalnızca
  `{ token, type, prompt, exp, tiles?, customData? }` döner; cevap AES-256-GCM
  ile şifrelenir.
- **Görsel URL'leri HMAC imzalıdır.** `/api/img/<id.bucket.hmac>` — numaralandırma
  (SSRF/brute-force) kapalıdır. Proxy yalnızca izinli host'lara istek atar ve
  2 MB sınırı uygular.
- **Token tek kullanımlıktır.** Başarılı **ve** başarısız her denemda harcanır;
  aksi halde aynı token üzerinde brute force yapılabilirdi.
- **Karşılaştırma zamanlama sabittir** (`timingSafeEqual`).
- **Bot korumaları:** honeypot alanı, minimum 1 sn çözüm süresi, IP başına
  dakikada 30 istek, sessiz geçişte 20 sn cooldown.
- **CSP:** nonce tabanlı `script-src` + `strict-dynamic`; geliştirmede React
  Refresh için `unsafe-eval` açılır, production'da kapalıdır.
- **Görünmez geçiş güvenlik DEĞİLDİR** — yalnızca bir UX kısayoludur. Bilet yalnızca
  sunucu kontrollerini geçen isteğe verilir.

Detaylı mimari notlar için: [`trcaptcha_web` deposundaki `architecture.md`](https://github.com/CRTYPUBG/trcaptcha_web/blob/main/architecture.md)

---

## Geliştirme

```bash
npm i
cp .env.example .env.local
npm run dev          # http://localhost:3000
npx tsc --noEmit     # tip kontrolü
npm run build

node scripts/fetch-places.mjs   # görselleri Wikimedia'dan doğrula + indir
```

Görseller Wikimedia Commons'tan alınmıştır; her görselin `source` ve `license`
alanı `data/turkiye-places.json` içinde dolduruludur. CC-BY-SA görseller için
arayüzde atıf gösterilmelidir.

---

## Lisans

MIT — bkz. [LICENSE](./LICENSE)
