/**
 * The duplicate gate's named exception has to refuse more often than it clears.
 *
 * Two profiles for one kid split his views, his messages and his claim, so the gate is right by
 * default. These tests hold the exception to the two refusals that keep it honest: evidence is
 * mandatory, and a group clears whole or not at all.
 */
import { describe, expect, it } from "vitest"
import { clearsSameNameGroup, usableSameNameEntries } from "@/lib/state-launch/same-name"

const FLOYD = ["155a65ff-304f-4227-93ab-36d7955204a6", "9b9388ff-291f-4a22-ad50-1afa4f3e00ad"]

describe("clearsSameNameGroup", () => {
  it("clears a pair named in full with a reason", () => {
    const entries = [{ athleteIds: FLOYD, note: "East Fairmont and North Marion, 120lb and 285lb, both 2027" }]
    expect(clearsSameNameGroup(entries, FLOYD)).toBe(true)
  })

  it("ignores an entry with no reason, however completely it names the group", () => {
    expect(clearsSameNameGroup([{ athleteIds: FLOYD }], FLOYD)).toBe(false)
    expect(clearsSameNameGroup([{ athleteIds: FLOYD, note: "" }], FLOYD)).toBe(false)
    expect(clearsSameNameGroup([{ athleteIds: FLOYD, note: "   " }], FLOYD)).toBe(false)
  })

  it("refuses a group it does not name in full, so a third profile is never swept in", () => {
    // The pair was checked in 2026. A third wrestler of the same name appears later: nobody has
    // looked at him, and the state must go red again until somebody does.
    const entries = [{ athleteIds: FLOYD, note: "two schools, 165lb apart" }]
    expect(clearsSameNameGroup(entries, [...FLOYD, "cccccccc-0000-0000-0000-000000000000"])).toBe(false)
  })

  it("does not let one entry's ids clear a different pair of the same name", () => {
    const entries = [{ athleteIds: FLOYD, note: "two schools" }]
    expect(clearsSameNameGroup(entries, ["dddddddd-0000-0000-0000-000000000000", "eeeeeeee-0000-0000-0000-000000000000"])).toBe(false)
  })

  it("needs at least two profiles named, so a single id can never stand as a clearance", () => {
    expect(usableSameNameEntries([{ athleteIds: [FLOYD[0]], note: "a reason" }])).toHaveLength(0)
    expect(clearsSameNameGroup([{ athleteIds: [FLOYD[0]], note: "a reason" }], [FLOYD[0]])).toBe(false)
  })

  it("clears nothing when the file has no entries at all", () => {
    expect(clearsSameNameGroup(undefined, FLOYD)).toBe(false)
    expect(clearsSameNameGroup([], FLOYD)).toBe(false)
  })
})
