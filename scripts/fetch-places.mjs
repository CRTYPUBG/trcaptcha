import fs from "node:fs"
import path from "node:path"

const DATA_FILE = path.resolve("data/turkiye-places.json")
const LOCAL_DIR = path.resolve("public/places")
const API_BASE = "https://commons.wikimedia.org/w/api.php"
const FILEPATH = "https://commons.wikimedia.org/wiki/Special:FilePath"
const USER_AGENT =
  process.env.WIKIMEDIA_USER_AGENT || "trCAPTCHA/1.0 (iletisim@ornek.com)"
const DELAY_MS = 400
const MAX_RETRIES = 5
const MAX_BYTES = 2 * 1024 * 1024
// 3x3 grid karesi ~200px; 640px thumb hem yeterli detay verir hem de
// orijinal dosyaların (5-20 MB) proxy limitini aşmasını engeller.
const THUMB_WIDTH = 640

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 429/5xx için üstel geri çekilmeli tekrar. */
async function withRetry(fn, label) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const status = err.status ?? 0
      const retryable = status === 429 || status >= 500
      if (!retryable || attempt === MAX_RETRIES) throw err
      const wait = 2000 * Math.pow(2, attempt)
      console.warn(`  retry ${label} (${status}) -> ${wait}ms`)
      await sleep(wait)
    }
  }
}

async function apiGet(params) {
  const qs = new URLSearchParams({
    action: "query",
    format: "json",
    ...params,
  })
  const res = await fetch(`${API_BASE}?${qs}`, {
    headers: { "User-Agent": USER_AGENT },
  })
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

/**
 * Commons'ta dosya adını çözümler ve 640px thumbnail URL'sini döndürür.
 * API'ye ihtiyaç duymaz (hash + thumb yolunu redirect ile çözer), bu yüzden
 * arama API'si rate-limit'a girdiğinde bile çalışır.
 */
async function resolveViaFilePath(filename) {
  const url = `${FILEPATH}/${encodeURIComponent(filename)}?width=${THUMB_WIDTH}`
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
    })
    if (!res.ok) return null
    const type = (res.headers.get("content-type") || "").split(";")[0]
    if (!type.startsWith("image/")) return null
    const len = Number(res.headers.get("content-length") || "0")
    if (len > MAX_BYTES) return null
    // thumb.wikimedia.org -> upload.wikimedia.org (AGENTS.md izin listesi)
    return res.url
      .replace("https://thumb.wikimedia.org/", "https://upload.wikimedia.org/")
      .split("?")[0]
  } catch {
    return null
  }
}

/** API araması: gerçek dosya adlarını bulur (rate-limit'a duyarlı, son çare). */
async function searchFiles(term) {
  const data = await withRetry(
    () =>
      apiGet({
        list: "search",
        srsearch: term,
        srnamespace: 6,
        srlimit: 12,
      }),
    `search(${term})`
  )
  return (data.query?.search || []).map((r) => r.title.replace(/^File:/, ""))
}

function slug(s) {
  return s.trim().replace(/\s+/g, "_")
}

function filenameFromUrl(url) {
  try {
    const u = new URL(url)
    const parts = u.pathname.split("/").filter(Boolean)
    const last = parts[parts.length - 1]
    // thumb yolunda son segment "640px-File.jpg" -> gerçek adı al
    const thumb = last.match(/^\d+px-(.+)$/)
    return decodeURIComponent(thumb ? thumb[1] : last)
  } catch {
    return null
  }
}

/** Bir yer için denenecek dosya adı varyantları. */
function candidatesFor(place) {
  const list = []
  const current = filenameFromUrl(place.imageUrl)
  if (current) list.push(current)

  const name = slug(place.name)
  const city = slug(place.city || "")
  const region = slug(place.region || "")
  const base = [name, city].filter(Boolean)

  for (const b of base) {
    list.push(`${b}.jpg`, `${b}.JPG`, `${b}.png`, `${b}.jpeg`)
  }
  if (name && city) {
    list.push(`${name}_${city}.jpg`, `${name}_${city}.png`)
  }
  if (name && region) {
    list.push(`${name}_${region}.jpg`, `${name}_${region}.png`)
  }
  if (name) {
    list.push(
      `${name}_Turkey.jpg`,
      `${name}_Türkiye.jpg`,
      `${name}_(cropped).jpg`,
      `${name}_Turkey.png`
    )
  }
  return [...new Set(list)]
}

/** Orijinal URL'yi 640px thumb yoluna çevirir (boyut + hız için). */
function toThumbUrl(url) {
  try {
    const u = new URL(url)
    if (u.pathname.includes("/commons/thumb/")) return url
    const m = u.pathname.match(
      /^\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)$/
    )
    if (!m) return url
    const [, h1, h2, file] = m
    return `https://upload.wikimedia.org/wikipedia/commons/thumb/${h1}/${h2}/${file}/${THUMB_WIDTH}px-${file}`
  } catch {
    return url
  }
}

/**
 * Görseli public/places/<id>.jpg olarak indirir. Böylece runtime'da upstream'e
 * hiç gidilmez: 429 yok, anında yükleme, kurumsal ortamda da çalışır.
 */
async function downloadLocal(place, url) {
  const target = path.join(LOCAL_DIR, `${place.id}.jpg`)
  try {
    const res = await fetch(toThumbUrl(url), {
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
    })
    if (!res.ok) return false
    const type = (res.headers.get("content-type") || "").split(";")[0]
    if (!type.startsWith("image/")) return false
    const body = Buffer.from(await res.arrayBuffer())
    if (body.byteLength > MAX_BYTES) return false
    fs.writeFileSync(target, body)
    return true
  } catch {
    return false
  }
}

async function main() {
  const raw = fs.readFileSync(DATA_FILE, "utf8")
  const data = JSON.parse(raw)
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true })

  let fixed = 0
  let kept = 0
  let broken = 0
  let downloaded = 0

  for (const place of data.places) {
    // 1) Mevcut URL kullanılabilir mi? (küçük ve erişilebilir)
    const currentOk = await resolveViaFilePath(filenameFromUrl(place.imageUrl))
    if (currentOk) {
      if (currentOk !== place.imageUrl) {
        place.imageUrl = currentOk
        fixed++
        console.log(`updated: ${place.id} -> ${currentOk}`)
      } else {
        kept++
        console.log(`ok (keep): ${place.id}`)
      }
      // Yerel kopyayı indir/güncelle
      if (await downloadLocal(place, place.imageUrl)) {
        downloaded++
        console.log(`  local: public/places/${place.id}.jpg`)
      }
      await sleep(DELAY_MS)
      continue
    }

    // 2) Dosya adı varyantlarını dene (API'siz)
    let resolved = null
    for (const candidate of candidatesFor(place)) {
      resolved = await resolveViaFilePath(candidate)
      if (resolved) break
      await sleep(120)
    }

    // 3) Hâlâ yoksa API araması (son çare)
    if (!resolved) {
      for (const term of [
        place.name,
        `${place.name} ${place.city}`.trim(),
        `${place.name} Turkey`,
      ]) {
        try {
          const files = await searchFiles(term)
          for (const f of files) {
            resolved = await resolveViaFilePath(f)
            if (resolved) break
          }
        } catch (err) {
          console.warn(`  search failed "${term}": ${err.message}`)
        }
        if (resolved) break
        await sleep(DELAY_MS)
      }
    }

    if (resolved) {
      place.imageUrl = resolved
      fixed++
      console.log(`fixed: ${place.id} -> ${resolved}`)
      if (await downloadLocal(place, resolved)) {
        downloaded++
        console.log(`  local: public/places/${place.id}.jpg`)
      }
    } else {
      broken++
      console.warn(`BROKEN: ${place.id} (${place.name}) -> ${place.imageUrl}`)
    }
    await sleep(DELAY_MS)
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n", "utf8")
  console.log(
    `\ndone: ${data.places.length} places | ${kept} kept | ${fixed} fixed | ${broken} broken | ${downloaded} downloaded`
  )
}

main().catch((err) => {
  console.error("fatal:", err)
  process.exit(1)
})
