import { describe, expect, it } from "vitest"
import { collegesMatchName } from "./college-name-match"
import {
  buildCollegeNameLookup,
  resolveCollegeByName,
  resolveCollegeCommitGroup,
  type CollegeRow,
} from "./colleges"

const SAMPLE_COLLEGES: CollegeRow[] = [
  { id: "unc-id", name: "University of North Carolina", division: "NCAA Division I" },
  { id: "uncp-id", name: "UNC Pembroke", division: "NCAA Division II" },
  { id: "app-id", name: "Appalachian State University", division: "NCAA Division I" },
  { id: "ncsu-id", name: "NC State University", division: "NCAA Division I" },
]

describe("college name matching", () => {
  const lookup = buildCollegeNameLookup(SAMPLE_COLLEGES)
  const byId = new Map(SAMPLE_COLLEGES.map((c) => [c.id, c]))

  it("does not match UNC Pembroke to UNC via substring", () => {
    expect(collegesMatchName("UNC Pembroke", "University of North Carolina")).toBe(false)
    expect(resolveCollegeByName("UNC Pembroke", lookup)?.id).toBe("uncp-id")
    expect(resolveCollegeByName("UNC", lookup)?.id).toBe("unc-id")
  })

  it("does not match Appalachian State to App via substring", () => {
    expect(collegesMatchName("Appalachian State", "App State")).toBe(false)
  })

  it("matches known UNC alias spellings", () => {
    expect(collegesMatchName("UNC", "University of North Carolina")).toBe(true)
    expect(resolveCollegeByName("UNC", lookup)?.id).toBe("unc-id")
  })

  it("groups athletes by college_id when set", () => {
    const group = resolveCollegeCommitGroup(
      { college_id: "unc-id", college: "UNC" },
      byId,
      lookup,
    )
    expect(group.groupKey).toBe("id:unc-id")
    expect(group.displayName).toBe("University of North Carolina")
  })

  it("groups unmatched spellings by exact name only", () => {
    const a = resolveCollegeCommitGroup({ college: "Some Junior College" }, byId, lookup)
    const b = resolveCollegeCommitGroup({ college: "Some Junior College" }, byId, lookup)
    const c = resolveCollegeCommitGroup({ college: "Other Junior College" }, byId, lookup)
    expect(a.groupKey).toBe(b.groupKey)
    expect(a.groupKey).not.toBe(c.groupKey)
  })
})
