Sen kıdemli bir full-stack geliştiricisin. Bana "trCAPTCHA" adında, 
Türkiye temalı, eğlenceli, tamamen ÜCRETSİZ stack'lerle çalışan bir 
CAPTCHA (robot doğrulama) uygulaması kuracaksın.

## STACK (hepsi ücretsiz / open-source)
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (components/ui klasör yapısı)
- react-jsx-parser (jsx-preview bileşeni için)
- Görsel kaynağı: Wikimedia Commons API + Unsplash + Pexels (hepsi ücretsiz lisans)
- Veri seti: lokal JSON (/data/turkiye-places.json)
- Deploy: Vercel free tier

## MEVCUT BİLEŞEN
Bana verilen `jsx-preview.tsx` bileşenini `/components/ui/jsx-preview.tsx` 
içine yerleştir. Bu bileşen CAPTCHA'nın UI'ını streaming JSX olarak 
render etmek için kullanılacak (CAPTCHA içeriği bir string olarak 
üretilip JSXPreview ile canlı basılacak).

## CAPTCHA MEKANİĞİ
1. 3x3 (9 kare) resim grid'i gösterilir.
2. Üstte Türkçe, samimi, yer yer komik bir talimat çıkar. Örnekler:
   - "Hemşerim, şu karelerden KAPADOKYA olanları seç"
   - "Hangisi Türkiye'de DEĞİL? Vatan hainini bul 😄"
   - "Çayını al, şu 9 kareden VAN KEDİSİ'ni bul"
3. Kullanıcı karelere tıklar → "Doğrula" butonu.
4. Başarı: "Helal olsun hemşerim! 🫖" + yeşil animasyon
   Hata: "Yanlış be ya, bir çay iç gel 🍵" + kırmızı sallama animasyonu
5. 5 saniye içinde çözülmezse yeni soru gelir.

## "BOZUK" / YÖRESEL EFEKT (önemli)
Resimlerin üzerine CSS ile hafif "bozuk / eski / yöresel" havası ver:
- filter: sepia(0.15) saturate(1.2) contrast(1.05)
- hafif rotate(-2deg ~ 2deg) rastgele
- Üzerine sticker olarak: 🇹🇷, nazar boncuğu 🧿, çay bardağı, simit, 
  traktör, Ankara kedisi emojileri serpiştir
- Bazı karelerde küçük "AI bozulması" efekti (blur 0.3px + noise)
- Amaç: ciddi CAPTCHA değil, memleket işi eğlenceli CAPTCHA

## JSON VERİ SETİ (kritik)
`/data/turkiye-places.json` dosyasını oluştur. Şema:

{
  "version": "1.0.0",
  "places": [
    {
      "id": "kapadokya-01",
      "name": "Kapadokya",
      "city": "Nevşehir",
      "region": "İç Anadolu",
      "imageUrl": "https://upload.wikimedia.org/.../kapadokya.jpg",
      "source": "wikimedia",
      "license": "CC-BY-SA",
      "isTurkish": true,
      "tags": ["balon", "peri bacası", "ünlü"],
      "difficulty": 2
    }
  ]
}

En az 40 Türk yeri + 20 yabancı yer ekle. Türk yerleri örnekleri:
Kapadokya, Pamukkale, Ayasofya, Efes, Nemrut, Sümela, Galata, 
Boğaz Köprüsü, Safranbolu, Mardin, Göreme, Ölüdeniz, Salda Gölü, 
Uzungöl, Ani Harabeleri, Bergama, Hasankeyf, Balıklıgöl, 
Kız Kulesi, Dolmabahçe...

Yabancı yerler (Türkiye'de olmayanı bulma oyunu için):
Eyfel, Kolezyum, Piramitler, Tac Mahal, Çin Seddi, Statue of Liberty...

Görselleri Wikimedia Commons API'den otomatik çeken bir script yaz:
`/scripts/fetch-places.mjs` — node ile çalışsın, JSON'u güncellesin.
(API ücretsiz: https://commons.wikimedia.org/w/api.php)

## DOSYA YAPISI
app/
  page.tsx                 → trCAPTCHA ana sayfa
  api/
    captcha/route.ts       → rastgele soru üretir (JSON'dan)
    verify/route.ts        → cevabı doğrular
components/
  ui/
    jsx-preview.tsx        → verilen bileşen
    captcha-grid.tsx       → 3x3 grid
    captcha-tile.tsx       → tek kare + yöresel efekt
  captcha/
    tr-captcha.tsx         → ana CAPTCHA bileşeni
data/
  turkiye-places.json      → veri seti
scripts/
  fetch-places.mjs         → Wikimedia'dan görsel çeker

## EK ÖZELLİKLER
- Türkçe arayüz, samimi dil ("hemşerim", "be ya", "helal olsun")
- Dark mode desteği
- Mobil responsive
- Rate limit (basit in-memory)
- "Veri setini indir" butonu → JSON export
- Ana sayfada JSON şemasının önizlemesi

## KURULUM ADIMLARI
1. `npx create-next-app@latest trcaptcha --ts --tailwind --app`
2. `npx shadcn@latest init`
3. `npm i react-jsx-parser`
4. jsx-preview.tsx'i /components/ui içine kopyala
5. Veri setini oluştur, fetch scriptini çalıştır
6. `npm run dev`

Bana tüm dosyaların TAM kodunu ver. Eksik bırakma. 
Hiçbir ücretli servis kullanma. Görseller Wikimedia/Unsplash/Pexels'ten 
lisanslı ve ücretsiz olacak.