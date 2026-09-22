import { describe, expect, it } from "vitest"
import {
  buildAthleteEditPatch,
  mergeInstagram,
  normalizeInstagramHandle,
  normalizeVideoUrl,
} from "@/lib/mobile/athlete-edit"

describe("buildAthleteEditPatch", () => {
  it("maps the phone's field names onto the columns that exist", () => {
    // The trap this guards: the report once read `gpa`, `contact_email` and `career_record`,
    // none of which are columns, and every report rendered blank without erroring.
    const result = buildAthleteEditPatch({ gpa: "3.85", intendedMajor: "Pre-Med", collegeWeightClass: "141 lbs" })
    expect(result).toEqual({
      ok: true,
      patch: { academic_gpa: 3.85, academic_interest: "Pre-Med", college_weight_class: "141" },
    })
  })

  it("writes only the fields that were sent", () => {
    const result = buildAthleteEditPatch({ bio: "Two-time state placer." })
    expect(result.ok && Object.keys(result.patch)).toEqual(["bio"])
  })

  it("lets an empty value clear a field", () => {
    expect(buildAthleteEditPatch({ gpa: "" })).toEqual({ ok: true, patch: { academic_gpa: null } })
    expect(buildAthleteEditPatch({ intendedMajor: "" })).toEqual({ ok: true, patch: { academic_interest: null } })
  })

  it("refuses numbers that are not what they claim to be", () => {
    expect(buildAthleteEditPatch({ gpa: "400" })).toMatchObject({ ok: false, field: "gpa" })
    expect(buildAthleteEditPatch({ sat: "2400" })).toMatchObject({ ok: false, field: "sat" })
    expect(buildAthleteEditPatch({ act: "99" })).toMatchObject({ ok: false, field: "act" })
  })

  it("accepts a weighted GPA above 4.0", () => {
    expect(buildAthleteEditPatch({ gpa: "4.63" })).toEqual({ ok: true, patch: { academic_gpa: 4.63 } })
  })

  it("never writes a column nobody named", () => {
    // An athlete ranking themselves is the reason this is an allowlist.
    const result = buildAthleteEditPatch({ prospect_ranking: 1, claimed_by_user_id: "someone", gpa: "3.0" })
    expect(result.ok && result.patch).toEqual({ academic_gpa: 3 })
  })

  it("says so when there is nothing to write", () => {
    expect(buildAthleteEditPatch({ prospect_ranking: 1 })).toMatchObject({ ok: false })
  })
})

describe("normalizeInstagramHandle", () => {
  it("takes a handle however it was pasted", () => {
    expect(normalizeInstagramHandle("@ncunited")).toBe("ncunited")
    expect(normalizeInstagramHandle("https://instagram.com/ncunited/")).toBe("ncunited")
    expect(normalizeInstagramHandle("ncunited")).toBe("ncunited")
  })

  it("rejects something that is not a handle", () => {
    expect(normalizeInstagramHandle("two words")).toBeNull()
  })
})

describe("normalizeVideoUrl", () => {
  it("keeps a real link and clears an empty one", () => {
    expect(normalizeVideoUrl("https://youtu.be/abc123")).toBe("https://youtu.be/abc123")
    expect(normalizeVideoUrl("")).toBeNull()
  })

  it("refuses what is not a link at all", () => {
    expect(normalizeVideoUrl("my highlight tape")).toBeUndefined()
    expect(normalizeVideoUrl("file:///Users/matt/reel.mov")).toBeUndefined()
  })
})

describe("instagram", () => {
  it("comes back separately, because it is not a column", () => {
    const result = buildAthleteEditPatch({ instagram: "@ncunited" })
    expect(result).toEqual({ ok: true, patch: {}, instagram: "ncunited" })
  })

  it("merges into socialMedia without disturbing the others", () => {
    expect(mergeInstagram({ twitter: "ncu", instagram: "old" }, "new")).toEqual({ twitter: "ncu", instagram: "new" })
  })

  it("clears without wiping the object", () => {
    expect(mergeInstagram({ twitter: "ncu", instagram: "old" }, null)).toEqual({ twitter: "ncu" })
  })

  it("copes with a row that has no socialMedia yet", () => {
    expect(mergeInstagram(null, "ncunited")).toEqual({ instagram: "ncunited" })
  })
})
