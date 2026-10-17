import { describe, expect, it } from "vitest"
import { coachSalutation } from "./coach-welcome-email"

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
