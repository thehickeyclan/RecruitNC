import { describe, expect, it } from "vitest"
import { buildStoreOrderStaffSmsBody, formatStoreOrderItemsForStaffSms } from "./order-staff-sms"

describe("formatStoreOrderItemsForStaffSms", () => {
  it("formats quantity and variant in plain English", () => {
    const text = formatStoreOrderItemsForStaffSms([
      {
        product_name: "NHSCA Duals 2025 Singlet",
        variant: { color: "Red", size: "M" },
        quantity: 1,
        price: 75,
      },
      {
        product_name: "NC United Tee",
        variant: { color: "Navy Blue", size: "L" },
        quantity: 2,
        price: 30,
      },
    ])
    expect(text).toContain("1× NHSCA Duals 2025 Singlet (Red, M)")
    expect(text).toContain("2× NC United Tee (Navy Blue, L)")
  })
})

describe("buildStoreOrderStaffSmsBody", () => {
  it("includes customer, products, and total", () => {
    const body = buildStoreOrderStaffSmsBody({
      orderNumber: "NC-ABC123",
      customerName: "Jane Smith",
      customerEmail: "jane@example.com",
      total: 135,
      itemRows: [
        {
          product_name: "NC United First In Flight Singlet",
          variant: { color: "Blue", size: "M" },
          quantity: 1,
          price: 75,
        },
      ],
    })
    expect(body).toMatch(/^NC United Store: Jane Smith placed order NC-ABC123 for \$135\.00 —/)
    expect(body).toContain("First In Flight Singlet")
  })
})
