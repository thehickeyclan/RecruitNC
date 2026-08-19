/**
 * Graduation year replaces date of birth for drop-in registration.
 *
 * NC United drop-ins are middle school and high school only, and a valid graduation year *is*
 * that check — no separate age rule is needed. It is also the language the rest of the product
 * already speaks ("Class of 2027" on commitments and rankings), and it avoids holding a minor's
 * exact date of birth for what amounts to a cohort question.
 */

/** School years roll in August, so the class graduating this school year changes then. */
export function currentSchoolYearEnd(now: Date = new Date()): number {
  return now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear()
}

/** Seniors graduate at the school-year end; current 6th graders graduate six years later. */
export function graduationYearRange(now: Date = new Date()): { min: number; max: number } {
  const seniors = currentSchoolYearEnd(now)
  return { min: seniors, max: seniors + 6 }
}

export function graduationYearOptions(now: Date = new Date()): number[] {
  const { min, max } = graduationYearRange(now)
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

export function parseGraduationYear(
  raw: unknown,
  now: Date = new Date(),
): { ok: true; value: number } | { ok: false; error: string } {
  const s = typeof raw === "string" ? raw.trim() : typeof raw === "number" ? String(raw) : ""
  if (!s) return { ok: false, error: "Graduation year is required." }

  const year = Number.parseInt(s, 10)
  if (!Number.isFinite(year) || !/^\d{4}$/.test(s)) {
    return { ok: false, error: "Enter a four-digit graduation year." }
  }

  const { min, max } = graduationYearRange(now)
  if (year < min || year > max) {
    return {
      ok: false,
      error: `Drop-ins are open to middle and high school wrestlers — graduation years ${min} to ${max}.`,
    }
  }

  return { ok: true, value: year }
}
