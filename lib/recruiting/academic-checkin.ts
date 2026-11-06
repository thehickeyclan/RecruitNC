/**
 * Academic check-ins on the Command Center home (Matt, 6 Nov 2026): "we need GPA update reminders,
 * we need to ask them did they take the SAT or ACT when they have it blank."
 *
 * Pure: decides what to ask, from the athletes row and the family's academic_checkins row
 * (scripts/sql/add-academic-checkins.sql). At most one GPA item and one test item.
 *
 * - GPA blank: ask for it.
 * - GPA due: report cards come out mid-year and at the end of the year, so a GPA last changed or
 *   confirmed before the latest January 25 or June 25 is asked about once ("Still 3.50?").
 *   A GPA from before the date was kept (no date) is due too: nobody knows how old it is.
 * - Tests, while both SAT and ACT are blank, from 10th grade:
 *   never answered → ask; "not yet" → ask again after 90 days; "signed up" → once the test date is
 *   two weeks past, ask for the score ("not back yet" waits two more weeks); "not planning to" →
 *   never ask again.
 */
import { seniorClassYear } from "@/lib/class-years"

export type TestKind = "sat" | "act"
export type TestStatus = "not_yet" | "planned" | "not_taking"

export type CheckinRow = {
  gpa_confirmed_at: string | null
  test_status: TestStatus | null
  test_kind: TestKind | null
  test_date: string | null
  test_answered_at: string | null
}

export type AcademicInput = {
  gpa: number | null
  gpaUpdatedAt: string | null
  sat: number | null
  act: number | null
  classYear: number | null
  checkin: CheckinRow | null
}

export type AcademicItem =
  | { kind: "gpa-missing" }
  | { kind: "gpa-check"; gpa: number; lastUpdated: string | null }
  | { kind: "test-ask" }
  | { kind: "test-score"; test: TestKind; date: string }

const DAY = 86_400_000
const time = (s: string | null | undefined) => {
  const t = s ? Date.parse(s) : NaN
  return Number.isNaN(t) ? null : t
}

/** The latest report-card checkpoint on or before now: January 25 or June 25. */
export function latestGradeCheckpoint(now: Date): Date {
  const y = now.getUTCFullYear()
  const points = [Date.UTC(y - 1, 5, 25), Date.UTC(y, 0, 25), Date.UTC(y, 5, 25)]
  return new Date(Math.max(...points.filter((p) => p <= now.getTime())))
}

/** 9 to 12, or null when the class year is unknown or out of high school. */
export function gradeOf(classYear: number | null, now: Date): number | null {
  if (!classYear) return null
  const grade = 12 - (classYear - seniorClassYear(now))
  return grade >= 9 && grade <= 12 ? grade : null
}

export function academicItems(a: AcademicInput, now: Date = new Date()): AcademicItem[] {
  const out: AcademicItem[] = []
  const c = a.checkin

  if (a.gpa == null) out.push({ kind: "gpa-missing" })
  else {
    const last = Math.max(time(a.gpaUpdatedAt) ?? 0, time(c?.gpa_confirmed_at) ?? 0)
    if (last < latestGradeCheckpoint(now).getTime()) out.push({ kind: "gpa-check", gpa: a.gpa, lastUpdated: a.gpaUpdatedAt && time(a.gpaUpdatedAt) ? a.gpaUpdatedAt : null })
  }

  const grade = gradeOf(a.classYear, now)
  if (!a.sat && !a.act && grade != null && grade >= 10) {
    const answered = time(c?.test_answered_at)
    const status = c?.test_status ?? null
    if (!status) out.push({ kind: "test-ask" })
    else if (status === "not_yet") {
      if (answered == null || now.getTime() - answered >= 90 * DAY) out.push({ kind: "test-ask" })
    } else if (status === "planned") {
      const date = time(c?.test_date ? `${c.test_date}T12:00:00Z` : null)
      if (date == null || !c?.test_kind) out.push({ kind: "test-ask" })
      else if (now.getTime() >= Math.max(date + 14 * DAY, (answered ?? 0) + 14 * DAY)) out.push({ kind: "test-score", test: c.test_kind, date: c.test_date! })
    }
  }
  return out
}

/** Validation for what the family types. Null when it isn't a real value. */
export function cleanGpa(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim())
  if (!Number.isFinite(n) || n <= 0 || n > 5) return null
  return Math.round(n * 100) / 100
}
export function cleanScore(test: TestKind, v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim())
  if (!Number.isInteger(n)) return null
  if (test === "sat") return n >= 400 && n <= 1600 && n % 10 === 0 ? n : null
  return n >= 1 && n <= 36 ? n : null
}
