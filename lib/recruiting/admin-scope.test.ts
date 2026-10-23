import { describe, expect, it } from "vitest"
import { isCommunityAdminPath } from "@/lib/recruiting/admin-scope"

describe("which admin tools are NC United's community site", () => {
  it("keeps Blue, store, TOC, national team, fundraising and calendar on NC United", () => {
    for (const p of ["/admin/blue", "/admin/blue/subscriptions", "/admin/store", "/admin/orders", "/admin/toc", "/admin/toc/plan", "/admin/national-team", "/admin/fundraising", "/admin/fundraising-ledger", "/admin/calendar", "/admin/revenue", "/admin/messaging?x=1"]) {
      expect(isCommunityAdminPath(p), p).toBe(true)
    }
  })
  it("leaves the recruiting tools on RecruitWrestlers", () => {
    for (const p of ["/admin", "/admin/rankings/board", "/admin/athletes", "/admin/crm", "/admin/users-dashboard", "/admin/nhsca-placements", "/admin/identity-review", "/admin/coach-messages", "/admin/college-interest", "/admin/bluesky"]) {
      expect(isCommunityAdminPath(p), p).toBe(false)
    }
  })
})
