/**
 * The academic gate for a recruited wrestler: what each level requires to compete as a freshman
 * (Matt, 5 Nov 2026). App State told Gavin he "did not have the grades" because his scores sat
 * under the averages for ALL admitted students; recruited wrestlers get real admissions help from
 * coaches at most colleges, so the level's eligibility minimum is the line that matters.
 *
 * Every number here is read from the rules library (lib/recruiting/learn/content.ts), never typed
 * twice: when a rule changes there, this follows. If the library stops saying it, the floor comes
 * back null and the fit line says nothing about it rather than guessing. Left out on purpose
 * because the library does not source it: anything about an academic redshirt, the sliding scale,
 * or whether a college counts weighted grades.
 */
import type { CollegeDivision } from "@/lib/college-programs/types"
import { learnPage } from "@/lib/recruiting/learn/content"

export type EligibilityFloor = {
  level: CollegeDivision
  /** The Learn page the rule lives on. */
  slug: string
  /** The lowest GPA that competes as a freshman; null where the level sets none. */
  gpa: number | null
  /** Division I and II count core courses only; the NAIA counts the high school GPA. */
  coreCourses: boolean
  /** Division II: what happens just under the line, as the library words it. */
  shortfall: string | null
  /** NAIA: meet two of three instead (the third, top half of the class, we never know). */
  twoOfThree: { act: number; sat: number; gpa: number } | null
  /** Said when the level sets no GPA minimum. */
  none: string | null
}

const SLUG: Record<CollegeDivision, string> = {
  "NCAA Division I": "division-1",
  "NCAA Division II": "division-2",
  "NCAA Division III": "division-3",
  NAIA: "naia",
  NJCAA: "njcaa",
}

const sections = (slug: string) => learnPage(slug)?.sections ?? []
const row = (slug: string, label: string) =>
  sections(slug).flatMap((s) => s.rows ?? []).find((r) => r.label === label)?.value ?? null
const bullet = (slug: string, test: RegExp) => sections(slug).flatMap((s) => s.bullets ?? []).find((b) => test.test(b)) ?? null
const decimal = (text: string | null) => {
  const m = text?.match(/\b(\d\.\d+)\b/)
  return m ? Number(m[1]) : null
}

export function eligibilityFloor(level: CollegeDivision | null | undefined): EligibilityFloor | null {
  if (!level) return null
  const slug = SLUG[level]
  const base = { level, slug, gpa: null, coreCourses: false, shortfall: null, twoOfThree: null, none: null }
  if (level === "NCAA Division I" || level === "NCAA Division II") {
    const gpa = decimal(row(slug, "Minimum core-course GPA"))
    return gpa == null ? null : { ...base, gpa, coreCourses: true, shortfall: row(slug, "If you fall short") }
  }
  if (level === "NAIA") {
    const gpa = decimal(row(slug, "The rule"))
    const alt = row(slug, "Or meet two of these three")
    const tests = alt?.match(/(\d+) on the ACT or (\d+) on the SAT/)
    const altGpa = decimal(alt?.match(/a (\d\.\d+) GPA/)?.[0] ?? null)
    if (gpa == null) return null
    return { ...base, gpa, twoOfThree: tests && altGpa != null ? { act: Number(tests[1]), sat: Number(tests[2]), gpa: altGpa } : null }
  }
  if (level === "NCAA Division III") {
    return bullet(slug, /no NCAA academic certification for Division III/) ? { ...base, none: "Division III has no NCAA GPA minimum. Getting admitted is the bar." } : null
  }
  return bullet(slug, /no minimum high school GPA/) ? { ...base, none: "Junior college needs a high school diploma. There is no GPA or test minimum." } : null
}
