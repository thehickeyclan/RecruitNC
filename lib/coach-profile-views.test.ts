import { describe, expect, it } from "vitest"
import { teaseCoachViews, type CoachViewSummary } from "@/lib/coach-profile-views"

const summary = (over: Partial<CoachViewSummary> = {}): CoachViewSummary => ({
  schools: [],
  visits: [],
  totalViews: 0,
  distinctCoaches: 0,
  recentViews: 0,
  ...over,
})

describe("teaseCoachViews", () => {
  it("shows a free viewer when and how often, with no program name anywhere in it", () => {
    const tease = teaseCoachViews(
      summary({
        totalViews: 3,
        schools: [{ school: "Ferrum College", lastViewedAt: "2026-08-25T01:18:00Z", views: 3 }],
        visits: [
          { school: "Ferrum College", at: "2026-08-25T01:18:00Z" },
          { school: "Ferrum College", at: "2026-08-25T01:12:00Z" },
          { school: "Johns Hopkins", at: "2026-10-05T14:44:00Z" },
        ],
      }),
    )
    expect(tease.visits).toEqual([
      { first: "2026-10-05T14:44:00Z", last: "2026-10-05T14:44:00Z", views: 1 },
      { first: "2026-08-25T01:12:00Z", last: "2026-08-25T01:18:00Z", views: 2 },
    ])
    // The paid half must not travel to a free browser in any form.
    expect(JSON.stringify(tease)).not.toMatch(/Ferrum|Hopkins/)
  })

  it("gives a free viewer the count without the names", () => {
    const tease = teaseCoachViews(
      summary({
        totalViews: 5,
        schools: [
          { school: "Campbell", lastViewedAt: "2026-09-01", views: 3 },
          { school: "Roanoke", lastViewedAt: "2026-08-20", views: 2 },
        ],
      }),
    )
    expect(tease).toEqual({ hasViews: true, programCount: 2, totalViews: 5, visits: [] })
  })

  it("never invents interest when there is none", () => {
    // Teasing "someone looked" when nobody did is the exact lie that makes families
    // distrust recruiting sites.
    expect(teaseCoachViews(summary())).toEqual({ hasViews: false, programCount: 0, totalViews: 0, visits: [] })
  })
})
