import { describe, expect, it } from "vitest"
import { buildPurchaseReceiptEmail, receiptKindForCheckout } from "./purchase-receipt"

describe("receiptKindForCheckout", () => {
  it("names each of our products", () => {
    expect(receiptKindForCheckout({ source: "scouting_report", kind: "subscription" })).toBe("subscription")
    expect(receiptKindForCheckout({ source: "scouting_report", kind: "subscription_annual" })).toBe("subscription")
    expect(receiptKindForCheckout({ source: "scouting_report", kind: "single" })).toBe("scouting_report")
    expect(receiptKindForCheckout({ channel: "blue", signup_id: "s1" })).toBe("blue")
    expect(receiptKindForCheckout({ channel: "blue", membership_id: "m1" })).toBe("blue")
    expect(receiptKindForCheckout({ source: "toc_reg", registration_type: "TOC Reg" })).toBe("toc_registration")
    expect(receiptKindForCheckout({ business: "nc_united_calendar" })).toBe("drop_in")
  })

  it("stays out of the Guild, unmarked sessions and flows with their own receipt", () => {
    expect(receiptKindForCheckout(null)).toBeNull()
    expect(receiptKindForCheckout({})).toBeNull()
    expect(receiptKindForCheckout({ channel: "guild" })).toBeNull()
    expect(receiptKindForCheckout({ app: "the-guild" })).toBeNull()
    expect(receiptKindForCheckout({ channel: "spartan", business: "nc_united" })).toBeNull()
    expect(receiptKindForCheckout({ source: "national_team", registration_id: "r1", channel: "recruitnc" })).toBeNull()
  })
})

describe("buildPurchaseReceiptEmail", () => {
  const base = {
    kind: "subscription" as const,
    firstName: "Sam",
    lines: [{ description: "RecruitNC <monthly>", amountCents: 999 }],
    totalCents: 999,
    paidAtIso: "2026-10-11T13:17:59.000Z",
    reference: "cs_test_123",
    recurring: true,
  }

  it("states the amount, the date and the reference, and offers the app", () => {
    const { subject, html, text } = buildPurchaseReceiptEmail(base)
    expect(subject).toBe("Your receipt: RecruitNC subscription ($9.99)")
    for (const body of [html, text]) {
      expect(body).toContain("$9.99")
      expect(body).toContain("October 11, 2026")
      expect(body).toContain("cs_test_123")
      expect(body).toContain("https://apps.apple.com/app/id6803202791")
      expect(body).toContain("recurring charge")
    }
    expect(html).toContain("RecruitNC &lt;monthly&gt;")
  })

  it("falls back to the product name when Stripe gave no line items, and omits the recurring note on a one-off", () => {
    const { html, text } = buildPurchaseReceiptEmail({ ...base, kind: "toc_registration", lines: [], recurring: false, firstName: null })
    expect(text).toContain("Tournament of Champions registration: $9.99")
    expect(text).toContain("Hi,")
    expect(html).not.toContain("recurring charge")
  })
})
