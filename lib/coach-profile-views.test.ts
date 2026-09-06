import { describe, expect, it } from "vitest"
import { teaseCoachViews, type CoachViewSummary } from "@/lib/coach-profile-views"

const summary = (over: Partial<CoachViewSummary> = {}): CoachViewSummary => ({
  schools: [],
  totalViews: 0,
  distinctCoaches: 0,
  recentViews: 0,
  ...over,
})

describe("teaseCoachViews", () => {
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
    expect(tease).toEqual({ hasViews: true, programCount: 2, totalViews: 5 })
  })

  it("never invents interest when there is none", () => {
    // Teasing "someone looked" when nobody did is the exact lie that makes families
    // distrust recruiting sites.
    expect(teaseCoachViews(summary())).toEqual({ hasViews: false, programCount: 0, totalViews: 0 })
  })
})
