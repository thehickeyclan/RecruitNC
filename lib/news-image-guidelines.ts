/**
 * Editorial + technical guidance for news article images and social sharing.
 * IG Story (1080×1920) is the primary share format — optimize uploads for it.
 */

import type { NewsItem } from "@/lib/news"
import { newsShareUsesHeroCropOnly } from "@/lib/news"
import type { NewsShareFormatId } from "@/lib/news-share-formats"

export const NEWS_PRIMARY_SHARE_FORMAT: NewsShareFormatId = "ig-story"

export const NEWS_IMAGE_GUIDELINES = {
  /** Most common share path — design for this first. */
  primary: { format: "ig-story" as const, width: 1080, height: 1920, aspect: "9:16" },
  story: { width: 1080, height: 1920, aspect: "9:16" },
  square: { width: 1080, height: 1080, aspect: "1:1" },
  portrait: { width: 1080, height: 1350, aspect: "4:5" },
  facebook: { width: 1200, height: 630, aspect: "1.91:1" },
  /** Landscape hero for /news cards; pair with shareStoryImage for full-screen Story shares. */
  listBanner: { width: 1200, height: 630, aspect: "~2:1" },
} as const

export const NEWS_IMAGE_EDITORIAL_NOTE =
  "Design IG Story art first (1080×1920). Use image for the article/list banner; add shareStoryImage when Story needs a dedicated vertical asset."

const VERTICAL_SHARE_FORMATS = new Set<NewsShareFormatId>(["ig-story", "ig-portrait"])

/** Image file used when generating a given share format. */
export function resolveNewsShareImageSource(
  item: NewsItem,
  format: NewsShareFormatId,
): string | undefined {
  if (VERTICAL_SHARE_FORMATS.has(format) && item.shareStoryImage) {
    return item.shareStoryImage
  }
  return item.image
}

export function newsShareUsesDedicatedStoryArt(
  item: NewsItem,
  format: NewsShareFormatId,
): boolean {
  return Boolean(VERTICAL_SHARE_FORMATS.has(format) && item.shareStoryImage)
}

/** Landscape designed banner without dedicated Story art — Story shares will letterbox. */
export function newsArticleNeedsStoryArt(item: NewsItem): boolean {
  return Boolean(item.image && !item.shareStoryImage && newsShareUsesHeroCropOnly(item))
}

/** Dedicated vertical story art should fill the frame; landscape heroes stay contain. */
export function newsShareImageObjectFit(
  item: NewsItem,
  format: NewsShareFormatId,
): "cover" | "contain" {
  if (newsShareUsesDedicatedStoryArt(item, format)) return "cover"
  if (newsShareUsesHeroCropOnly(item)) return "contain"
  return "cover"
}
