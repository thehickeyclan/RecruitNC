import { describe, expect, it } from "vitest"
import type { NewsItem } from "@/lib/news"
import {
  NEWS_PRIMARY_SHARE_FORMAT,
  newsArticleNeedsStoryArt,
  newsShareImageObjectFit,
  newsShareUsesDedicatedStoryArt,
  resolveNewsShareImageSource,
} from "@/lib/news-image-guidelines"

const baseItem: NewsItem = {
  id: "test",
  slug: "test-article",
  title: "Test",
  summary: "Summary",
  href: "/news/test-article",
  date: "2026-07-11",
  image: "/images/hero.png",
  isAnnouncement: true,
}

describe("news image guidelines", () => {
  it("treats IG Story as the primary share format", () => {
    expect(NEWS_PRIMARY_SHARE_FORMAT).toBe("ig-story")
  })

  it("prefers shareStoryImage for vertical share formats", () => {
    const item: NewsItem = {
      ...baseItem,
      shareStoryImage: "/images/story.png",
    }

    expect(resolveNewsShareImageSource(item, "ig-story")).toBe("/images/story.png")
    expect(resolveNewsShareImageSource(item, "ig-portrait")).toBe("/images/story.png")
    expect(resolveNewsShareImageSource(item, "ig-square")).toBe("/images/hero.png")
    expect(newsShareUsesDedicatedStoryArt(item, "ig-story")).toBe(true)
    expect(newsShareImageObjectFit(item, "ig-story")).toBe("cover")
  })

  it("flags landscape designed banners that need dedicated story art", () => {
    const item: NewsItem = {
      ...baseItem,
      slug: "aau-scholastic-duals-2026-florida",
      newsListBanner: true,
      imageFit: "contain",
    }

    expect(newsArticleNeedsStoryArt(item)).toBe(true)
  })
})
