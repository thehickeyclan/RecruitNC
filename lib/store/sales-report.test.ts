import { describe, expect, it } from "vitest"
import {
  buildStoreSalesReport,
  classifyStoreProductFamily,
  isPaidStoreApparelLine,
  normalizeStoreSize,
} from "./sales-report"

describe("normalizeStoreSize", () => {
  it("normalizes common abbreviations", () => {
    expect(normalizeStoreSize("medium")).toBe("M")
    expect(normalizeStoreSize("M")).toBe("M")
    expect(normalizeStoreSize("One Size")).toBe("")
  })
})

describe("classifyStoreProductFamily", () => {
  it("detects singlets by name", () => {
    expect(classifyStoreProductFamily({ name: "NHSCA Duals 2025 Singlet", category: "athletic-wear" })).toBe(
      "singlet",
    )
  })

  it("detects tees", () => {
    expect(classifyStoreProductFamily({ name: "NC United First In Flight Tee", category: "t-shirts" })).toBe("tee")
  })
})

describe("buildStoreSalesReport", () => {
  const baseLine = {
    orderId: "o1",
    orderDate: "2026-03-10T12:00:00.000Z",
    orderStatus: "paid",
    shippingMethod: { name: "Standard Shipping" },
    channel: "store",
    productId: "p1",
    productName: "NC United First In Flight Singlet",
    productCategory: "athletic-wear",
    productSlug: "first-in-flight-singlet",
    variant: { color: "Blue", size: "M" },
    quantity: 2,
    lineRevenue: 150,
  }

  it("counts medium singlets for the year", () => {
    const report = buildStoreSalesReport([baseLine], { year: 2026, family: "singlet", size: "M" })
    expect(report.summary.units).toBe(2)
    expect(report.summary.revenue).toBe(150)
    expect(report.topByRevenue[0]?.name).toContain("Singlet")
  })

  it("excludes blue subscriptions", () => {
    const ok = isPaidStoreApparelLine(
      { orderStatus: "paid", channel: "store", shippingMethod: { name: "Standard Shipping" } },
      { productName: "NC United Blue – Monthly" },
    )
    expect(ok).toBe(false)
  })

  it("ranks tees by revenue", () => {
    const report = buildStoreSalesReport(
      [
        {
          ...baseLine,
          orderId: "o2",
          productId: "p2",
          productName: "Legacy Tee",
          productCategory: "t-shirts",
          productSlug: "legacy-tee",
          variant: { color: "Navy", size: "L" },
          quantity: 1,
          lineRevenue: 30,
        },
        {
          ...baseLine,
          orderId: "o3",
          productId: "p3",
          productName: "Top Seller Tee",
          productCategory: "t-shirts",
          productSlug: "top-seller-tee",
          variant: { color: "Gold", size: "M" },
          quantity: 5,
          lineRevenue: 150,
        },
      ],
      { year: 2026, family: "tee" },
    )
    expect(report.topByRevenue[0]?.name).toBe("Top Seller Tee")
    expect(report.topByUnits[0]?.units).toBe(5)
  })
})
