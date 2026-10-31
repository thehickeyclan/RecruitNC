/**
 * Which of our wrestlers a Flo commitment row is about.
 *
 * A commitment is a claim about a named person, and the cost of getting it wrong is not a blank
 * field - it is telling a coach that the wrestler he is recruiting has committed to Cornell when
 * it was somebody else with the same name. So the only match applied without a human is the full
 * key: name, high school, state, class year and gender, all five. Flo's lists carry all five, and
 * so do our profiles.
 *
 * Everything else is held with its reason and reported. That includes the common and genuinely
 * ambiguous cases - two wrestlers of one name in a state, a name we hold with a different class
 * year, a school that does not agree - and the much larger case of a wrestler we have no profile
 * for at all. v1 does not mint a profile from a commitment: a commitment row gives a name, a
 * school and a state but no results, and a profile minted from it would be a page with nothing
 * on it (see docs/state-launch and the class-year rule in scripts/mint-state-placer-profiles.ts).
 *
 * The state on the row is the high school's state, which is also what `athletes.state` means -
 * the state a wrestler competes for, not where he sleeps. A boarding-school wrestler is on his
 * school's state profile, and matching on that keeps the commitment with him.
 */
import { namesReferToSamePerson, schoolsLikelySame } from "@/lib/athlete-name-match"
import type { FloCommitmentRow } from "@/lib/college-commitments/flo-parse"

export type MatchableAthlete = {
  id: string
  name: string
  /** What we already hold. Ours was entered by someone who knew; Flo's was read off a list. */
  college?: string | null
  wrestling_name?: string | null
  highschool: string | null
  state: string | null
  graduationyear: number | null
  gender: string | null
}

export type CommitmentMatch =
  | { kind: "matched"; athleteId: string; athleteName: string; ourCollege: string | null }
  | { kind: "held"; reason: HoldReason; detail: string }

export type HoldReason =
  | "no-profile"
  | "namesake"
  | "class-year-differs"
  | "school-differs"
  | "gender-differs"
  | "row-incomplete"
  | "ours-differs"

const genderOf = (v: string | null | undefined): "Male" | "Female" | null => {
  const s = String(v ?? "").trim().toLowerCase()
  if (!s) return null
  if (s.startsWith("f") || s.startsWith("w") || s.startsWith("girl")) return "Female"
  if (s.startsWith("m") || s.startsWith("b")) return "Male"
  return null
}

const sameName = (a: MatchableAthlete, name: string) =>
  namesReferToSamePerson(a.name, name) || (a.wrestling_name ? namesReferToSamePerson(a.wrestling_name, name) : false)

/**
 * Match one row.
 *
 * `athletes` is every profile we hold; the filtering happens here rather than in the query so
 * each near-miss can say which part of the key failed. A row that is missing a key part of its
 * own - Flo sometimes publishes a commitment before it knows the school - cannot be auto-applied
 * either, because the key it would be matched on is not the key the rule names.
 */
export function matchCommitmentRow(row: FloCommitmentRow, athletes: MatchableAthlete[]): CommitmentMatch {
  if (!row.highSchool || !row.state) {
    return { kind: "held", reason: "row-incomplete", detail: `Flo's row gives ${row.highSchool ? "no state" : "no high school"}, so the five-part key cannot be checked` }
  }
  const named = athletes.filter((a) => sameName(a, row.wrestlerName))
  if (!named.length) return { kind: "held", reason: "no-profile", detail: `no profile named ${row.wrestlerName}` }

  const inState = named.filter((a) => String(a.state ?? "").toUpperCase() === row.state)
  const rightClass = inState.filter((a) => a.graduationyear === row.classYear)
  const rightGender = rightClass.filter((a) => genderOf(a.gender) === row.gender)
  const rightSchool = rightGender.filter((a) => schoolsLikelySame(a.highschool, row.highSchool))

  if (rightSchool.length === 1) {
    const hit = rightSchool[0]!
    const ours = String(hit.college ?? "").trim()
    return { kind: "matched", athleteId: hit.id, athleteName: hit.name, ourCollege: ours && ours !== "Not specified" ? ours : null }
  }
  if (rightSchool.length > 1) {
    return { kind: "held", reason: "namesake", detail: `${rightSchool.length} profiles match the full key: ${rightSchool.map((a) => a.id).join(", ")}` }
  }
  /*
   * Which part of the key failed, named in the order a person would check it. The reason is what
   * makes the held queue workable: "class-year-differs" is usually our class year being wrong and
   * takes a second to settle, while "namesake" needs somebody to look.
   */
  if (!inState.length) {
    return { kind: "held", reason: "no-profile", detail: `${row.wrestlerName} is on no ${row.state} profile (we hold ${named.length} of that name elsewhere)` }
  }
  if (!rightClass.length) {
    const years = [...new Set(inState.map((a) => a.graduationyear ?? "none"))].join(", ")
    return { kind: "held", reason: "class-year-differs", detail: `Flo's list is the class of ${row.classYear}; our ${row.state} profile reads ${years}` }
  }
  if (!rightGender.length) {
    return { kind: "held", reason: "gender-differs", detail: `Flo's list is ${row.gender}; our profile reads ${rightClass.map((a) => a.gender ?? "none").join(", ")}` }
  }
  return {
    kind: "held",
    reason: "school-differs",
    detail: `Flo says ${row.highSchool}; our profile says ${rightGender.map((a) => a.highschool ?? "no school").join(", ")}`,
  }
}
