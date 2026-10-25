/**
 * What changed since the last run.
 *
 * The lists are edited in place, so a run only knows what happened by comparing today's table
 * with the one we saved last time. Four things can have happened to a wrestler, and they are not
 * the same event: a new commitment is news, a flip is bigger news, a removed row usually means
 * Flo corrected a mistake, and a field correction (a rank, a weight, a school spelling) is
 * housekeeping that must never be announced as a commitment.
 *
 * A wrestler is identified across runs by his name within a list, not by his college: that is the
 * whole point, since the college is the field that changes. Nothing here writes; it describes.
 */
import { nameWords } from "@/lib/athlete-name-match"
import type { FloCommitmentRow } from "@/lib/college-commitments/flo-parse"

export type SnapshotRow = {
  listArticleId: string
  wrestlerKey: string
  wrestlerName: string
  college: string
  divisionLabel: string | null
  bigBoardRank: number | null
  highSchool: string | null
  state: string | null
  weight: string | null
  classYear: number
  gender: "Male" | "Female"
}

export type CommitmentChange =
  | { type: "added"; row: FloCommitmentRow }
  | { type: "flipped"; row: FloCommitmentRow; previousCollege: string }
  | { type: "removed"; previous: SnapshotRow }
  | { type: "corrected"; row: FloCommitmentRow; fields: Array<{ field: string; from: string | null; to: string | null }> }

/** One wrestler within one list. Name only: the college is the thing allowed to change. */
export const wrestlerKey = (listArticleId: string, name: string) => `${listArticleId}|${nameWords(name).join(" ")}`

export const toSnapshotRow = (r: FloCommitmentRow): SnapshotRow => ({
  listArticleId: r.listArticleId,
  wrestlerKey: wrestlerKey(r.listArticleId, r.wrestlerName),
  wrestlerName: r.wrestlerName,
  college: r.college,
  divisionLabel: r.divisionLabel,
  bigBoardRank: r.bigBoardRank,
  highSchool: r.highSchool,
  state: r.state,
  weight: r.weight,
  classYear: r.classYear,
  gender: r.gender,
})

const same = (a: unknown, b: unknown) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase()

/**
 * Compare one list's rows with what we held for it.
 *
 * `previous` must be the saved rows for exactly the lists in `rows`; a list that failed to fetch
 * is left out of both, because comparing a list against nothing would read as every one of its
 * wrestlers de-committing on the same afternoon.
 */
export function diffCommitments(rows: FloCommitmentRow[], previous: SnapshotRow[]): CommitmentChange[] {
  const before = new Map(previous.map((p) => [p.wrestlerKey, p]))
  const changes: CommitmentChange[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const key = wrestlerKey(row.listArticleId, row.wrestlerName)
    seen.add(key)
    const was = before.get(key)
    if (!was) {
      changes.push({ type: "added", row })
      continue
    }
    if (!same(was.college, row.college)) {
      changes.push({ type: "flipped", row, previousCollege: was.college })
      continue
    }
    const fields: Array<{ field: string; from: string | null; to: string | null }> = []
    const check = (field: string, from: unknown, to: unknown) => {
      if (!same(from, to)) fields.push({ field, from: from == null ? null : String(from), to: to == null ? null : String(to) })
    }
    check("bigBoardRank", was.bigBoardRank, row.bigBoardRank)
    check("highSchool", was.highSchool, row.highSchool)
    check("state", was.state, row.state)
    check("weight", was.weight, row.weight)
    check("divisionLabel", was.divisionLabel, row.divisionLabel)
    if (fields.length) changes.push({ type: "corrected", row, fields })
  }

  for (const [key, was] of before) if (!seen.has(key)) changes.push({ type: "removed", previous: was })
  return changes
}

export const countChanges = (changes: CommitmentChange[]) => ({
  added: changes.filter((c) => c.type === "added").length,
  flipped: changes.filter((c) => c.type === "flipped").length,
  removed: changes.filter((c) => c.type === "removed").length,
  corrected: changes.filter((c) => c.type === "corrected").length,
})
