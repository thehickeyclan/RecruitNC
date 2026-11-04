import { describe, expect, it } from "vitest"
import { classifyFirstTouch, encodeFirstTouch, firstTouchFromRequest, sourceLabel } from "./traffic-source"

describe("classifyFirstTouch", () => {
  it("utm tags win over the referrer and mark paid", () => {
    const t = classifyFirstTouch({ utmSource: "facebook", utmMedium: "paid", utmCampaign: "claim_nc_sc", referrer: "https://www.google.com/" })
    expect(t).toMatchObject({ source: "facebook", medium: "paid", campaign: "claim_nc_sc" })
    expect(sourceLabel(t)).toBe("facebook (paid)")
  })

  it("reads social and search referrers, ignores our own sites", () => {
    expect(classifyFirstTouch({ referrer: "https://l.instagram.com/?u=x" }).source).toBe("instagram")
    expect(classifyFirstTouch({ referrer: "https://m.facebook.com/" }).source).toBe("facebook")
    expect(classifyFirstTouch({ referrer: "https://www.google.co.uk/" }).source).toBe("google")
    expect(classifyFirstTouch({ referrer: "https://www.recruitwrestlers.com/athletes" }).source).toBe("direct")
    expect(classifyFirstTouch({ referrer: "https://trackwrestling.com/x" }).source).toBe("trackwrestling.com")
  })

  it("strips the query from the landing page", () => {
    expect(classifyFirstTouch({ landing: "/claim?utm_source=ig" }).landing).toBe("/claim")
  })
})

describe("cookie round trip", () => {
  it("reads the cookie back from a request, and labels its absence", () => {
    const touch = classifyFirstTouch({ utmSource: "ig" })
    const req = { headers: new Headers({ cookie: `a=1; rw_src=${encodeFirstTouch(touch)}` }) }
    expect(firstTouchFromRequest(req)?.source).toBe("instagram")
    expect(firstTouchFromRequest({ headers: new Headers() })).toBeNull()
    expect(sourceLabel(null)).toBe("before tracking")
  })
})
