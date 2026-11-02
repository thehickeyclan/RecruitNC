#!/usr/bin/env npx tsx
/**
 * Ultimate Club Duals - the North Carolina teams, 2025 and 2026.
 *
 * NC United's two 2025 squads are already in (237 bouts). Missing were the girls' club teams:
 * Carolina Gold in 2025, and in 2026 the same team under its new name, NC Gold, alongside
 * Capital City. That is a season of folkstyle duals for wrestlers whose records otherwise end at
 * the state tournament.
 *
 * Which teams are North Carolina is decided by evidence, not by the name. "Capital City Wrestling
 * Club" says nothing about a state; it carries six wrestlers we already hold, every one of them a
 * North Carolina girl, which does. A team with one name in common is not evidence - across a
 * national field that is how namesakes get swapped - so the one-match teams are reported and left
 * out.
 *
 * The file wraps every field Excel-style (="value"), the date is the dual date, and a forfeit has
 * an empty losing wrestler.
 *
 *   npx tsx scripts/import-ultimate-club-duals.ts          # dry run
 *   npx tsx scripts/import-ultimate-club-duals.ts --write
 *   npx tsx scripts/import-ultimate-club-duals.ts --file 2026UltimateClubFreestyleDuals.csv [--write]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"

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

/** The North Carolina teams, and the key their bouts hang under. */
const SOURCES = [
  { file: "2025UltimateClubFolkstyleDuals (1).csv", year: 2025, date: "2025-09-20",
    teams: { "Carolina Gold": "ucd-2025-carolina-gold" } },
  { file: "2026UltimateClubFallDuals.csv", year: 2026, date: "2026-09-19",
    teams: { "NC Gold - GK12E": "ucd-2026-nc-gold", "Capital City Wrestling Club - GK12E": "ucd-2026-capital-city" } },
  /*
   * The spring freestyle duals, Harrisburg, 2 May 2026 (Addison Gore's dad, 2 Nov 2026). Capital
   * City took two teams: GHSE, the high-school girls, and BK8, boys K-8 - youth, which never goes
   * on a profile. No profiles are minted from this file: a duals export carries no class year.
   */
  { file: "2026UltimateClubFreestyleDuals.csv", year: 2026, date: "2026-05-02", eventName: "2026 Ultimate Club Spring FS Duals", mint: false,
    teams: { "Capital City Wrestling Club - GHSE": "ucd-2026-capital-city-spring" } },
] as {
  file: string; year: number; date: string; teams: Record<string, string>; eventName?: string; mint?: boolean
}[]
/** `--file <name>` imports one source only; the others are left exactly as they are. */
const ONLY = process.argv.includes("--file") ? process.argv[process.argv.indexOf("--file") + 1] : null
const RUN = ONLY ? SOURCES.filter((s) => s.file === ONLY) : SOURCES
if (ONLY && RUN.length === 0) throw new Error(`no source named ${ONLY}`)

const unwrap = (v: string) => {
  const inner = v.trim().replace(/^"|"$/g, "")
  const m = inner.match(/^="?(.*?)"?$/)
  return (m ? m[1] : inner).replace(/^"|"$/g, "").trim()
}
function readCsv(file: string): Array<Record<string, string>> {
  const lines = fs.readFileSync(path.join(`${process.env.HOME}/Downloads`, file), "utf8").trim().split("\n")
  const parse = (line: string) => {
    const vals: string[] = []
    let cur = "", q = false
    for (const ch of line) {
      if (ch === '"') q = !q
      else if (ch === "," && !q) { vals.push(cur); cur = "" }
      else cur += ch
    }
    vals.push(cur)
    return vals.map(unwrap)
  }
  const hdr = parse(lines[0])
  return lines.slice(1).map((l) => {
    const v = parse(l)
    const row: Record<string, string> = {}
    hdr.forEach((h, i) => (row[h] = v[i] ?? ""))
    return row
  })
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  // Paged: one select stops at 1,000 rows, and a wrestler past that read as "no profile".
  const athletes: Array<{ id: string; name: string }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("athletes").select("id, name").order("id").range(from, from + 999)
    if (error) throw error
    athletes.push(...((data ?? []) as Array<{ id: string; name: string }>))
    if (!data || data.length < 1000) break
  }

  const rows: Array<Record<string, unknown>> = []
  const guesting = new Map<string, string>()
  const created = new Set<string>()
  /** Unmatched names from a source that mints nobody. */
  const unlinked = new Set<string>()

  for (const src of RUN) {
    const bouts = readCsv(src.file)
    let order = 0
    for (const b of bouts) {
      order += 1
      for (const side of ["Winning", "Losing"] as const) {
        const team = b[`${side} Team`]
        const key = (src.teams as Record<string, string>)[team]
        if (!key) {
          /*
           * An NC wrestler on another state's team: reported, not imported.
           *
           * NC United's own squads are skipped from this report - they are North Carolina and
           * their 2025 bouts are already on file, so listing them as "another state's team" would
           * bury the handful that matter in thirty rows of noise.
           */
          const n = b[`${side} Wrestler`]
          if (!/^NC United/i.test(team) && n && athletes.some((a) => namesLikelySamePerson(a.name, n))) {
            guesting.set(n, team)
          }
          continue
        }
        const name = b[`${side} Wrestler`]
        if (!name) continue
        const other = side === "Winning" ? "Losing" : "Winning"
        const hit = athletes.filter((a) => namesLikelySamePerson(a.name, name))
        if (hit.length === 0 && src.mint !== false) created.add(name)
        else if (hit.length === 0) unlinked.add(name)
        rows.push({
          event_key: key,
          event_name: src.eventName ?? `${src.year} Ultimate Club Duals`,
          year: src.year,
          event_date: src.date,
          weight_class: b.Weight || null,
          round: b.Round || null,
          source_round: b.Round || null,
          bout_order: order,
          athlete_name: name,
          athlete_id: hit.length === 1 ? hit[0].id : null,
          athlete_club: team,
          opponent_name: b[`${other} Wrestler`] || null,
          opponent_club: b[`${other} Team`] || null,
          win: side === "Winning",
          is_bye: !b[`${other} Wrestler`],
          win_type: b["Win Type"] || null,
          score: b.Result || null,
          source_file: src.file,
        })
      }
    }
    console.log(`${src.file}: ${bouts.length} bouts read`)
  }

  const linked = rows.filter((r) => r.athlete_id)
  console.log(`\nwrestler-rows for NC teams: ${rows.length} · matched to a profile: ${linked.length}`)
  const byTeam = new Map<string, number>()
  for (const r of rows) byTeam.set(String(r.athlete_club), (byTeam.get(String(r.athlete_club)) ?? 0) + 1)
  for (const [t, n] of byTeam) console.log(`   ${String(n).padStart(4)}  ${t}`)

  if (created.size) {
    console.log(`\non an NC team with no profile (${created.size}): ${[...created].slice(0, 15).join(", ")}${created.size > 15 ? " …" : ""}`)
  }
  if (unlinked.size) console.log(`\nno profile, left unlinked (${unlinked.size}): ${[...unlinked].join(", ")}`)
  const multi = rows.filter((r) => !r.athlete_id && !unlinked.has(String(r.athlete_name)) && !created.has(String(r.athlete_name)))
  if (multi.length) console.log(`\nmore than one possible profile, left unlinked: ${[...new Set(multi.map((r) => r.athlete_name))].join(", ")}`)
  if (guesting.size) {
    console.log(`\nwrestlers we hold who appear on another state's team — check before trusting (${guesting.size}):`)
    for (const [n, t] of guesting) console.log(`   ${n.padEnd(22)} ${t}`)
  }

  if (!WRITE) { console.log("\nRe-run with --write to insert."); return }

  /*
   * Wrestlers on a North Carolina team we have never met get a profile.
   *
   * Every one of these three teams is a girls' squad, so an unmatched wrestler on them is a North
   * Carolina girl - the same reasoning as the Fargo brackets. Class year is left for a human; the
   * duals carry no grade.
   */
  for (const name of created) {
    const { data: made, error } = await sb
      .from("athletes")
      .insert({
        name,
        firstName: name.split(" ")[0],
        lastName: name.split(" ").slice(1).join(" "),
        gender: "Female",
        is_nc_athlete: true,
      } as never)
      .select("id, name")
      .maybeSingle()
    if (error || !made) { console.error(`  could not create ${name}: ${error?.message}`); continue }
    athletes.push(made as never)
    for (const r of rows) if (!r.athlete_id && r.athlete_name === name) r.athlete_id = (made as any).id
  }
  if (created.size) console.log(`created ${created.size} profiles for wrestlers on the NC teams`)

  for (const src of RUN) await sb.from("other_tournament_bouts").delete().eq("source_file", src.file)
  let inserted = 0
  for (let i = 0; i < rows.length; i += 300) {
    const { error } = await sb.from("other_tournament_bouts").insert(rows.slice(i, i + 300) as never)
    if (error) { console.error("FAILED:", error.message); break }
    inserted += rows.slice(i, i + 300).length
  }
  console.log(`\ninserted ${inserted}`)
}
main()
