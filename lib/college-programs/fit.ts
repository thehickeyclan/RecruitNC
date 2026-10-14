/**
 * Comparing colleges for a family (Matt, 14 Oct 2026: "a tool like college coaches have for
 * comparing athletes, that lets families compare programs for their best fit").
 *
 * Everything here is a fact about the college from the US Department of Education
 * (fit-federal.json, built from IPEDS), set beside the family's own wrestler where a comparison is
 * mechanical: a test score is above, inside or below the middle half of admitted students, and
 * nothing more is said. Two rules:
 *
 * - **Net price by family income is only ever shown where it applies.** A public college reports
 *   it for its own state's students only, so for a North Carolina family at an out-of-state public
 *   college there is no published figure, and the page says so and links the college's calculator.
 * - **The family's own numbers never leave the family.** GPA, test scores and income are read for
 *   this page and shown to this family only; nothing about them is stored here or shown to a coach.
 */
import data from "@/lib/college-programs/fit-federal.json"

export type CollegeFit = {
  admitRate: number | null
  satReading: [number | null, number | null]
  satMath: [number | null, number | null]
  act: [number | null, number | null]
  gradRate: number | null
  gradRateKind: string | null
  retention: number | null
  undergrads: number | null
  setting: string | null
  netPriceAverage: number | null
  netPriceByIncome: Array<number | null> | null
  netPriceInStateOnly: boolean
  netPriceCalculatorUrl: string | null
  admissionsUrl: string | null
  financialAidUrl: string | null
}

const FIT = data.fit as unknown as Record<string, CollegeFit>

export const fitForSchool = (schoolId: string): CollegeFit | null => FIT[schoolId] ?? null

export const INCOME_BRACKETS = ["$0 to $30,000", "$30,001 to $48,000", "$48,001 to $75,000", "$75,001 to $110,000", "Over $110,000"] as const

export type Placement = "above" | "within" | "below"

/** Where a score sits against the middle half of admitted students. */
export function scorePlacement(score: number | null | undefined, range: [number | null, number | null]): Placement | null {
  const [low, high] = range
  if (score == null || !Number.isFinite(score) || low == null || high == null) return null
  return score > high ? "above" : score < low ? "below" : "within"
}

/** The SAT range as one total, from the two section ranges. */
export function satTotalRange(fit: CollegeFit): [number | null, number | null] {
  const [r25, r75] = fit.satReading
  const [m25, m75] = fit.satMath
  return r25 != null && m25 != null && r75 != null && m75 != null ? [r25 + m25, r75 + m75] : [null, null]
}

export type NetPrice = { amount: number; note: string } | { amount: null; note: string }

/**
 * What families at one income level paid, for a North Carolina family at this college; or why
 * there is no figure.
 */
export function netPriceFor(fit: CollegeFit, schoolState: string, bracket: number | null, homeState = "NC"): NetPrice {
  if (fit.netPriceInStateOnly && schoolState !== homeState) {
    return { amount: null, note: "Published for in-state students only. Use the college's calculator." }
  }
  if (bracket == null) {
    return fit.netPriceAverage != null
      ? { amount: fit.netPriceAverage, note: "Average for all aided students. Choose your income for a closer figure." }
      : { amount: null, note: "Not published." }
  }
  const amount = fit.netPriceByIncome?.[bracket] ?? null
  return amount != null ? { amount, note: `Families earning ${INCOME_BRACKETS[bracket]}, 2022-23` } : { amount: null, note: "Not published for this income." }
}
