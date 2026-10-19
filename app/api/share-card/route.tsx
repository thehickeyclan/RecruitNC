import { ImageResponse } from "next/og"

/**
 * The link-preview card for any page (lib/share-metadata.ts): NC United navy and gold, the page's
 * kicker, title and one line, and a photo or logo when the page has one. Cached a day at the edge.
 */
export const runtime = "nodejs"

const NAVY = "#071427"
const GOLD = "#E8BA5A"

// Only pictures we host: the card must not fetch whatever a link asks for.
const IMAGE_HOSTS = [/\.public\.blob\.vercel-storage\.com$/, /^app\.ncwrestlingunited\.com$/, /\.supabase\.co$/]

function allowedImage(raw: string | null, origin: string): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw, origin)
    if (url.origin === origin) return url.toString()
    if (url.protocol !== "https:" || !IMAGE_HOSTS.some((h) => h.test(url.hostname))) return null
    return url.toString()
  } catch {
    return null
  }
}

let fonts: Promise<Array<{ name: string; data: ArrayBuffer; weight: 400 | 800; style: "normal" }>> | null = null
function loadFonts() {
  fonts ??= Promise.all(
    ([400, 800] as const).map(async (weight) => ({
      name: "Inter",
      weight,
      style: "normal" as const,
      data: await fetch(`https://cdn.jsdelivr.net/fontsource/fonts/inter@5.0.8/latin-${weight}-normal.woff`).then((r) => r.arrayBuffer()),
    })),
  )
  return fonts
}

async function asDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const type = res.headers.get("content-type") ?? "image/jpeg"
    if (!/^image\/(png|jpe?g|gif|webp)/.test(type)) return null
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const title = (url.searchParams.get("t") ?? "NC United Wrestling").slice(0, 90)
  const line = (url.searchParams.get("s") ?? "").slice(0, 160)
  const kicker = (url.searchParams.get("k") ?? "NC UNITED WRESTLING").slice(0, 50).toUpperCase()
  const imageUrl = allowedImage(url.searchParams.get("img"), url.origin)
  const [loaded, picture] = await Promise.all([loadFonts(), imageUrl ? asDataUrl(imageUrl) : null])
  const logo = await asDataUrl(`${url.origin}/images/nc-united-logo-official.png`)
  const titleSize = title.length > 40 ? 56 : title.length > 24 ? 68 : 80

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: NAVY, fontFamily: "Inter", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 14, height: "100%", background: GOLD }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "56px 56px 48px 76px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} width={64} height={64} alt="" /> : null}
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 5, color: GOLD }}>{kicker}</span>
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: titleSize, fontWeight: 800, lineHeight: 1.02, color: "#FFFFFF", letterSpacing: -1.5 }}>
            {title}
          </div>
          <div style={{ marginTop: 18, width: 110, height: 6, background: GOLD }} />
          {line ? (
            <div style={{ display: "flex", marginTop: 22, fontSize: 30, fontWeight: 400, lineHeight: 1.3, color: "rgba(255,255,255,0.8)" }}>{line}</div>
          ) : null}
          <div style={{ display: "flex", marginTop: "auto", paddingTop: 28, fontSize: 20, letterSpacing: 3, color: "rgba(255,255,255,0.6)" }}>
            APP.NCWRESTLINGUNITED.COM
          </div>
        </div>
        {picture ? (
          <div style={{ display: "flex", width: 430, height: "100%", alignItems: "center", justifyContent: "center", background: "#0B1D3A" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={picture} width={430} height={630} style={{ objectFit: "cover" }} alt="" />
          </div>
        ) : null}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: loaded,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    },
  )
}
