import { describe, expect, it } from "vitest"
import { classYearForGrade, parseRankWrestlerPaste } from "@/lib/rankwrestler-import"

/** Two entries copied verbatim from the Class of 2028 listing, tabs and all. */
const PASTE = `Rank	Wrestler	School	Weight	Grade	Class	Region	Record
1	
Aaron Ellison
2x placer
Resume
▼
Lumberton	150	Jr	7A	7A-E	54 - 1	98.2%	99.991%	99.922%	0.00%	99.957AA
2	
Hayden Smith
2x placer
Resume
▼
White Oak	150	Jr	6A	6A-E	50 - 3	94.3%	99.975%	99.913%	0.00%	99.944AA
16	
Luke Richards
Resume
▼
Cardinal Gibbons	120	Jr	7A	7A-E	44 - 5	89.8%	99.936%	99.927%	-0.036%	99.895
`

describe("parseRankWrestlerPaste", () => {
  it("reads every wrestler in the paste", () => {
    expect(parseRankWrestlerPaste(PASTE).map((r) => r.rank)).toEqual([1, 2, 16])
  })

  it("pulls the detail row apart into its columns", () => {
    const [first] = parseRankWrestlerPaste(PASTE)
    expect(first).toMatchObject({
      rank: 1,
      wrestlerName: "Aaron Ellison",
      school: "Lumberton",
      weightClass: "150",
      grade: "Jr",
      classification: "7A",
      region: "7A-E",
      record: "54 - 1",
    })
  })

  it("keeps the credential lines and drops the table's own controls", () => {
    const [first, , third] = parseRankWrestlerPaste(PASTE)
    // "Resume" and the chevron are the expander, not something the wrestler did.
    expect(first!.notes).toEqual(["2x placer"])
    expect(third!.notes).toEqual([])
  })

  it("does not mistake a percentage column for the record", () => {
    // Their row carries five percentages after the record; only the W-L cell is the record.
    expect(parseRankWrestlerPaste(PASTE)[1]!.record).toBe("50 - 3")
  })

  it("ignores the header row", () => {
    expect(parseRankWrestlerPaste(PASTE).some((r) => r.wrestlerName === "Wrestler")).toBe(false)
  })

  it("returns nothing for an empty paste", () => {
    expect(parseRankWrestlerPaste("")).toEqual([])
  })
})

describe("classYearForGrade", () => {
  it("maps a grade to the class that graduates", () => {
    // The 2025-26 season ends in 2026: its juniors are the Class of 2027.
    expect(classYearForGrade("Sr", 2026)).toBe(2026)
    expect(classYearForGrade("Jr", 2026)).toBe(2027)
    expect(classYearForGrade("So", 2026)).toBe(2028)
    expect(classYearForGrade("Fr", 2026)).toBe(2029)
  })

  it("refuses a grade it does not recognise rather than guessing", () => {
    expect(classYearForGrade("", 2026)).toBeNull()
    expect(classYearForGrade("8th", 2026)).toBeNull()
  })
})
