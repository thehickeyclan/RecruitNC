import { describe, expect, it } from "vitest"

import { siteForHost } from "./analytics-site"
import { splitBySite, startOfTodayEastern } from "./site-split"

describe("siteForHost", () => {
  it("names RecruitWrestlers by address, or by its own project", () => {
    expect(siteForHost("www.recruitwrestlers.com", false)).toBe("rw")
    expect(siteForHost("recruitwrestlers.com:443", false)).toBe("rw")
    expect(siteForHost("app.ncwrestlingunited.com", false)).toBe("ncu")
    expect(siteForHost("localhost:3013", false)).toBe("ncu")
    expect(siteForHost("recruitwrestlers-git-x.vercel.app", true)).toBe("rw")
  })
})

describe("splitBySite", () => {
  const since = "2026-11-01T04:00:00.000Z"
  const ev = (user_id: string | null, event_type: string, site: string | null, created_at = "2026-11-01T15:00:00Z") => ({
    user_id,
    event_type,
    created_at,
    event_data: site ? { site } : null,
  })

  it("counts each event on its own site and leaves untagged rows untagged", () => {
    const out = splitBySite(
      [
        ev("a", "page_view", "rw"),
        ev("a", "page_view", "rw"),
        ev("b", "page_view", "ncu"),
        ev("c", "profile_claimed", "rw"),
        ev("d", "profile_claimed", "app"),
        ev("e", "signin_completed", "ncu"),
        ev("f", "page_view", null),
        ev("g", "page_view", "rw", "2026-10-31T12:00:00Z"),
      ],
      [
        { created_at: "2026-11-01T14:00:00Z", signup_brand: "recruitwrestlers" },
        { created_at: "2026-11-01T14:00:00Z", signup_brand: "ncunited" },
        { created_at: "2026-11-01T14:00:00Z", signup_brand: null },
        { created_at: "2026-10-30T14:00:00Z", signup_brand: "recruitwrestlers" },
      ],
      since,
    )
    expect(out.rw).toMatchObject({ accounts: 1, claims: 1, visitors: 1, pageViews: 2 })
    expect(out.ncu).toMatchObject({ accounts: 1, visitors: 1, signIns: 1 })
    expect(out.app.claims).toBe(1)
    expect(out.untagged).toMatchObject({ accounts: 1, pageViews: 1 })
  })
})

describe("startOfTodayEastern", () => {
  it("is midnight in North Carolina, daylight time and standard time", () => {
    expect(startOfTodayEastern(new Date("2026-10-15T18:00:00Z"))).toBe("2026-10-15T04:00:00.000Z")
    expect(startOfTodayEastern(new Date("2026-11-20T18:00:00Z"))).toBe("2026-11-20T05:00:00.000Z")
    expect(startOfTodayEastern(new Date("2026-11-21T02:00:00Z"))).toBe("2026-11-20T05:00:00.000Z")
    // 1 Nov 2026: clocks went back at 2am, so the day began on daylight time.
    expect(startOfTodayEastern(new Date("2026-11-01T19:00:00Z"))).toBe("2026-11-01T04:00:00.000Z")
    expect(startOfTodayEastern(new Date("2026-03-08T19:00:00Z"))).toBe("2026-03-08T05:00:00.000Z")
  })
})
