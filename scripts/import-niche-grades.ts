/**
 * Niche report-card grades for every college wrestling program (Matt, 17 Oct 2026), from the
 * spreadsheet collected from each school's public Niche profile. Run:
 *   npx tsx scripts/import-niche-grades.ts <sheet.json>
 * where the JSON is the workbook read to { sheetName: rows[][] }. Writes
 * lib/college-programs/niche-grades.json keyed by the map's school id, and lists any row it could
 * not place. A grade Niche does not publish stays absent: nothing is guessed.
 */
import { readFileSync, writeFileSync } from "fs"

import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { buildSchoolIndex, matchSchool, nameKey } from "@/lib/college-programs/match"
import data from "@/lib/college-programs/programs-2026-27.json"
import type { CollegeMapSchool } from "@/lib/college-programs/types"

const SCHOOLS = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS]
const INDEX = buildSchoolIndex(SCHOOLS)
const GRADE_COLUMNS = ["Overall Niche Grade", "Academics", "Value", "Diversity", "Campus", "Athletics", "Party Scene", "Professors", "Location", "Dorms", "Campus Food", "Student Life", "Safety", "Student Wellness", "Future Readiness"]
const KEY: Record<string, string> = { "Overall Niche Grade": "overall" }
const keyOf = (c: string) => KEY[c] ?? c.toLowerCase().replace(/[^a-z]+/g, "_")

/** Grades Matt read off a profile the collector could not reach (17 Oct 2026). */
const BY_HAND: Record<string, Record<string, string>> = {
  "Presbyterian College|SC": { overall: "B-", academics: "B-", value: "B-", diversity: "A-", campus: "B-", athletics: "B-", party_scene: "B+", professors: "B", location: "C", dorms: "C+", campus_food: "C+", student_life: "B-", safety: "C", student_wellness: "A" },
}

function place(name: string, state: string): string | null {
  const direct = matchSchool(INDEX, name) ?? matchSchool(INDEX, name.replace(/\s*\([^)]*\)\s*$/, ""))
  if (direct) return direct
  // Same state and the same reduced name, or one name inside the other.
  const key = nameKey(name.replace(/\s*\([^)]*\)/g, ""))
  const sameState = SCHOOLS.filter((s) => s.state === state)
  const exact = sameState.filter((s) => nameKey(s.name.replace(/\s*\([^)]*\)/g, "")) === key)
  if (exact.length === 1) return exact[0].id
  const inside = sameState.filter((s) => {
    const k = nameKey(s.name.replace(/\s*\([^)]*\)/g, ""))
    return k.length > 3 && key.length > 3 && (k.includes(key) || key.includes(k))
  })
  return inside.length === 1 ? inside[0].id : null
}

const book = JSON.parse(readFileSync(process.argv[2], "utf8")) as Record<string, Array<Array<string | null>>>
const out: Record<string, { url: string | null; grades: Record<string, string> }> = {}
const unplaced: string[] = []
let graded = 0
for (const [sheet, rows] of Object.entries(book)) {
  if (sheet === "Notes") continue
  const head = rows[0] as string[]
  const at = (r: Array<string | null>, c: string) => r[head.indexOf(c)] ?? null
  for (const r of rows.slice(1)) {
    if (!r?.length || !at(r, "School")) continue
    const name = String(at(r, "School")), state = String(at(r, "State") ?? "")
    const id = place(name, state)
    if (!id) {
      unplaced.push(`${name} (${state}, ${sheet})`)
      continue
    }
    const grades: Record<string, string> = { ...(BY_HAND[`${name}|${state}`] ?? {}) }
    for (const c of GRADE_COLUMNS) {
      const g = at(r, c)
      if (g && /^[A-F][+-]?$/.test(g.trim())) grades[keyOf(c)] = g.trim()
    }
    if (!Object.keys(grades).length) continue
    // A college in two divisions appears twice; one entry is enough.
    if (!out[id]) graded++
    out[id] = { url: at(r, "Niche URL"), grades }
  }
}
writeFileSync("lib/college-programs/niche-grades.json", JSON.stringify({ source: "Niche (niche.com) report cards", collected: "2026-10-17", schools: out }, null, 1) + "\n")
console.log(`graded ${graded} colleges; could not place ${unplaced.length}:`)
for (const u of unplaced) console.log(" -", u)
