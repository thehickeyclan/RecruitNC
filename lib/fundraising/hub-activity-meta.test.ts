import { describe, expect, it } from "vitest"
import {
  hubActivityGiftSourceLabels,
  HUB_GIFT_SOURCE_UNSPECIFIED,
  publicGiftCampaignLabelWithCheckoutSurface,
} from "@/lib/fundraising/hub-activity-meta"

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

describe("publicGiftCampaignLabelWithCheckoutSurface", () => {
  const may2026Utc = "2026-05-12T12:00:00.000Z"

  it("athlete_page uses neutral season/year, not Spartan campaign tab copy", () => {
    expect(publicGiftCampaignLabelWithCheckoutSurface("fayetteville_2026", may2026Utc, "athlete_page")).toBe(
      "Athlete page · Spring 2026",
    )
  })

  it("spartan_team_page still shows registry gift label after the surface prefix", () => {
    expect(publicGiftCampaignLabelWithCheckoutSurface("fayetteville_2026", may2026Utc, "spartan_team_page")).toBe(
      "Spartan page · Spring Spartan 2026",
    )
  })

  it("no surface keeps full campaign label", () => {
    expect(publicGiftCampaignLabelWithCheckoutSurface("fayetteville_2026", may2026Utc, null)).toBe("Spring Spartan 2026")
  })
})
