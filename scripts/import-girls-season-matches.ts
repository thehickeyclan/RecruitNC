#!/usr/bin/env npx tsx
/**
 * In-season match histories for North Carolina's top girls, from RankWrestlers.
 *
 * The girls' ranking board scored on state, national and duals results and almost nothing else:
 * four girls in the Class of 2027 had a season of matches on file against forty-odd ranked boys,
 * so head-to-head and the match résumé were empty for nearly every girl on the board.
 *
 * Reads the `nc-women-matches` bundle (targets.json, index.json, seasons/*.json). Each season file
 * is already the shape the match manager writes to `matches`, so a row goes in exactly as the
 * RankWrestler sync route would write it: one row per athlete per season, replaced whole.
 *
 * Nobody is created. A girl is matched to an existing female profile on name and class year, and
 * the school must agree; anything less is reported, not guessed. Class year comes from the season
 * files' own grade column, not targets.json: the first bundle put Laila Tellez and MacKenzie
 * Shaver in 2027 while their files said sophomore in 2025-26. A school agreeing in ANY season is
 * enough, because girls transfer (Jany Echeverria, Swain County to West Henderson). A season already on file with
 * MORE matches than the file is left alone - a hand-entered season is not overwritten by a
 * thinner scrape. The file's grade must also agree with her class year for that season.
 *
 *   npx tsx scripts/import-girls-season-matches.ts <bundle-dir>           # dry run
 *   npx tsx scripts/import-girls-season-matches.ts <bundle-dir> --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const WRITE = process.argv.includes("--write")
const DIR = process.argv.slice(2).find((a) => !a.startsWith("--"))
if (!DIR) {
  console.error("usage: import-girls-season-matches.ts <bundle-dir> [--write]")
  process.exit(1)
}

type Target = { name: string; class: number; school: string }
type IndexRow = { name: string; season: string; file?: string; status: string; matches: number }
type SeasonFile = {
  wrestler_info: { first_name: string; last_name: string; season: string; grade: string; high_school: string }
  season_summary: Record<string, number>
  matches: unknown[]
}

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim()

/** "Garner Magnet High School" and "Garner Magnet" are one school; strip the furniture. */
const schoolKey = (s: unknown) =>
  norm(s)
    .replace(/\b(high|school|hs|magnet|senior|the)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()

const schoolsAgree = (a: unknown, b: unknown) => {
  const x = schoolKey(a)
  const y = schoolKey(b)
  return !x || !y || x.includes(y) || y.includes(x)
}

/** 2025-26 Junior -> 2027. The season's spring year plus years left after this one. */
const GRADE_YEARS_LEFT: Record<string, number> = { senior: 0, junior: 1, sophomore: 2, freshman: 3 }
function classFromGrade(season: string, grade: string): number | null {
  const left = GRADE_YEARS_LEFT[norm(grade)]
  const spring = Number(season.slice(0, 4)) + 1
  return left === undefined || !Number.isFinite(spring) ? null : spring + left
}

async function main() {
  // Later bundles prefix their files ("batch2-targets.json"); take whichever one is there.
  const bundleFile = (suffix: string) => {
    const name = fs.readdirSync(DIR!).find((f) => f === suffix || f.endsWith(`-${suffix}`))
    return name ? path.join(DIR!, name) : null
  }
  // Season files live in seasons/, or - in a bundle of loose files (batch 3 and 4) - beside the rest.
  const seasonsDir = fs.existsSync(path.join(DIR!, "seasons")) ? path.join(DIR!, "seasons") : DIR!
  const targetsFile = bundleFile("targets.json")
  const indexFile = bundleFile("index.json")
  let targets: Target[]
  let index: IndexRow[]
  if (targetsFile && indexFile) {
    targets = JSON.parse(fs.readFileSync(targetsFile, "utf8")) as Target[]
    index = JSON.parse(fs.readFileSync(indexFile, "utf8")) as IndexRow[]
  } else {
    /*
     * No girl list or index: read them off the season files themselves. Her name and school come
     * from wrestler_info; her class is the one the files' grades agree on (below), so the target's
     * own class only matters when no file states a grade.
     */
    const loose = fs
      .readdirSync(seasonsDir)
      .filter((f) => f.endsWith(".json"))
      .flatMap((file) => {
        try {
          const j = JSON.parse(fs.readFileSync(path.join(seasonsDir, file), "utf8")) as SeasonFile
          if (!j?.wrestler_info) return []
          return [{ file, info: j.wrestler_info, matches: Array.isArray(j.matches) ? j.matches.length : 0 }]
        } catch {
          return []
        }
      })
    index = loose.map((l) => ({
      name: `${l.info.first_name} ${l.info.last_name}`.trim(),
      season: l.info.season,
      file: l.file,
      status: l.matches > 0 ? "ok" : "ok-empty",
      matches: l.matches,
    }))
    const byName = new Map<string, Target>()
    for (const l of loose) {
      const name = `${l.info.first_name} ${l.info.last_name}`.trim()
      if (!byName.has(norm(name))) {
        byName.set(norm(name), { name, school: l.info.high_school, class: classFromGrade(l.info.season, l.info.grade) ?? 0 })
      }
    }
    targets = [...byName.values()]
    console.log(`No girl list or index here: read ${index.length} season files for ${targets.length} girls.`)
  }

  const { data: girls, error } = await sb
    .from("athletes")
    .select("id, name, graduationyear, highschool")
    .ilike("gender", "female")
    .limit(5000)
  if (error) throw error

  const report = { matchedGirls: 0, unmatched: [] as string[], written: 0, skipped: [] as string[], mismatched: [] as string[] }
  const athleteFor = new Map<string, { id: string; name: string }>()
  const classOf = new Map<string, number>()

  const seasonFiles = (name: string) =>
    index
      .filter((r) => norm(r.name) === norm(name) && r.status === "ok" && r.file)
      .map((r) => JSON.parse(fs.readFileSync(path.join(seasonsDir, r.file!), "utf8")) as SeasonFile)

  for (const t of targets) {
    const files = seasonFiles(t.name)
    /*
     * The class most of her season files agree on. FloArena's 2023-24 seasons call 8th graders
     * "Freshman" (MacKenzie Shaver's includes the Jr High State Championship), so one season can
     * disagree with the rest; that season is skipped below, not the girl.
     */
    const votes = new Map<number, number>()
    for (const f of files) {
      const c = classFromGrade(f.wrestler_info.season, f.wrestler_info.grade)
      if (c !== null) votes.set(c, (votes.get(c) ?? 0) + 1)
    }
    const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1])
    if (ranked.length > 1 && ranked[0]![1] === ranked[1]![1]) {
      report.unmatched.push(`${t.name}: season files split evenly on class (${ranked.map(([c]) => c).join(", ")})`)
      continue
    }
    const klass = ranked[0]?.[0] ?? t.class
    classOf.set(norm(t.name), klass)
    const schools = [t.school, ...files.map((f) => f.wrestler_info.high_school)]
    const sameName = (girls ?? []).filter((g) => norm(g.name) === norm(t.name))
    const sameClass = sameName.filter((g) => Number(g.graduationyear) === klass)
    const hit = sameClass.length === 1 ? sameClass[0] : null
    if (!hit) {
      report.unmatched.push(
        `${t.name} (${klass}, ${t.school}): ${sameName.length} same-name profile(s), ${sameClass.length} in class`,
      )
      continue
    }
    if (!schools.some((school) => schoolsAgree(hit.highschool, school))) {
      report.mismatched.push(`${t.name}: profile school "${hit.highschool}" vs file "${schools.join(" / ")}"`)
      continue
    }
    athleteFor.set(norm(t.name), { id: hit.id, name: hit.name })
    report.matchedGirls++
  }

  for (const row of index) {
    if (row.status !== "ok" || !row.file || row.matches <= 0) continue
    const athlete = athleteFor.get(norm(row.name))
    if (!athlete) continue
    const file = JSON.parse(fs.readFileSync(path.join(seasonsDir, row.file), "utf8")) as SeasonFile
    const info = file.wrestler_info
    const impliedClass = classFromGrade(info.season, info.grade)
    if (impliedClass !== null && impliedClass !== classOf.get(norm(row.name))) {
      report.skipped.push(
        `${row.name} ${info.season}: file says ${info.grade} (class ${impliedClass}), she is ${classOf.get(norm(row.name))} - middle school or misgraded`,
      )
      continue
    }

    const { data: existing } = await sb
      .from("matches")
      .select("total_matches")
      .eq("athlete_id", athlete.id)
      .eq("season", info.season)
    const onFile = Math.max(0, ...(existing ?? []).map((r) => Number(r.total_matches) || 0))
    const incoming = Number(file.season_summary.total_matches) || file.matches.length
    if (onFile > incoming) {
      report.skipped.push(`${row.name} ${info.season}: ${onFile} matches on file, file has ${incoming} - kept`)
      continue
    }

    const s = file.season_summary
    const record = {
      athlete_id: athlete.id,
      wrestler_id: `${athlete.name.toLowerCase().replace(/\s+/g, "_")}_${info.season}`,
      first_name: info.first_name,
      last_name: info.last_name,
      season: info.season,
      grade: info.grade,
      high_school: info.high_school,
      total_matches: s.total_matches,
      wins: s.wins,
      losses: s.losses,
      pins: s.pins,
      tech_falls: s.tech_falls,
      decisions: s.decisions,
      major_decisions: s.major_decisions,
      forfeits_won: s.forfeits_won,
      pin_percentage: s.pin_percentage,
      tf_percentage: s.tf_percentage,
      finishing_percentage: s.finishing_percentage,
      matches: file.matches,
    }
    console.log(
      `${WRITE ? "write" : "would write"}  ${athlete.name.padEnd(24)} ${info.season}  ${s.wins}-${s.losses}` +
        (onFile ? `  (replaces ${onFile} on file)` : ""),
    )
    if (WRITE) {
      const del = await sb.from("matches").delete().eq("athlete_id", athlete.id).eq("season", info.season)
      if (del.error) throw new Error(`${row.name} ${info.season}: ${del.error.message}`)
      const ins = await sb.from("matches").insert(record)
      if (ins.error) throw new Error(`${row.name} ${info.season}: ${ins.error.message}`)
    }
    report.written++
  }

  console.log(`\n${report.matchedGirls}/${targets.length} girls matched to a profile; ${report.written} seasons ${WRITE ? "written" : "to write"}`)
  for (const [label, list] of [
    ["No single profile", report.unmatched],
    ["School disagrees", report.mismatched],
    ["Seasons skipped", report.skipped],
  ] as const) {
    if (list.length) console.log(`\n${label} (${list.length}):\n  ${list.join("\n  ")}`)
  }
  if (!WRITE) console.log("\nDry run. Re-run with --write to apply.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
