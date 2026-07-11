import { describe, expect, it } from "vitest"
import {
  NEWS_SHARE_FORMATS,
  facebookShareUrl,
  newsArticleShareUrl,
  newsShareImageApiPath,
  newsShareImageFilename,
  parseNewsShareFormat,
} from "@/lib/news-share-formats"

describe("news share formats", () => {
  it("parses known format ids", () => {
    expect(parseNewsShareFormat("ig-square")).toBe("ig-square")
    expect(parseNewsShareFormat("facebook")).toBe("facebook")
    expect(parseNewsShareFormat("invalid")).toBeNull()
    expect(parseNewsShareFormat(null)).toBeNull()
  })

  it("defines platform dimensions", () => {
    const square = NEWS_SHARE_FORMATS.find((f) => f.id === "ig-square")
    const story = NEWS_SHARE_FORMATS.find((f) => f.id === "ig-story")
    const facebook = NEWS_SHARE_FORMATS.find((f) => f.id === "facebook")

    expect(square).toMatchObject({ width: 1080, height: 1080 })
    expect(story).toMatchObject({ width: 1080, height: 1920 })
    expect(facebook).toMatchObject({ width: 1200, height: 630 })
  })

  it("builds share URLs and API paths", () => {
    const url = newsArticleShareUrl("jumping-levels-what-drives-rapid-improvement")
    expect(url).toContain("/news/jumping-levels-what-drives-rapid-improvement")
    expect(url).toContain("utm_source=share")
    expect(url).toContain("utm_medium=social")

    expect(newsShareImageApiPath("finding-flow-on-the-mat", "ig-story")).toBe(
      "/api/news/finding-flow-on-the-mat/share-image?format=ig-story",
    )

    expect(newsShareImageFilename("finding-flow-on-the-mat", "facebook")).toBe(
      "finding-flow-on-the-mat-facebook.png",
    )
  })

  it("builds facebook sharer URL", () => {
    const fb = facebookShareUrl("https://app.ncwrestlingunited.com/news/test?utm_source=share")
    expect(fb).toContain("facebook.com/sharer/sharer.php")
    expect(fb).toContain(encodeURIComponent("https://app.ncwrestlingunited.com/news/test?utm_source=share"))
  })
})
