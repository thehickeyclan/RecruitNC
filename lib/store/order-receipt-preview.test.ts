import { describe, expect, it } from "vitest"
import { buildOrderReceiptPreview, mapOrderItemsToReceiptLines } from "./order-receipt-preview"

describe("order-receipt-preview", () => {
  it("matches email line labels with color and size", () => {
    const lines = mapOrderItemsToReceiptLines([
      {
        product_name: "Navy Crewneck",
        variant: { color: "Navy", size: "M" },
        quantity: 2,
        price: 50,
      },
    ])
    expect(lines[0].lineLabel).toBe("Navy Crewneck (Navy / M)")
    expect(lines[0].quantity).toBe(2)
  })

  it("builds preview totals from order row", () => {
    const preview = buildOrderReceiptPreview(
      {
        order_number: "NC-ABC-123",
        customer_name: "Jack Moody",
        customer_email: "jack@example.com",
        subtotal: 100,
        shipping_cost: 10,
        tax: 8,
        discount: 0,
        total: 118,
        shipping_address: {
          firstName: "Jack",
          lastName: "Moody",
          address1: "1 Main St",
          city: "Raleigh",
          state: "NC",
          zipCode: "27601",
        },
      },
      [{ product_name: "Tee", variant: { color: "Red", size: "L" }, quantity: 2, price: 50, subtotal: 100 }],
      { sent_at: "2026-05-28T12:00:00Z", recipient_email: "jack@example.com" },
    )
    expect(preview.orderNumber).toBe("NC-ABC-123")
    expect(preview.total).toBe(118)
    expect(preview.sentToEmail).toBe("jack@example.com")
    expect(preview.shippingAddressPlain).toContain("Raleigh")
  })
})
