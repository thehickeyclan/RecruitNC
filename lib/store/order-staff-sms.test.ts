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
    // What was bought comes first: it is the line you read before deciding whether to care.
    expect(body).toMatch(/^NC United Store: 1× NC United First In Flight Singlet \(Blue, M\)/)
    expect(body).toContain("$135.00 — Jane Smith (jane@example.com)")
    expect(body).toContain("NC-ABC123")
    expect(body).toContain("/admin/orders")
  })

  it("calls a drop-in a drop-in rather than a store sale", () => {
    /*
     * The alert that prompted this: a drop-in for the 11 October practice arrived as
     * "NC United Store: ... 1x NC United Store purchase", with no event and no date.
     */
    const body = buildStoreOrderStaffSmsBody({
      orderNumber: "NC-K13OYN-Z7RL",
      customerName: "Vincent Defreitas",
      customerEmail: "vince@example.com",
      total: 25,
      orderType: "drop_in",
      itemRows: [
        { product_name: "NC United Drop-In: Blue Practice — Sunday, October 11, 2026", quantity: 1, price: 25 },
      ],
    })
    expect(body.startsWith("NC United drop-in:")).toBe(true)
    expect(body).toContain("Blue Practice — Sunday, October 11, 2026")
    expect(body).not.toContain("NC United Store purchase")
  })

  it("names the shipping choice when there is one", () => {
    const body = buildStoreOrderStaffSmsBody({
      orderNumber: "NC-XYZ",
      customerName: "Jane Smith",
      customerEmail: "jane@example.com",
      total: 40,
      shippingLabel: "Pickup at practice",
      itemRows: [{ product_name: "NC United Tee", quantity: 1, price: 40 }],
    })
    expect(body).toContain("Ship: Pickup at practice")
  })

  it("does not repeat the email when it is standing in for the name", () => {
    const body = buildStoreOrderStaffSmsBody({
      orderNumber: "NC-XYZ",
      customerName: null,
      customerEmail: "jane@example.com",
      total: 40,
      itemRows: [{ product_name: "NC United Tee", quantity: 1, price: 40 }],
    })
    expect(body).toContain("$40.00 — jane@example.com")
    expect(body).not.toContain("(jane@example.com)")
  })
})
