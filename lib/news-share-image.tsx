import { ImageResponse } from "next/og"
import type { NewsItem } from "@/lib/news"
import { newsShareUsesHeroCropOnly } from "@/lib/news"
import {
  NEWS_SHARE_FORMAT_MAP,
  getAppBaseUrl,
  newsShareImageFilename,
  type NewsShareFormatId,
} from "@/lib/news-share-formats"

const NAVY = "#13294B"
const GOLD = "#D3B574"
const WHITE = "#FFFFFF"

function absoluteAssetUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const base = getAppBaseUrl()
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

let fontsPromise: Promise<
  { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[]
> | null = null

async function loadShareFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fetch(
        "https://cdn.jsdelivr.net/fontsource/fonts/inter@5.0.8/latin-700-normal.woff",
      ).then((r) => r.arrayBuffer()),
      fetch(
        "https://cdn.jsdelivr.net/fontsource/fonts/inter@5.0.8/latin-400-normal.woff",
      ).then((r) => r.arrayBuffer()),
    ]).then(([bold, regular]) => [
      { name: "Inter", data: bold, weight: 700 as const, style: "normal" as const },
      { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    ])
  }
  return fontsPromise
}

function footerHeight(formatId: NewsShareFormatId): number {
  if (formatId === "ig-story") return 120
  if (formatId === "facebook") return 72
  return 96
}

function titleFontSize(formatId: NewsShareFormatId): number {
  if (formatId === "facebook") return 44
  if (formatId === "ig-story") return 56
  return 52
}

function heroCropBackground(item: NewsItem): string {
  if (item.imageBannerBgClass?.includes("0A1628")) return "#0A1628"
  if (item.imageBannerBgClass?.includes("black")) return "#000000"
  if (item.imageBannerBgClass?.includes("stone")) return "#f5f5f4"
  return "#0A1628"
}

function HeroCropCard({
  item,
  formatId,
}: {
  item: NewsItem
  formatId: NewsShareFormatId
}) {
  const barH = footerHeight(formatId)
  const logoUrl = absoluteAssetUrl("/images/recruitnc-logo.png")

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: heroCropBackground(item),
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          position: "relative",
          overflow: "hidden",
          backgroundColor: heroCropBackground(item),
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={absoluteAssetUrl(item.image!)}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: item.imagePosition === "top" ? "top" : "center",
            backgroundColor: heroCropBackground(item),
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: barH,
          padding: "0 32px",
          backgroundColor: NAVY,
          color: WHITE,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" height={barH * 0.45} style={{ height: barH * 0.45 }} />
        <div
          style={{
            display: "flex",
            fontSize: formatId === "facebook" ? 18 : 22,
            color: GOLD,
            fontWeight: 700,
          }}
        >
          ncwrestlingunited.com
        </div>
      </div>
    </div>
  )
}

function HeroOverlayCard({
  item,
  formatId,
  height,
}: {
  item: NewsItem
  formatId: NewsShareFormatId
  height: number
}) {
  const logoUrl = absoluteAssetUrl("/images/recruitnc-logo.png")
  const overlayMin = formatId === "facebook" ? 0.42 : 0.48

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: NAVY,
        fontFamily: "Inter",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={absoluteAssetUrl(item.image!)}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: item.imagePosition === "top" ? "top" : "center",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(19,41,75,0.15) 0%, rgba(19,41,75,0.55) 45%, rgba(10,22,40,0.95) 100%)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          width: "100%",
          height: "100%",
          padding: formatId === "facebook" ? "40px 48px" : "48px 56px",
          position: "relative",
        }}
      >
        {item.category ? (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              backgroundColor: GOLD,
              color: NAVY,
              fontSize: formatId === "facebook" ? 16 : 20,
              fontWeight: 700,
              padding: "8px 18px",
              borderRadius: 999,
              marginBottom: 20,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {item.category}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            fontSize: titleFontSize(formatId),
            fontWeight: 700,
            color: WHITE,
            lineHeight: 1.15,
            maxHeight: `${height * overlayMin}px`,
            overflow: "hidden",
          }}
        >
          {item.title}
        </div>
        {item.subtitle ? (
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: formatId === "facebook" ? 24 : 28,
              color: "rgba(255,255,255,0.82)",
              lineHeight: 1.3,
              maxHeight: formatId === "facebook" ? 72 : 120,
              overflow: "hidden",
            }}
          >
            {item.subtitle}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 32,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" height={36} style={{ height: 36 }} />
          <div
            style={{
              display: "flex",
              fontSize: formatId === "facebook" ? 18 : 22,
              color: GOLD,
              fontWeight: 700,
            }}
          >
            RecruitNC
          </div>
        </div>
      </div>
    </div>
  )
}

function TemplateCard({
  item,
  formatId,
}: {
  item: NewsItem
  formatId: NewsShareFormatId
}) {
  const logoUrl = absoluteAssetUrl("/images/recruitnc-logo.png")
  const isStory = formatId === "ig-story"
  const pad = formatId === "facebook" ? 48 : 56

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: `linear-gradient(145deg, ${NAVY} 0%, #1a3a5c 55%, #0A1628 100%)`,
        padding: pad,
        fontFamily: "Inter",
        color: WHITE,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" height={isStory ? 48 : 40} style={{ height: isStory ? 48 : 40 }} />
        {item.category ? (
          <div
            style={{
              display: "flex",
              backgroundColor: GOLD,
              color: NAVY,
              fontSize: formatId === "facebook" ? 14 : 18,
              fontWeight: 700,
              padding: "6px 16px",
              borderRadius: 999,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {item.category}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          marginTop: isStory ? 48 : 24,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: titleFontSize(formatId),
            fontWeight: 700,
            lineHeight: 1.12,
            maxHeight: isStory ? 360 : formatId === "facebook" ? 200 : 280,
            overflow: "hidden",
          }}
        >
          {item.title}
        </div>
        {item.subtitle ? (
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: formatId === "facebook" ? 24 : 30,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.35,
              maxHeight: isStory ? 200 : 120,
              overflow: "hidden",
            }}
          >
            {item.subtitle}
          </div>
        ) : null}
        {item.author ? (
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: formatId === "facebook" ? 20 : 24,
              color: GOLD,
              fontWeight: 700,
            }}
          >
            {item.author}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "2px solid rgba(211,181,116,0.35)",
          paddingTop: 24,
          fontSize: formatId === "facebook" ? 18 : 22,
          color: GOLD,
          fontWeight: 700,
        }}
      >
        <span>app.ncwrestlingunited.com</span>
        <span>NC Wrestling United</span>
      </div>
    </div>
  )
}

export async function createNewsShareImage(
  item: NewsItem,
  formatId: NewsShareFormatId,
): Promise<Response> {
  const format = NEWS_SHARE_FORMAT_MAP[formatId]
  const fonts = await loadShareFonts()
  const filename = newsShareImageFilename(item.slug, formatId)

  const useHero = Boolean(item.image)
  const heroCropOnly = newsShareUsesHeroCropOnly(item)

  const element = useHero ? (
    heroCropOnly ? (
      <HeroCropCard item={item} formatId={formatId} />
    ) : (
      <HeroOverlayCard item={item} formatId={formatId} height={format.height} />
    )
  ) : (
    <TemplateCard item={item} formatId={formatId} />
  )

  return new ImageResponse(element, {
    width: format.width,
    height: format.height,
    fonts,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
