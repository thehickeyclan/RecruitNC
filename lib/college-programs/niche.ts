import data from "@/lib/college-programs/niche-grades.json"

/**
 * Niche report-card grades for each college (Matt, 17 Oct 2026): the letter grades Niche publishes
 * on every college's public profile, collected 17 Oct 2026 (scripts/import-niche-grades.ts). A
 * category Niche does not grade for a college is absent, never filled in. Always shown with the
 * source and a link to the college's own Niche page.
 */
export type NicheGrades = { url: string | null; grades: Partial<Record<NicheCategory, string>> }

export const NICHE_CATEGORIES = [
  { key: "overall", label: "Overall" },
  { key: "academics", label: "Academics" },
  { key: "value", label: "Value" },
  { key: "professors", label: "Professors" },
  { key: "campus", label: "Campus" },
  { key: "dorms", label: "Dorms" },
  { key: "campus_food", label: "Campus food" },
  { key: "student_life", label: "Student life" },
  { key: "location", label: "Location" },
  { key: "safety", label: "Safety" },
] as const

export type NicheCategory = (typeof NICHE_CATEGORIES)[number]["key"]

export const NICHE_SOURCE = "Niche report cards (niche.com), collected October 17, 2026"

const SCHOOLS = data.schools as Record<string, { url: string | null; grades: Record<string, string> }>
const SHOWN = new Set<string>(NICHE_CATEGORIES.map((c) => c.key))

/**
 * The grades we show (Matt, 17 Oct 2026): party scene, athletics, diversity, student wellness and
 * future readiness are left out everywhere - the pages, Compare and Scout - though the file keeps them.
 */
export function nicheFor(schoolId: string): NicheGrades | null {
  const row = SCHOOLS[schoolId]
  if (!row) return null
  return { url: row.url, grades: Object.fromEntries(Object.entries(row.grades).filter(([k]) => SHOWN.has(k))) as NicheGrades["grades"] }
}

/** A+ is 13 points, F is 1: for finding the best grade in a row, never shown. */
export function gradePoints(grade: string | null | undefined): number | null {
  const m = String(grade ?? "").match(/^([A-DF])([+-]?)$/)
  if (!m) return null
  const base = { A: 11, B: 8, C: 5, D: 2, F: 0 }[m[1] as "A" | "B" | "C" | "D" | "F"]
  return m[1] === "F" ? 1 : base + (m[2] === "+" ? 1 : m[2] === "-" ? -1 : 0) + 1
}

/** Chip colours by letter. */
export function gradeTone(grade: string): string {
  const letter = grade[0]
  return letter === "A" ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30" : letter === "B" ? "bg-sky-400/15 text-sky-300 ring-sky-400/30" : letter === "C" ? "bg-amber-400/15 text-amber-200 ring-amber-400/30" : "bg-red-400/15 text-red-300 ring-red-400/30"
}
