import { describe, expect, it } from "vitest"
import { hubActivityGiftSourceLabels, HUB_GIFT_SOURCE_UNSPECIFIED } from "@/lib/fundraising/hub-activity-meta"

describe("hubActivityGiftSourceLabels", () => {
  it("labels athlete_page and keeps campaign name separate", () => {
    const x = hubActivityGiftSourceLabels("fayetteville_2026", "athlete_page")
    expect(x.giftSourceLabel).toBe("Athlete page")
    expect(x.campaignNameLabel.length).toBeGreaterThan(0)
    expect(x.campaignStripeSlug).toBeTruthy()
  })

  it("uses Unspecified when surface unknown", () => {
    const x = hubActivityGiftSourceLabels("fayetteville_2026", null)
    expect(x.giftSourceLabel).toBe(HUB_GIFT_SOURCE_UNSPECIFIED)
  })
})
