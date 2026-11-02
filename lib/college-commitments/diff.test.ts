import { describe, expect, it } from "vitest"
import { diffCommitments, toSnapshotRow } from "@/lib/college-commitments/diff"
import type { FloCommitmentRow } from "@/lib/college-commitments/flo-parse"

const row = (over: Partial<FloCommitmentRow> = {}): FloCommitmentRow => ({
  listTitle: "2027 NCAA Wrestling D1 Commitment List",
  listArticleId: "14428595",
  sourceUrl: "u",
  retrievedAt: "2026-10-25T00:00:00.000Z",
  classYear: 2027,
  gender: "Male",
  wrestlerName: "Lucas Boe",
  college: "Cornell",
  divisionLabel: null,
  bigBoardRank: 21,
  highSchool: "Blair Academy",
  state: "NJ",
  weight: "133",
  ...over,
})

describe("what changed since the last run", () => {
  it("calls a wrestler who was not on the list a new commitment", () => {
    expect(diffCommitments([row()], [])).toEqual([{ type: "added", row: row() }])
  })

  it("calls a different college a flip, and says what it was", () => {
    const before = [toSnapshotRow(row({ college: "Brown" }))]
    expect(diffCommitments([row()], before)).toEqual([{ type: "flipped", row: row(), previousCollege: "Brown" }])
  })

  it("does not call a rank or a weight a commitment", () => {
    /* These are edits to a published row. Announced as a commitment they would be a lie twice. */
    const before = [toSnapshotRow(row({ bigBoardRank: 40, weight: "126" }))]
    const changes = diffCommitments([row()], before)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.type).toBe("corrected")
  })

  it("says nothing at all when the row has not changed", () => {
    expect(diffCommitments([row()], [toSnapshotRow(row())])).toEqual([])
  })

  it("notices a row Flo has taken down", () => {
    const changes = diffCommitments([], [toSnapshotRow(row())])
    expect(changes).toEqual([{ type: "removed", previous: toSnapshotRow(row()) }])
  })

  it("follows a wrestler by name, because the college is the field allowed to change", () => {
    /* Keyed on the college, every flip would read as one wrestler leaving and another arriving. */
    const changes = diffCommitments([row({ college: "Princeton" })], [toSnapshotRow(row({ college: "Cornell" }))])
    expect(changes.map((c) => c.type)).toEqual(["flipped"])
  })
})
