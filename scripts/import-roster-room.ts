/**
 * Every college wrestling roster, aligned to the map (Matt, 19 Oct 2026; Muse's v3 pull,
 * college-roster-depth-2026-10-19-v3.xlsx). Run:
 *   npx tsx scripts/import-roster-room.ts <workbook.json>
 * where the JSON is the workbook read to { sheetName: rows[][] }. Writes:
 *  - lib/college-programs/roster-room.json: each team's wrestlers (name, weight, class, projected
 *    final season, redshirt, home state, high school), for the room-by-weight view and need;
 *  - lib/college-programs/roster-depth.json: the same rosters as counts, in the shape the site
 *    already reads (season 2026-27, replacing the 2025-26 pull).
 * A weight no public source gives stays blank: never guessed. Lists any team it could not place.
 */
import { readFileSync, writeFileSync } from "fs"

import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { buildSchoolIndex, matchSchool, nameKey } from "@/lib/college-programs/match"
import data from "@/lib/college-programs/programs-2026-27.json"
import type { CollegeMapSchool } from "@/lib/college-programs/types"

const SCHOOLS = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS]
const INDEX = buildSchoolIndex(SCHOOLS)
const DIVISION: Record<string, string> = { "Division I": "NCAA Division I", "Division II": "NCAA Division II", "Division III": "NCAA Division III", NAIA: "NAIA", NJCAA: "NJCAA" }

function place(name: string, division: string): string | null {
  const direct = matchSchool(INDEX, name) ?? matchSchool(INDEX, name.replace(/\s*\([^)]*\)\s*$/, ""))
  if (direct) return direct
  const key = nameKey(name.replace(/\s*\([^)]*\)/g, ""))
  const level = DIVISION[division]
  const pool = SCHOOLS.filter((s) => !level || s.programs.some((p) => p.division === level))
  const exact = pool.filter((s) => nameKey(s.name.replace(/\s*\([^)]*\)/g, "")) === key)
  return exact.length === 1 ? exact[0].id : null
}

type Row = Array<string | null>
const book = JSON.parse(readFileSync(process.argv[2], "utf8")) as Record<string, Row[]>
const rows = book["Roster Dataset v3"]
const head = rows[0] as string[]
const at = (r: Row, c: string) => r[head.indexOf(c)] ?? null

/** [name, weight, class, final season, redshirt, home state, high school] */
type Wrestler = [string, number | null, string | null, number | null, 1 | 0, string | null, string | null]
const room: Record<string, Partial<Record<"mens" | "womens", { season: string; wrestlers: Wrestler[] }>>> = {}
const unplaced = new Map<string, number>()

for (const r of rows.slice(1)) {
  if (!r?.length || !at(r, "school")) continue
  const school = String(at(r, "school"))
  const id = place(school, String(at(r, "division") ?? ""))
  if (!id) {
    unplaced.set(school, (unplaced.get(school) ?? 0) + 1)
    continue
  }
  const team = /^w/i.test(String(at(r, "gender"))) ? "womens" : "mens"
  const w = Number(at(r, "weight_used"))
  const final = Number(at(r, "projected_final_season"))
  const entry = ((room[id] ??= {})[team] ??= { season: String(at(r, "season") ?? "2026-27"), wrestlers: [] })
  entry.wrestlers.push([
    String(at(r, "name")).trim(),
    Number.isFinite(w) && w > 0 ? w : null,
    (at(r, "class_canonical") as string | null) ?? null,
    Number.isFinite(final) && final > 2000 ? final : null,
    String(at(r, "redshirt") ?? "").toUpperCase() === "Y" ? 1 : 0,
    (at(r, "home_state") as string | null) ?? null,
    (at(r, "high_school") as string | null) ?? null,
  ])
}

// The counts the site already reads, from the same rows.
const depth: Record<string, Partial<Record<"mens" | "womens", unknown>>> = {}
for (const [id, teams] of Object.entries(room)) {
  for (const [team, t] of Object.entries(teams) as Array<["mens" | "womens", { season: string; wrestlers: Wrestler[] }]>) {
    const end = Number(t.season.slice(0, 4)) + 1
    const byWeight: Record<string, { n: number; final: number; Fr: number; So: number; Jr: number }> = {}
    for (const [, weight, cls, final] of t.wrestlers) {
      if (weight == null) continue
      const b = (byWeight[String(weight)] ??= { n: 0, final: 0, Fr: 0, So: 0, Jr: 0 })
      b.n++
      if (final === end) b.final++
      if (cls === "FR") b.Fr++
      if (cls === "SO") b.So++
      if (cls === "JR") b.Jr++
    }
    ;(depth[id] ??= {})[team] = {
      season: t.season,
      size: t.wrestlers.length,
      withWeight: t.wrestlers.filter((x) => x[1] != null).length,
      withClass: t.wrestlers.filter((x) => x[2] != null).length,
      byWeight,
    }
  }
}

const source = "Muse, college roster pull v3 (2026-10-19): each school's 2026-27 roster, weights from the roster or WrestleStat"
writeFileSync("lib/college-programs/roster-room.json", JSON.stringify({ source, teams: room }) + "\n")
writeFileSync("lib/college-programs/roster-depth.json", JSON.stringify({ source, teams: depth }) + "\n")
const wrestlers = Object.values(room).flatMap((t) => Object.values(t)).reduce((n, t) => n + (t?.wrestlers.length ?? 0), 0)
console.log(`placed ${Object.keys(room).length} colleges, ${wrestlers} wrestlers; could not place ${unplaced.size} schools (${[...unplaced.values()].reduce((a, b) => a + b, 0)} wrestlers)`)
for (const [s, n] of unplaced) console.log(" -", s, n)
