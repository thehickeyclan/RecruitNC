import { describe, expect, it } from "vitest"
import { getAnnouncementBySlug, newsShareUsesHeroCropOnly } from "@/lib/news"

describe("news share hero crop detection", () => {
  it("uses crop-only for designed contain banners like AAU and JUMPS", () => {
    const jumps = getAnnouncementBySlug("jumping-levels-what-drives-rapid-improvement")
    const aau = getAnnouncementBySlug("aau-scholastic-duals-2026-florida")
    const awards = getAnnouncementBySlug("nc-united-recruiting-awards-2026")

    expect(jumps).toBeDefined()
    expect(aau).toBeDefined()
    expect(awards).toBeDefined()

    expect(newsShareUsesHeroCropOnly(jumps!)).toBe(true)
    expect(newsShareUsesHeroCropOnly(aau!)).toBe(true)
    expect(newsShareUsesHeroCropOnly(awards!)).toBe(true)
  })

  it("uses crop-only for cover-fit designed banners like Real Cost", () => {
    const realCost = getAnnouncementBySlug("real-cost-elite-wrestling-nc-smarter-build")
    expect(realCost).toBeDefined()
    expect(newsShareUsesHeroCropOnly(realCost!)).toBe(true)
  })

  it("keeps overlay mode for photo cover heroes like Finding Flow", () => {
    const flow = getAnnouncementBySlug("finding-flow-on-the-mat")
    expect(flow).toBeDefined()
    expect(newsShareUsesHeroCropOnly(flow!)).toBe(false)
  })
})
