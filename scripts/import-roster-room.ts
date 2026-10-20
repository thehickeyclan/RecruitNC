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

import { namesLikelySamePerson } from "@/lib/athlete-name-match"
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
// The roster sheet is renamed each version ("Roster Dataset v3", "Roster Dataset v3.2").
const rows = book[Object.keys(book).find((k) => k.startsWith("Roster Dataset"))!]
const head = rows[0] as string[]
const at = (r: Row, c: string) => r[head.indexOf(c)] ?? null

/*
 * Muse matched WrestleStat weights on the exact first and last name, so a nickname left the
 * weight blank: UNC's "Matthew Botello" has none, while the Depth Charts tab holds "Matt Botello"
 * at 133 from WrestleStat (Matt, 19 Oct 2026: "why don't you have Botello at 133?"). Fill a blank
 * weight from a WrestleStat-only depth row on the same team when the names are the same person by
 * the site's own matcher, exactly one row matches on each side, and the classes agree.
 */
const depthRows = book["Depth Charts"] ?? []
const dHead = (depthRows[0] ?? []) as string[]
const dAt = (r: Row, c: string) => r[dHead.indexOf(c)] ?? null
const cls = (c: unknown) => String(c ?? "").toUpperCase().replace(/^RS/, "") || null
const teamKey = (r: Row, get: (r: Row, c: string) => string | null) => `${get(r, "school")}|${get(r, "gender")}`
const wsOnly = new Map<string, Row[]>()
for (const r of depthRows.slice(1)) {
  if (!/not in school-roster/i.test(String(dAt(r, "weight_source") ?? ""))) continue
  const k = teamKey(r, dAt)
  wsOnly.set(k, [...(wsOnly.get(k) ?? []), r])
}
const rosterByTeam = new Map<string, Row[]>()
for (const r of rows.slice(1)) {
  if (!r?.length) continue
  const k = teamKey(r, at)
  rosterByTeam.set(k, [...(rosterByTeam.get(k) ?? []), r])
}
const filled = new Map<Row, number>()
for (const [k, roster] of rosterByTeam) {
  const extra = wsOnly.get(k) ?? []
  for (const r of roster) {
    if (Number(at(r, "weight_used")) > 0) continue
    const name = String(at(r, "name"))
    const hits = extra.filter((d) => namesLikelySamePerson(name, String(dAt(d, "wrestler"))))
    if (hits.length !== 1) continue
    const d = hits[0]
    if (roster.filter((x) => namesLikelySamePerson(String(at(x, "name")), String(dAt(d, "wrestler")))).length !== 1) continue
    const a = cls(at(r, "class_canonical")), b = cls(dAt(d, "class"))
    if (a && b && a !== b) continue
    const w = Number(dAt(d, "weight"))
    if (w > 0) filled.set(r, w)
  }
}

/** [name, weight, class, final season, redshirt, home state, high school] */
type Wrestler = [string, number | null, string | null, number | null, 1 | 0, string | null, string | null]
const room: Record<string, Partial<Record<"mens" | "womens", { season: string; wrestlers: Wrestler[] }>>> = {}
const unplaced = new Map<string, number>()

/*
 * Many schools have not posted 2026-27 yet, so a third of the rows are a 2025-26 (or older) page.
 * v3 projected every final season as if the page were this season's (SR -> 2027); Muse fixed that
 * from v3.3. So the final season is worked out here from the page's own season and class, never
 * read from the sheet: right whichever way the sheet projected it, and never moved twice. A page's
 * classes move forward by its age, and anyone whose eligibility ran out before this season is left
 * off. The team keeps its real season label, so the page says how old it is. A season the source
 * does not state ("unknown") is taken as this season's and labelled "Current" (the page the school published at the October pull; pages read "Current roster").
 */
const CURRENT_END = 2027
const CLASSES = ["FR", "SO", "JR", "SR", "GR"]
const YEARS_LEFT: Record<string, number> = { FR: 3, SO: 2, JR: 1, SR: 0, GR: 0 }
const seasonEnd = (season: string) => (/^\d{4}-\d{2}$/.test(season) ? Number(season.slice(0, 4)) + 1 : null)
let disagree = 0
let aged = 0
let dropped = 0

for (const r of rows.slice(1)) {
  if (!r?.length || !at(r, "school")) continue
  const school = String(at(r, "school"))
  const id = place(school, String(at(r, "division") ?? ""))
  if (!id) {
    unplaced.set(school, (unplaced.get(school) ?? 0) + 1)
    continue
  }
  const team = /^w/i.test(String(at(r, "gender"))) ? "womens" : "mens"
  const w = Number(at(r, "weight_used")) || filled.get(r) || 0
  const rawSeason = String(at(r, "season") ?? "").trim()
  const end = seasonEnd(rawSeason)
  const season = end ? rawSeason : "Current"
  const age = end ? Math.max(0, CURRENT_END - end) : 0
  const rawCls = (at(r, "class_canonical") as string | null) ?? null
  const projected = Number(at(r, "projected_final_season"))
  const final = rawCls && rawCls in YEARS_LEFT ? (end ?? CURRENT_END) + YEARS_LEFT[rawCls] : Number.isFinite(projected) && projected > 2000 ? projected : null
  if (final != null && Number.isFinite(projected) && projected > 2000 && projected !== final) disagree++
  if (final != null && final < CURRENT_END) {
    dropped++
    continue
  }
  if (age) aged++
  const cls = rawCls && age && CLASSES.includes(rawCls) ? CLASSES[Math.min(CLASSES.length - 1, CLASSES.indexOf(rawCls) + age)] : rawCls
  const entry = ((room[id] ??= {})[team] ??= { season, wrestlers: [] })
  entry.wrestlers.push([
    String(at(r, "name")).trim(),
    Number.isFinite(w) && w > 0 ? w : null,
    cls,
    final,
    String(at(r, "redshirt") ?? "").toUpperCase() === "Y" ? 1 : 0,
    (at(r, "home_state") as string | null) ?? null,
    (at(r, "high_school") as string | null) ?? null,
  ])
}

// The counts the site already reads, from the same rows.
const depth: Record<string, Partial<Record<"mens" | "womens", unknown>>> = {}
for (const [id, teams] of Object.entries(room)) {
  for (const [team, t] of Object.entries(teams) as Array<["mens" | "womens", { season: string; wrestlers: Wrestler[] }]>) {
    // "In their final year" means this season (2026-27), whatever season the page was.
    const end = CURRENT_END
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

const source = "Muse, college roster pull v3.2 (2026-10-20, audited): each school's 2026-27 roster, weights from the roster or WrestleStat"
writeFileSync("lib/college-programs/roster-room.json", JSON.stringify({ source, teams: room }) + "\n")
writeFileSync("lib/college-programs/roster-depth.json", JSON.stringify({ source, teams: depth }) + "\n")
const wrestlers = Object.values(room).flatMap((t) => Object.values(t)).reduce((n, t) => n + (t?.wrestlers.length ?? 0), 0)
console.log(`final seasons: ${disagree} differ from the sheet's own projection (expected on v3.2; about 0 from v3.3)`)
console.log(`older rosters: ${aged} wrestlers moved up a class, ${dropped} whose eligibility had run out left off`)
console.log(`filled ${filled.size} blank weights from WrestleStat by nickname`)
for (const [r, w] of [...filled].slice(0, 40)) console.log(" ~", at(r, "school"), at(r, "name"), w)
console.log(`placed ${Object.keys(room).length} colleges, ${wrestlers} wrestlers; could not place ${unplaced.size} schools (${[...unplaced.values()].reduce((a, b) => a + b, 0)} wrestlers)`)
for (const [s, n] of unplaced) console.log(" -", s, n)
