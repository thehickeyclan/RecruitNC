import { describe, expect, it } from "vitest"

import { collegeCoachIds, weeklyUsage } from "./coach-usage"

describe("collegeCoachIds", () => {
  it("counts all three sources and leaves out staff, athletes and test accounts", () => {
    const ids = collegeCoachIds(
      [
        { user_id: "a", email: "a@x.edu", role: "fan", profile_type: "college-coach", verified_coach: false, institution: null },
        { user_id: "b", email: "b@gmail.com", role: "college_coach", profile_type: "fan", verified_coach: true, institution: "Campbell University" },
        { user_id: "c", email: "c@gmail.com", role: "fan", profile_type: "fan", verified_coach: true, institution: "NC United Wrestling" },
        { user_id: "d", email: "d@coker.edu", role: "athlete", profile_type: "fan", verified_coach: true, institution: "Coker University" },
        { user_id: "e", email: "e@x.com", role: "admin", profile_type: "college-coach", verified_coach: true, institution: null },
        { user_id: "f", email: "testcoach.thehickeyclan@gmail.com", role: "college_coach", profile_type: "college-coach", verified_coach: true, institution: null },
        { user_id: "g", email: "g@gmail.com", role: "fan", profile_type: "fan", verified_coach: false, institution: null },
        { user_id: "h", email: "h@school.edu", role: "fan", profile_type: "fan", verified_coach: false, institution: "Some College" },
      ],
      [
        { id: "g", email: "g@gmail.com", user_metadata: { profile_type: "college_coach" } },
        { id: "e", email: "e@x.com", user_metadata: { profile_type: "college-coach" } },
        { id: "i", email: "i@x.com", user_metadata: { role: "college-coach" } },
      ],
    )
    // h: a .edu address alone is not a coach.
    expect([...ids].sort()).toEqual(["a", "b", "g", "i"])
  })
})

describe("weeklyUsage", () => {
  it("splits by site and counts each coach once under All", () => {
    const now = new Date("2026-11-08T00:00:00Z")
    const at = "2026-11-05T12:00:00Z"
    const rows = weeklyUsage({
      coaches: new Set(["c1", "c2"]),
      events: [
        { user_id: "c1", event_type: "page_view", created_at: at, event_data: { site: "rw" } },
        { user_id: "c1", event_type: "profile_view", created_at: at, event_data: { site: "ncu", athlete_id: "x" } },
        { user_id: "c1", event_type: "profile_view", created_at: at, event_data: { site: "ncu", athlete_id: "x" } },
        { user_id: "c2", event_type: "profile_view", created_at: at, event_data: { site: "rw", athlete_id: "y" } },
        { user_id: "fan", event_type: "profile_view", created_at: at, event_data: { site: "rw", athlete_id: "z" } },
        { user_id: "c2", event_type: "page_view", created_at: "2026-10-20T00:00:00Z", event_data: { site: "rw" } },
      ],
      stars: [{ coach_user_id: "c2", athlete_id: "y", starred_at: at }],
      needs: [{ posted_by: "c2", site: "rw", created_at: at, confirmed_at: at, cleared_at: null }],
      now,
      weeks: 3,
    })
    const w = rows[0]!
    expect(w.all).toEqual({ activeCoaches: 2, profilesReviewed: 2, profileViews: 3, starred: 1, starringCoaches: 1, needsPosted: 1 })
    expect(w.bySite.rw.activeCoaches).toBe(2)
    expect(w.bySite.ncu).toMatchObject({ activeCoaches: 1, profilesReviewed: 1, profileViews: 2 })
    expect(rows[1]!.all.activeCoaches).toBe(0)
    expect(rows[2]!.all.activeCoaches).toBe(1)
  })
})
