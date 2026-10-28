import type { NextRequest } from "next/server"
import { verifyImageSignature } from "@/lib/captcha/crypto"
import { getPlaceById } from "@/lib/captcha/places"
import { fetchImage } from "@/lib/images/proxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ signed: string }> }
) {
  const { signed } = await params
  const v = verifyImageSignature(signed)
  if (!v) return new Response("forbidden", { status: 403 })

  const place = getPlaceById(v.id)
  if (!place) return new Response("not found", { status: 404 })

  try {
    const { body, type } = await fetchImage(place.imageUrl, place.id)
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    })
  } catch {
    return new Response("upstream failure", { status: 502 })
  }
}
