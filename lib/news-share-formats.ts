/**
 * Platform-sized share image presets for /news articles.
 * Separate from OG/link-preview metadata — these are download assets for IG/FB posts.
 */

export type NewsShareFormatId = "ig-square" | "ig-portrait" | "ig-story" | "facebook"

export type NewsShareFormat = {
  id: NewsShareFormatId
  width: number
  height: number
  label: string
  shortLabel: string
}

export const NEWS_SHARE_FORMATS: NewsShareFormat[] = [
  {
    id: "ig-square",
    width: 1080,
    height: 1080,
    label: "Instagram (square)",
    shortLabel: "IG Square",
  },
  {
    id: "ig-story",
    width: 1080,
    height: 1920,
    label: "Instagram Story",
    shortLabel: "IG Story",
  },
  {
    id: "facebook",
    width: 1200,
    height: 630,
    label: "Facebook",
    shortLabel: "Facebook",
  },
  {
    id: "ig-portrait",
    width: 1080,
    height: 1350,
    label: "Instagram (portrait)",
    shortLabel: "IG Portrait",
  },
]

export const NEWS_SHARE_PRIMARY_FORMATS = NEWS_SHARE_FORMATS.filter(
  (f) => f.id !== "ig-portrait",
)

export const NEWS_SHARE_FORMAT_MAP = Object.fromEntries(
  NEWS_SHARE_FORMATS.map((f) => [f.id, f]),
) as Record<NewsShareFormatId, NewsShareFormat>

const FORMAT_IDS = new Set<string>(NEWS_SHARE_FORMATS.map((f) => f.id))

export function parseNewsShareFormat(raw: string | null | undefined): NewsShareFormatId | null {
  if (!raw || !FORMAT_IDS.has(raw)) return null
  return raw as NewsShareFormatId
}

export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://app.ncwrestlingunited.com"
  return raw.replace(/\/$/, "")
}

/** Shareable article URL with light UTM tagging. */
export function newsArticleShareUrl(slug: string, campaign = "news"): string {
  const base = getAppBaseUrl()
  const url = new URL(`${base}/news/${slug}`)
  url.searchParams.set("utm_source", "share")
  url.searchParams.set("utm_medium", "social")
  url.searchParams.set("utm_campaign", campaign)
  return url.toString()
}

export function newsShareImageApiPath(slug: string, format: NewsShareFormatId): string {
  return `/api/news/${encodeURIComponent(slug)}/share-image?format=${format}`
}

export function newsShareImageFilename(slug: string, format: NewsShareFormatId): string {
  return `${slug}-${format}.png`
}

export function facebookShareUrl(articleUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`
}

export type SharePlatform = "instagram" | "facebook"

export type ShareFormatChoice = {
  format: NewsShareFormatId
  label: string
  description: string
}

export const SHARE_PLATFORM_LABELS: Record<SharePlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
}

export const SHARE_PLATFORM_FORMATS: Record<SharePlatform, ShareFormatChoice[]> = {
  instagram: [
    {
      format: "ig-story",
      label: "Story",
      description: "1080×1920 — recommended",
    },
    {
      format: "ig-square",
      label: "Square post",
      description: "1080×1080",
    },
    {
      format: "ig-portrait",
      label: "Portrait post",
      description: "1080×1350",
    },
  ],
  facebook: [
    {
      format: "facebook",
      label: "Post",
      description: "1200×630",
    },
  ],
}
