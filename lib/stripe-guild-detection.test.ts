import { describe, expect, it } from "vitest"
import {
  isGuildCheckoutSession,
  isGuildOrderRow,
  isGuildStripeMetadata,
  stripeUrlLooksLikeGuild,
} from "./stripe-guild-detection"

describe("isGuildStripeMetadata", () => {
  it("detects explicit channel and business tags", () => {
    expect(isGuildStripeMetadata({ channel: "guild" })).toBe(true)
    expect(isGuildStripeMetadata({ business: "wrestling_guild" })).toBe(true)
    expect(isGuildStripeMetadata({ source: "guild_booking" })).toBe(true)
    expect(isGuildStripeMetadata({ booking_id: "abc-123" })).toBe(true)
  })

  it("ignores RecruitNC store metadata", () => {
    expect(isGuildStripeMetadata({ channel: "recruitnc", items: "[]" })).toBe(false)
    expect(isGuildStripeMetadata({ channel: "spartan" })).toBe(false)
  })
})

describe("isGuildCheckoutSession", () => {
  it("detects wrestlingguild.com return URLs", () => {
    expect(
      isGuildCheckoutSession({
        success_url: "https://www.wrestlingguild.com/bookings/complete?session_id={CHECKOUT_SESSION_ID}",
      }),
    ).toBe(true)
  })

  it("detects metadata-only guild sessions", () => {
    expect(isGuildCheckoutSession({ metadata: { channel: "guild" } })).toBe(true)
  })
})

describe("stripeUrlLooksLikeGuild", () => {
  it("matches host with or without www", () => {
    expect(stripeUrlLooksLikeGuild("https://wrestlingguild.com/parent")).toBe(true)
    expect(stripeUrlLooksLikeGuild("https://app.ncwrestlingunited.com/store")).toBe(false)
  })
})

describe("isGuildOrderRow", () => {
  it("reads persisted channel and shipping method", () => {
    expect(isGuildOrderRow({ channel: "guild" })).toBe(true)
    expect(isGuildOrderRow({ shipping_method: { name: "Wrestling Guild", price: 0 } })).toBe(true)
    expect(isGuildOrderRow({ channel: "recruitnc" })).toBe(false)
  })
})
