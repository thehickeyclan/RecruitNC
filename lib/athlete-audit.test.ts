import { describe, expect, it, vi } from "vitest"
import { recordAthleteChanges, recordAthleteEvent } from "./athlete-audit"

function fakeAdmin() {
  const inserted: any[] = []
  const client = {
    from: () => ({
      insert: (rows: any[]) => {
        inserted.push(...rows)
        return Promise.resolve({ error: null })
      },
    }),
  }
  return { client: client as any, inserted }
}

describe("recordAthleteChanges", () => {
  it("drops fields that did not actually change", async () => {
    // The live table shows why: four of the five most recent rows were `"" -> ""`.
    const { client, inserted } = fakeAdmin()
    await recordAthleteChanges(client, [
      { athleteId: "a1", userId: "u1", fieldName: "academic_gpa", oldValue: "4.4", newValue: "4.45", changeType: "athlete_edit" },
      { athleteId: "a1", userId: "u1", fieldName: "academic_sat", oldValue: "", newValue: "", changeType: "athlete_edit" },
      { athleteId: "a1", userId: "u1", fieldName: "academic_act", oldValue: null, newValue: undefined, changeType: "athlete_edit" },
    ])
    expect(inserted).toHaveLength(1)
    expect(inserted[0].field_name).toBe("academic_gpa")
  })

  it("keeps ownership events even though they have no before value", async () => {
    const { client, inserted } = fakeAdmin()
    await recordAthleteEvent(client, {
      athleteId: "a1",
      userId: "u1",
      changeType: "profile_claimed",
      detail: "claimed by user u1",
    })
    expect(inserted).toHaveLength(1)
    expect(inserted[0].change_type).toBe("profile_claimed")
  })

  it("serialises objects rather than storing [object Object]", async () => {
    const { client, inserted } = fakeAdmin()
    await recordAthleteChanges(client, [
      { athleteId: "a1", userId: "u1", fieldName: "socialMedia", oldValue: {}, newValue: { instagram: "x" }, changeType: "athlete_edit" },
    ])
    expect(inserted[0].new_value).toBe('{"instagram":"x"}')
  })

  it("never throws when the insert fails, so an edit still succeeds", async () => {
    const client = { from: () => ({ insert: () => Promise.resolve({ error: { message: "boom" } }) }) } as any
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(
      recordAthleteChanges(client, [
        { athleteId: "a1", userId: "u1", fieldName: "bio", oldValue: "a", newValue: "b", changeType: "athlete_edit" },
      ]),
    ).resolves.toEqual({ written: 0 })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
