import { describe, expect, it } from "vitest"
import { academicItems, cleanGpa, cleanScore, gradeOf, latestGradeCheckpoint, type AcademicInput } from "./academic-checkin"

const NOV = new Date("2026-11-06T15:00:00Z") // seniors are the class of 2027
const base: AcademicInput = { gpa: 3.5, gpaUpdatedAt: "2026-10-01T00:00:00Z", sat: null, act: null, classYear: 2028, checkin: null }
const kinds = (a: Partial<AcademicInput>, now = NOV) => academicItems({ ...base, ...a }, now).map((i) => i.kind)

describe("academic check-ins", () => {
  it("report-card checkpoints are Jan 25 and Jun 25", () => {
    expect(latestGradeCheckpoint(NOV).toISOString().slice(0, 10)).toBe("2026-06-25")
    expect(latestGradeCheckpoint(new Date("2027-02-01T00:00:00Z")).toISOString().slice(0, 10)).toBe("2027-01-25")
    expect(latestGradeCheckpoint(new Date("2027-01-10T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-06-25")
  })
  it("grades from class year", () => {
    expect(gradeOf(2027, NOV)).toBe(12)
    expect(gradeOf(2030, NOV)).toBe(9)
    expect(gradeOf(2026, NOV)).toBeNull()
  })
  it("asks for a blank GPA", () => {
    expect(kinds({ gpa: null })).toContain("gpa-missing")
  })
  it("asks again after new grades, not before", () => {
    expect(kinds({})).not.toContain("gpa-check")
    expect(kinds({}, new Date("2027-02-01T00:00:00Z"))).toContain("gpa-check")
    expect(kinds({ checkin: { gpa_confirmed_at: "2027-01-30T00:00:00Z", test_status: null, test_kind: null, test_date: null, test_answered_at: null } }, new Date("2027-02-01T00:00:00Z"))).not.toContain("gpa-check")
  })
  it("an undated GPA is due", () => {
    expect(kinds({ gpaUpdatedAt: null })).toContain("gpa-check")
  })
  it("asks about tests from 10th grade while both scores are blank", () => {
    expect(kinds({})).toContain("test-ask")
    expect(kinds({ classYear: 2030 })).not.toContain("test-ask")
    expect(kinds({ sat: 1200 })).not.toContain("test-ask")
    expect(kinds({ act: 25 })).not.toContain("test-ask")
  })
  it("not yet waits 90 days; not planning stops asking", () => {
    const c = (o: object) => ({ checkin: { gpa_confirmed_at: null, test_status: null, test_kind: null, test_date: null, test_answered_at: null, ...o } as AcademicInput["checkin"] })
    expect(kinds(c({ test_status: "not_yet", test_answered_at: "2026-10-01T00:00:00Z" }))).not.toContain("test-ask")
    expect(kinds(c({ test_status: "not_yet", test_answered_at: "2026-07-01T00:00:00Z" }))).toContain("test-ask")
    expect(kinds(c({ test_status: "not_taking", test_answered_at: "2025-01-01T00:00:00Z" }))).toEqual([])
  })
  it("a planned test asks for the score two weeks after", () => {
    const c = (o: object) => ({ checkin: { gpa_confirmed_at: null, test_status: "planned", test_kind: "sat", test_date: "2026-10-20", test_answered_at: "2026-09-01T00:00:00Z", ...o } as AcademicInput["checkin"] })
    expect(kinds(c({}), new Date("2026-10-30T00:00:00Z"))).toEqual([])
    expect(academicItems({ ...base, ...c({}) }, NOV)).toEqual([{ kind: "test-score", test: "sat", date: "2026-10-20" }])
    expect(kinds(c({ test_answered_at: "2026-11-05T00:00:00Z" }))).toEqual([])
  })
  it("cleans typed values", () => {
    expect(cleanGpa("3.456")).toBe(3.46)
    expect(cleanGpa("6")).toBeNull()
    expect(cleanGpa("")).toBeNull()
    expect(cleanScore("sat", "1210")).toBe(1210)
    expect(cleanScore("sat", "1215")).toBeNull()
    expect(cleanScore("act", "36")).toBe(36)
    expect(cleanScore("act", "37")).toBeNull()
  })
})
