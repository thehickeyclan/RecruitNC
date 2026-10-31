import { describe, expect, it } from "vitest"
import { safeReturnPath, signupLanding } from "./signup-landing"

describe("signupLanding", () => {
  it("goes back to the page the sign-up began on", () => {
    expect(signupLanding({ returnTo: "/view-profile?id=abc", role: "athlete", hasWrestler: false })).toBe("/view-profile?id=abc")
  })
  it("never follows an outside or auth address", () => {
    expect(safeReturnPath("//evil.com")).toBeNull()
    expect(safeReturnPath("https://evil.com")).toBeNull()
    expect(safeReturnPath("/auth/signin")).toBeNull()
    expect(safeReturnPath("/")).toBeNull()
  })
  it("sends a wrestler with no profile to find it, searching their name", () => {
    expect(signupLanding({ returnTo: undefined, role: "athlete", hasWrestler: false, firstName: "Rahiem", lastName: "Skyers" })).toBe("/create-profile?find=Rahiem%20Skyers")
  })
  it("sends a parent to find their wrestler without searching the parent's name", () => {
    expect(signupLanding({ returnTo: null, role: "parent", hasWrestler: false, firstName: "Michael", lastName: "Johnson" })).toBe("/create-profile")
  })
  it("leaves families with a wrestler, coaches and fans to the usual landing", () => {
    expect(signupLanding({ returnTo: null, role: "parent", hasWrestler: true })).toBeNull()
    expect(signupLanding({ returnTo: null, role: "college-coach", hasWrestler: false })).toBeNull()
    expect(signupLanding({ returnTo: null, role: "fan", hasWrestler: false })).toBeNull()
  })
})
