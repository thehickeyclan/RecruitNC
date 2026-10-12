import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }))

import { distinctiveSchoolWords, sameSchoolName } from "./entity-logo-resolve"

describe("sameSchoolName", () => {
  it.each([
    ["Liberty", "Liberty University"],
    ["Appalachian State", "Appalachian State University"],
    ["The University of Virginia", "Virginia"],
    ["Greensboro College", "Greensboro"],
    ["Washington & Lee", "Washington and Lee University"],
  ])("%s is %s", (a, b) => expect(sameSchoolName(a, b)).toBe(true))

  it.each([
    ["The University of Virginia", "Ohio University"],
    ["Ohio State", "Ohio University"],
    ["Washington and Jefferson College", "Washington & Lee"],
    ["Virginia", "Virginia Tech"],
    ["Virginia", "West Virginia University"],
    ["University", "Ohio University"],
  ])("%s is not %s", (a, b) => expect(sameSchoolName(a, b)).toBe(false))
})

describe("distinctiveSchoolWords", () => {
  it("drops the words every school shares", () => {
    expect(distinctiveSchoolWords("The University of Virginia")).toEqual(["virginia"])
    expect(distinctiveSchoolWords("Ohio State University")).toEqual(["ohio", "state"])
  })
})
