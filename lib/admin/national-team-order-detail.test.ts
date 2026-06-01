import { describe, expect, it } from "vitest"
import { buildNationalTeamAdminContextRows } from "./national-team-order-detail"

describe("buildNationalTeamAdminContextRows", () => {
  it("shows AAU hotel/van and flight purchased vs not", () => {
    const reg = {
      id: "1",
      event_slug: "aau-2026",
      athlete_first_name: "Aiden",
      athlete_last_name: "Burkholder",
      athlete_email: "a@b.com",
      parent_email: "parent@b.com",
      high_school: "HS",
      graduation_year: "2027",
      primary_weight: "132",
      reg_fee_cents: 75_00 + 315_00,
      apparel_fee_cents: 65_00 + 40_00,
      status: "paid",
      order_id: null,
      created_at: "",
      singlet_size: "M",
      shorts_size: "M",
      shirt_size: "SS-M, LS-L",
    }
    const lines = [
      { name: "Tournament registration", amount_cents: 7500 },
      { name: "Hotel & team van", amount_cents: 31500 },
      { name: "Singlet", amount_cents: 6500 },
      { name: "Long sleeve shirt", amount_cents: 4000 },
    ]
    const rows = buildNationalTeamAdminContextRows(reg, lines)
    const hotel = rows.find((r) => r.label === "Hotel & team van")
    const flight = rows.find((r) => r.label === "Team flight")
    expect(hotel?.value).toContain("Purchased")
    expect(flight?.value).toContain("Not purchased")
    expect(rows.some((r) => r.label === "Singlet size" && r.value === "M")).toBe(true)
  })
})
