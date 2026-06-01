import { describe, expect, it } from "vitest"
import {
  buildTruncatedLegacyOrderNote,
  isTruncatedLegacyStoreMetadata,
  legacyStoreMetadataHasCart,
} from "./legacy-checkout-guard"

describe("legacy-checkout-guard", () => {
  it("detects truncated Stripe metadata (Moody-style)", () => {
    const meta = {
      item_count: "16",
      subtotal: "600",
      items: JSON.stringify([
        { i: 1, n: "Navy crewneck", q: 1, p: 50, v: "Navy/S" },
        { i: 1, n: "Navy crewneck", q: 1, p: 50, v: "Navy/M" },
        { i: 1, n: "Navy crewneck", q: 1, p: 50, v: "Navy/L" },
        { i: 1, n: "Navy crewneck", q: 1, p: 50, v: "Navy/XL" },
        { i: 2, n: "Red Champion", q: 1, p: 50, v: "Red/S" },
        { i: 2, n: "Red Champion", q: 1, p: 50, v: "Red/M" },
        { i: 2, n: "Red Champion", q: 1, p: 50, v: "Red/L" },
      ]),
      customer_email: "jack@example.com",
    }
    expect(legacyStoreMetadataHasCart(meta)).toBe(true)
    expect(isTruncatedLegacyStoreMetadata(meta)).toBe(true)
    expect(buildTruncatedLegacyOrderNote(meta)).toContain("TRUNCATED_LEGACY_CHECKOUT")
  })

  it("allows complete small carts", () => {
    const meta = {
      item_count: "2",
      subtotal: "100",
      items: JSON.stringify([
        { i: 1, n: "Tee", q: 1, p: 50, v: "Navy/M" },
        { i: 2, n: "Tee", q: 1, p: 50, v: "Red/L" },
      ]),
      customer_email: "a@b.com",
    }
    expect(isTruncatedLegacyStoreMetadata(meta)).toBe(false)
  })
})
