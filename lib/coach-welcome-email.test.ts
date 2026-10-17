import { describe, expect, it } from "vitest"
import { coachSalutation, programDisplayName } from "./coach-welcome-email"

describe("coachSalutation", () => {
  it("capitalises all-lower and all-upper surnames, leaves mixed case alone", () => {
    expect(coachSalutation("eric morrill")).toBe("Coach Morrill")
    expect(coachSalutation("SCOTT BOSAK")).toBe("Coach Bosak")
    expect(coachSalutation("Mike McDonald")).toBe("Coach McDonald")
    expect(coachSalutation("Ryan LaHaye")).toBe("Coach LaHaye")
    expect(coachSalutation("john smith-jones")).toBe("Coach Smith-Jones")
  })
  it("never uses a username as a name", () => {
    expect(coachSalutation("tallen", "tallen@umo.edu")).toBe("Coach")
    expect(coachSalutation("radskya", "radskya@wlu.edu")).toBe("Coach")
    expect(coachSalutation(null)).toBe("Coach")
    expect(coachSalutation("Billy Gordy", "billygordy@andrewcollege.edu")).toBe("Coach Gordy")
  })
})

describe("programDisplayName", () => {
  it("uses a bracketed short name, but keeps a bracketed state", () => {
    expect(programDisplayName("Oklahoma State University–Stillwater (Oklahoma State)")).toBe("Oklahoma State")
    expect(programDisplayName("University of Pennsylvania (Penn)")).toBe("Penn")
    expect(programDisplayName("King's College (PA)")).toBe("King's College (PA)")
    expect(programDisplayName("Pacific University (Oregon)")).toBe("Pacific University (Oregon)")
    expect(programDisplayName("Trinity College (Connecticut)")).toBe("Trinity College (Connecticut)")
    expect(programDisplayName("University of Maryland, College Park (Maryland)")).toBe("University of Maryland, College Park (Maryland)")
    expect(programDisplayName("Arizona State")).toBe("Arizona State")
  })
})
