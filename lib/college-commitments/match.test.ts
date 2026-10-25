import { describe, expect, it } from "vitest"
import { matchCommitmentRow, type MatchableAthlete } from "@/lib/college-commitments/match"
import type { FloCommitmentRow } from "@/lib/college-commitments/flo-parse"

const row = (over: Partial<FloCommitmentRow> = {}): FloCommitmentRow => ({
  listTitle: "l", listArticleId: "1", sourceUrl: "u", retrievedAt: "t",
  classYear: 2027, gender: "Male", wrestlerName: "Dale Corbin", college: "NC State",
  divisionLabel: null, bigBoardRank: 13, highSchool: "Uwharrie Charter", state: "NC", weight: "150",
  ...over,
})
const athlete = (over: Partial<MatchableAthlete> = {}): MatchableAthlete => ({
  id: "a1", name: "Dale Corbin", highschool: "Uwharrie Charter Academy", state: "NC", graduationyear: 2027, gender: "Male", ...over,
})

describe("matching a commitment to a profile", () => {
  it("applies only on the full key: name, school, state, class year and gender", () => {
    expect(matchCommitmentRow(row(), [athlete()])).toEqual({ kind: "matched", athleteId: "a1", athleteName: "Dale Corbin", ourCollege: null })
  })

  it("holds a namesake rather than picking one", () => {
    const out = matchCommitmentRow(row(), [athlete(), athlete({ id: "a2" })])
    expect(out).toMatchObject({ kind: "held", reason: "namesake" })
  })

  it("names which part of the key failed", () => {
    expect(matchCommitmentRow(row(), [athlete({ graduationyear: 2028 })])).toMatchObject({ kind: "held", reason: "class-year-differs" })
    expect(matchCommitmentRow(row(), [athlete({ highschool: "Cardinal Gibbons" })])).toMatchObject({ kind: "held", reason: "school-differs" })
    expect(matchCommitmentRow(row(), [athlete({ gender: "Female" })])).toMatchObject({ kind: "held", reason: "gender-differs" })
    expect(matchCommitmentRow(row(), [athlete({ state: "SC" })])).toMatchObject({ kind: "held", reason: "no-profile" })
  })

  it("holds a wrestler we have no profile for, and never mints one", () => {
    expect(matchCommitmentRow(row(), [])).toMatchObject({ kind: "held", reason: "no-profile" })
  })

  it("holds a row whose own key is incomplete", () => {
    /* Flo sometimes publishes a commitment before it knows the school. */
    expect(matchCommitmentRow(row({ highSchool: null }), [athlete()])).toMatchObject({ kind: "held", reason: "row-incomplete" })
  })

  it("carries what we already hold, because our own entry outranks the list", () => {
    /*
     * Two sources feed this field: Flo's lists, which are Division I only, and the commitments
     * we enter ourselves, which are every division and come from someone who knew. The run
     * holds a disagreement rather than letting Flo overwrite ours.
     */
    const out = matchCommitmentRow(row(), [athlete({ college: "Mount Olive" })])
    expect(out).toMatchObject({ kind: "matched", ourCollege: "Mount Olive" })
    expect(matchCommitmentRow(row(), [athlete({ college: "Not specified" })])).toMatchObject({ ourCollege: null })
  })

  it("matches a wrestler the list prints under his wrestling name", () => {
    const out = matchCommitmentRow(row({ wrestlerName: "Jett Johnson" }), [athlete({ name: "Steven Johnson", wrestling_name: "Jett Johnson" })])
    expect(out).toMatchObject({ kind: "matched", athleteId: "a1" })
  })
})
