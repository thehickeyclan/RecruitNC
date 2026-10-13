/**
 * What each college charges for tuition, so a family comparing schools sees the price beside the
 * program (Matt, 13 Oct 2026). 435 of the 436 schools; Simon Fraser is in Canada and not in the
 * US Department of Education's data.
 *
 * Three limits, each shown wherever a figure is shown, because a tuition number with no year or
 * scope reads as "what we will pay":
 *
 * - **The year is 2023-24**, the newest the Department of Education publishes in bulk (IPEDS).
 * - **Tuition only**: no fees, housing or food, and before any aid.
 * - **Published price, not a family's price.** In-state applies to residents of the college's
 *   own state, so a North Carolina family pays the out-of-state figure at a public college
 *   elsewhere. Which figure applies is worked out here, not left to the reader.
 *
 * Merged systems share one record: PennWest Clarion and Edinboro carry the same figures, as do
 * Commonwealth Bloomsburg and Lock Haven. The federal academies charge no tuition.
 */
import data from "@/lib/college-programs/tuition-2023-24.json"

export type SchoolTuition = { control: "Public" | "Private" | null; inState: number | null; outOfState: number | null }

const TUITION = data.tuition as Record<string, SchoolTuition>

export const TUITION_YEAR = data.year
export const TUITION_NOTE = `Published tuition for ${TUITION_YEAR}, the latest year the US Department of Education has released. Tuition only: no fees, housing or food, and before any aid.`
export const TUITION_SOURCE_URL = "https://nces.ed.gov/ipeds/"

export function tuitionForSchool(schoolId: string): SchoolTuition | null {
  return TUITION[schoolId] ?? null
}

/** One short line for a list: the figure a North Carolina family is charged, with its year. */
export function tuitionShort(schoolId: string, schoolState: string, homeState = "NC"): string | null {
  const t = tuitionForSchool(schoolId)
  if (!t || (t.inState == null && t.outOfState == null)) return null
  if (t.inState === 0 && (t.outOfState ?? 0) === 0) return "No tuition (service academy)"
  const applies = schoolState === homeState ? (t.inState ?? t.outOfState) : (t.outOfState ?? t.inState)
  const which = t.inState !== t.outOfState && t.inState != null && t.outOfState != null ? (schoolState === homeState ? " in-state" : " out-of-state") : ""
  return `${dollars(applies!)}${which} tuition, ${TUITION_YEAR}, before aid`
}

const dollars = (n: number) => `$${n.toLocaleString("en-US")}`

export type TuitionFacts = {
  control: "Public" | "Private" | null
  /** "$7,019 a year for North Carolina residents" - the lines to show, already worded. */
  lines: string[]
}

/** The tuition lines for one school, worded for a family living in `homeState` (North Carolina). */
export function tuitionFacts(schoolId: string, schoolState: string, homeState = "NC"): TuitionFacts | null {
  const t = tuitionForSchool(schoolId)
  if (!t) return null
  const { control, inState, outOfState } = t
  if (inState == null && outOfState == null) return { control, lines: [] }
  if (inState === 0 && (outOfState ?? 0) === 0) return { control, lines: ["No tuition: a federal service academy"] }
  if (inState != null && outOfState != null && inState !== outOfState) {
    const resident = schoolState === homeState
    return {
      control,
      lines: resident
        ? [`${dollars(inState)} a year for North Carolina residents`, `${dollars(outOfState)} from out of state`]
        : [`${dollars(outOfState)} a year from out of state, which is what a North Carolina family pays`, `${dollars(inState)} for residents of the state`],
    }
  }
  return { control, lines: [`${dollars((inState ?? outOfState)!)} a year`] }
}
