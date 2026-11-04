import { describe, expect, it } from "vitest"

import { BUSINESS_PAGES, businessCanOpen, businessDecision, hasBusinessGrant } from "@/lib/business/access"

describe("businessCanOpen", () => {
  it("opens every page on the list", () => {
    for (const page of BUSINESS_PAGES) expect(businessCanOpen(page)).toBe(true)
  })

  it("opens a page beneath a listed one", () => {
    expect(businessCanOpen("/admin/business/state/NC")).toBe(true)
    expect(businessCanOpen("/admin/rankings/board/classic")).toBe(true)
  })

  it("ignores a trailing slash", () => {
    expect(businessCanOpen("/admin/sites/")).toBe(true)
  })

  it("keeps the rest of admin shut", () => {
    for (const page of [
      "/admin",
      "/admin/contacts",
      "/admin/contacts/parent/abc",
      "/admin/athletes",
      "/admin/athletes/edit/1",
      "/admin/blue",
      "/admin/fundraising/donations",
      "/admin/orders",
      "/admin/users-dashboard",
      "/admin/messaging",
      // Prints one row per family headed by the parent's name or email.
      "/admin/command-center-activation",
      "/admin/toc/field",
      "/admin/rankings",
    ]) {
      expect(businessCanOpen(page), page).toBe(false)
    }
  })

  it("does not open a page whose path merely starts with a listed one", () => {
    expect(businessCanOpen("/admin/sites-export")).toBe(false)
    expect(businessCanOpen("/admin/business-contacts")).toBe(false)
  })
})

describe("hasBusinessGrant", () => {
  it("wants the flag to be exactly true", () => {
    expect(hasBusinessGrant({ business_access: true })).toBe(true)
    expect(hasBusinessGrant({ business_access: "true" })).toBe(false)
    expect(hasBusinessGrant({ business_access: 1 })).toBe(false)
    expect(hasBusinessGrant({ business_access: false })).toBe(false)
    expect(hasBusinessGrant({})).toBe(false)
    expect(hasBusinessGrant(null)).toBe(false)
    expect(hasBusinessGrant(undefined)).toBe(false)
    expect(hasBusinessGrant("business_access")).toBe(false)
  })
})

describe("businessDecision", () => {
  const grant = { business_access: true }

  it("lets a full admin anywhere, grant or no grant", () => {
    expect(businessDecision(true, {}, "/admin/contacts")).toEqual({ allow: true, isAdmin: true })
    expect(businessDecision(true, grant, "/admin/business")).toEqual({ allow: true, isAdmin: true })
  })

  it("lets a grant open a business page, and says it is not an admin", () => {
    expect(businessDecision(false, grant, "/admin/business")).toEqual({ allow: true, isAdmin: false })
    expect(businessDecision(false, grant, "/admin/business/state/NC")).toEqual({ allow: true, isAdmin: false })
  })

  it("refuses a grant anywhere else in admin", () => {
    for (const page of ["/admin", "/admin/contacts", "/admin/athletes/edit/1", "/admin/command-center-activation"]) {
      const d = businessDecision(false, grant, page)
      expect(d.allow, page).toBe(false)
    }
  })

  it("refuses a signed-in account with no grant, even on a business page", () => {
    expect(businessDecision(false, {}, "/admin/business")).toEqual({ allow: false, reason: "Business access required" })
    expect(businessDecision(false, null, "/admin/business").allow).toBe(false)
    expect(businessDecision(false, { business_access: "true" }, "/admin/business").allow).toBe(false)
  })
})
