import { describe, expect, it } from "vitest"
import { matchesSiteFilter, rollUpSites, signupSite } from "./user-site"

describe("signupSite", () => {
  it("reads the recorded brand and never guesses", () => {
    expect(signupSite({ signup_brand: "recruitwrestlers" })).toBe("rw")
    expect(signupSite({ signup_brand: "ncunited" })).toBe("ncu")
    expect(signupSite({})).toBeNull()
    expect(signupSite(null)).toBeNull()
  })
})

describe("rollUpSites", () => {
  it("takes the newest tagged row as last site and the newest sign-in as sign-in site", () => {
    const out = rollUpSites([
      { event_type: "page_view", site: "ncu" },
      { event_type: "page_view", site: undefined },
      { event_type: "signin_completed", site: "rw" },
      { event_type: "page_view", site: "ncu" },
      { event_type: "signin_completed", site: "ncu" },
    ])
    expect(out).toEqual({ signin_site: "rw", last_site: "ncu", sites_30d: ["ncu", "rw"] })
  })

  it("is empty when nothing is tagged", () => {
    expect(rollUpSites([{ event_type: "page_view", site: null }])).toEqual({ signin_site: null, last_site: null, sites_30d: [] })
  })
})

describe("matchesSiteFilter", () => {
  const rwSignup = { signup_site: "rw" as const, signin_site: null, last_site: null, sites_30d: [] }
  const ncuActive = { signup_site: null, signin_site: "ncu" as const, last_site: "ncu" as const, sites_30d: ["ncu" as const] }
  const none = { signup_site: null, signin_site: null, last_site: null, sites_30d: [] }

  it("counts a sign-up or recent use on that site", () => {
    expect(matchesSiteFilter(rwSignup, "rw")).toBe(true)
    expect(matchesSiteFilter(ncuActive, "rw")).toBe(false)
    expect(matchesSiteFilter(ncuActive, "ncu")).toBe(true)
  })

  it("puts accounts with no site facts under unknown only", () => {
    expect(matchesSiteFilter(none, "unknown")).toBe(true)
    expect(matchesSiteFilter(rwSignup, "unknown")).toBe(false)
    expect(matchesSiteFilter(none, "all")).toBe(true)
  })
})
