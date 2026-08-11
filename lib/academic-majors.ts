/**
 * Intended college majors offered on the athlete profile form.
 *
 * A dropdown rather than free text, because this field only earns its place if a coach can
 * filter on it. The 22 values already in `academic_interest` show what happens otherwise —
 * "Exercise science " with a trailing space next to "Sports Medicine" and "Pre-Med", none of
 * which group together in a query.
 *
 * The list is seeded from those real answers, so nobody who already filled it in is forced
 * into a worse category, and "Other" keeps a free-text escape hatch for the rest.
 */
export const ACADEMIC_MAJOR_OPTIONS = [
  "Undecided",
  "Agriculture",
  "Athletic Training",
  "Aviation",
  "Biology",
  "Business / Business Administration",
  "Communications",
  "Computer Science",
  "Criminal Justice",
  "Cybersecurity",
  "Economics",
  "Education",
  "Engineering — Civil",
  "Engineering — Mechanical",
  "Engineering — Other",
  "Exercise Science",
  "Finance",
  "Health Sciences / Pre-Med",
  "Kinesiology",
  "Marketing",
  "Nursing",
  "Physical Therapy (Pre-PT)",
  "Psychology",
  "Sports Management",
  "Sports Medicine",
  "Other",
] as const

export type AcademicMajor = (typeof ACADEMIC_MAJOR_OPTIONS)[number]

/** The option that reveals the free-text box. */
export const ACADEMIC_MAJOR_OTHER = "Other"

/**
 * What actually gets stored: the picked option, or whatever they typed under "Other".
 * Returns null rather than an empty string so an unanswered field stays NULL in the column.
 */
export function resolveAcademicMajor(selected: string, otherText: string): string | null {
  if (!selected) return null
  if (selected === ACADEMIC_MAJOR_OTHER) {
    const typed = otherText.trim()
    return typed || null
  }
  return selected
}
