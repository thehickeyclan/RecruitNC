import { describe, expect, it } from "vitest"
import {
  buildWiqImportPreview,
  isWiqBlueProduct,
  mapWiqStatus,
  parseWiqAmountCents,
  parseWiqDate,
  parseWiqMembershipCsv,
} from "./blue-wiq-import"

const SAMPLE_ROW = `"Billed to","Wrestler names",Status,"Member since","Next due","Expires on",Total,"Billing interval","Membership type",Items,Discount,"Billing partner id"
Scott Moore,Spencer Moore,Paid,2/15/2026 06:33 pm," 6/15/2026 07:33 pm",,$51.00,/ month,Practice Fee,"NC United Blue ",,sub_w_test_paid
Ammon Scott,Ammon Scott,Canceled,3/23/2026 12:45 pm,Active until 5/23/2026 12:45 pm,,$51.00,/ month,Practice Fee,"NC United Blue ",,sub_w_test_cancel
Keith McNair,Tobin McNair,Overdue,11/30/2024 02:05 pm,Unknown,,$51.00,/ month,Practice Fee,"NC United Blue ",,sub_w_test_overdue
Chad Roberts,Kynzee Roberts,Paid,8/8/2025 07:44 pm," 6/8/2026 07:44 pm",,$51.00,/ month,Practice Fee,NC United Gold,,sub_w_gold_skip`

describe("parseWiqMembershipCsv", () => {
  it("filters to NC United Blue only", () => {
    const rows = parseWiqMembershipCsv(SAMPLE_ROW, new Date("2026-06-03"))
    expect(rows).toHaveLength(3)
    expect(rows.every((r) => isWiqBlueProduct(r.productLabel))).toBe(true)
  })

  it("maps Paid to active with next due", () => {
    const rows = parseWiqMembershipCsv(SAMPLE_ROW, new Date("2026-06-03"))
    const paid = rows.find((r) => r.wiqBillingPartnerId === "sub_w_test_paid")!
    expect(paid.status).toBe("active")
    expect(paid.amountCents).toBe(5100)
    expect(paid.nextDueAt).toMatch(/2026-06-15/)
  })

  it("maps Overdue to past_due", () => {
    const rows = parseWiqMembershipCsv(SAMPLE_ROW, new Date("2026-06-03"))
    expect(rows.find((r) => r.wiqBillingPartnerId === "sub_w_test_overdue")!.status).toBe("past_due")
  })

  it("maps Canceled with past active-until to cancelled", () => {
    const rows = parseWiqMembershipCsv(SAMPLE_ROW, new Date("2026-06-03"))
    expect(rows.find((r) => r.wiqBillingPartnerId === "sub_w_test_cancel")!.status).toBe("cancelled")
  })
})

describe("mapWiqStatus grace", () => {
  it("keeps canceled in grace when active-until is in the future", () => {
    const ref = new Date("2026-06-03")
    const mapped = mapWiqStatus("Canceled", "Active until 6/10/2026 12:00 pm", ref)
    expect(mapped.status).toBe("grace")
    expect(mapped.activeUntil).toMatch(/2026-06-10/)
  })
})

describe("parseWiqDate", () => {
  it("parses spaced next due dates", () => {
    expect(parseWiqDate(" 6/15/2026 07:33 pm")).toMatch(/2026-06-15/)
  })
})

describe("parseWiqAmountCents", () => {
  it("parses dollar amounts", () => {
    expect(parseWiqAmountCents("$38.25")).toBe(3825)
    expect(parseWiqAmountCents("$0.00")).toBe(0)
  })
})

describe("buildWiqImportPreview", () => {
  it("flags duplicate wrestler names", () => {
    const csv = `"Billed to","Wrestler names",Status,"Member since","Next due","Expires on",Total,"Billing interval","Membership type",Items,Discount,"Billing partner id"
X,Spencer Moore,Paid,1/1/2026 12:00 pm," 2/1/2026 12:00 pm",,$51.00,/ month,Practice Fee,"NC United Blue ",,sub_w_a
Y,Spencer Moore,Paid,2/1/2026 12:00 pm," 3/1/2026 12:00 pm",,$51.00,/ month,Practice Fee,"NC United Blue ",,sub_w_b`
    const preview = buildWiqImportPreview(
      csv,
      [{ id: "1", name: "Spencer Moore", firstName: "Spencer", lastName: "Moore", highSchool: null, gradYear: 2027 }],
      new Map(),
      [],
      new Date("2026-06-03"),
    )
    expect(preview.duplicateWrestlerNames).toContain("spencer moore")
    expect(preview.wouldFlagMissing).toEqual([])
  })
})
