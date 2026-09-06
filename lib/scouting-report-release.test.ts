import { afterEach, describe, expect, it } from "vitest"
import {
  canAccessScoutingReport,
  isScoutingReportLaunched,
  scoutingReportAllowlist,
} from "@/lib/scouting-report-release"

const ENV = "RECRUITNC_SCOUTING_REPORT_ALLOWLIST"

afterEach(() => {
  delete process.env[ENV]
})

const coach = { email: "coach@state.edu", isCollegeCoach: true, isAdmin: false }
const admin = { email: "admin@ncwrestlingunited.com", isCollegeCoach: false, isAdmin: true }
const nobody = { email: "parent@gmail.com", isCollegeCoach: false, isAdmin: false }

describe("while an allowlist is in force", () => {
  it("lets the named account in", () => {
    process.env[ENV] = "matt@example.com"
    expect(canAccessScoutingReport({ ...nobody, email: "matt@example.com" })).toBe(true)
  })

  it("refuses a college coach who is not on it", () => {
    process.env[ENV] = "matt@example.com"
    expect(canAccessScoutingReport(coach)).toBe(false)
  })

  it("refuses an admin who is not on it", () => {
    // Narrower than the role rules on purpose: a pre-launch test should be the people
    // running it, not everybody who happens to hold a role.
    process.env[ENV] = "matt@example.com"
    expect(canAccessScoutingReport(admin)).toBe(false)
  })

  it("matches case-insensitively and ignores surrounding spaces", () => {
    process.env[ENV] = " Matt@Example.com , other@x.com "
    expect(canAccessScoutingReport({ ...nobody, email: "MATT@EXAMPLE.COM" })).toBe(true)
    expect(canAccessScoutingReport({ ...nobody, email: "other@x.com" })).toBe(true)
  })

  it("refuses an account with no email rather than falling through", () => {
    process.env[ENV] = "matt@example.com"
    expect(canAccessScoutingReport({ ...admin, email: null })).toBe(false)
    expect(canAccessScoutingReport({ ...admin, email: "" })).toBe(false)
  })

  it("reports the feature as not launched", () => {
    process.env[ENV] = "matt@example.com"
    expect(isScoutingReportLaunched()).toBe(false)
  })
})

describe("once the allowlist is cleared", () => {
  it("falls back to the role rules", () => {
    expect(canAccessScoutingReport(coach)).toBe(true)
    expect(canAccessScoutingReport(admin)).toBe(true)
    expect(canAccessScoutingReport(nobody)).toBe(false)
  })

  it("treats an unset variable as launched, so nobody has to remember a flag", () => {
    expect(scoutingReportAllowlist()).toEqual([])
    expect(isScoutingReportLaunched()).toBe(true)
  })

  it("treats an empty or whitespace value as cleared too", () => {
    process.env[ENV] = "  , ,  "
    expect(isScoutingReportLaunched()).toBe(true)
    expect(canAccessScoutingReport(coach)).toBe(true)
  })
})
