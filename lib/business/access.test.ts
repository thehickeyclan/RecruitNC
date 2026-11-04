import { describe, expect, it } from "vitest"

import { BUSINESS_PAGES, businessCanOpen, hasBusinessGrant } from "@/lib/business/access"

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
