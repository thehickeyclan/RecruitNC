#!/usr/bin/env npx tsx
/**
 * Girls' state placers, 2025-26, 48 states - the out-of-state credentials behind a win.
 *
 * state_tournament_placers held 11,602 wrestlers and every one was a boy, so a North Carolina
 * girl who beat a Pennsylvania state champion at Fargo got no credit for it: the report had no
 * way to know who the Pennsylvania placers were. Her best wins read as ordinary results.
 *
 * North Carolina is skipped. Our own girls' state results are already in
 * wrestling_nchsaa_results with classifications and a link to the wrestler; a second copy here
 * would double-count a placement and could disagree with the first.
 *
 * Nobody is linked to an athlete by this import. These are opponents, not our wrestlers - the
 * index matches them by name and school at the moment a bout is read, which is the existing
 * evidence-only rule and the reason a namesake in another state cannot inherit a credential.
 *
 *   npx tsx scripts/import-girls-state-placers.ts          # dry run
 *   npx tsx scripts/import-girls-state-placers.ts --write
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
/*
 * Which season's file to load. It was fixed at 2026 because that was the only girls' file we had;
 * 2025 arrived on 4 Oct 2026, and the Oregon rows in the first 2026 file turned out to be the
 * 2024-25 season mislabelled, so re-running one season without disturbing the other now matters.
 */
const SEASON = Number(process.argv[process.argv.indexOf("--season") + 1]) || 2026
const FILE =
  process.argv.includes("--file")
    ? process.argv[process.argv.indexOf("--file") + 1]!.replace(/^~/, process.env.HOME ?? "~")
    : `${process.env.HOME}/Downloads/girls-state-placers-${SEASON}.csv`

/** The table stores two-letter codes; the file spells the state out. */
const STATE_CODE: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO",
  Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID",
  Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR",
  Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
  Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA",
  "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY", "District of Columbia": "DC",
}

function csv(file: string): Array<Record<string, string>> {
  const lines = fs.readFileSync(file, "utf8").trim().split("\n")
  const cols = lines[0].split(",").map((c) => c.trim())
  return lines.slice(1).map((line) => {
    const vals: string[] = []
    let cur = "", q = false
    for (const ch of line) {
      if (ch === '"') q = !q
      else if (ch === "," && !q) { vals.push(cur); cur = "" }
      else cur += ch
    }
    vals.push(cur)
    const row: Record<string, string> = {}
    cols.forEach((c, i) => (row[c] = (vals[i] ?? "").trim()))
    return row
  })
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  const all = csv(FILE)

  const unknownStates = [...new Set(all.map((r) => r.state).filter((s) => !STATE_CODE[s]))]
  if (unknownStates.length) console.log(`state names with no code, skipped: ${unknownStates.join(", ")}\n`)

  /*
   * The association comes from the rows already in the table, not from a list typed here.
   *
   * `association` is NOT NULL, and the boys' import already recorded the governing body for 49
   * states - PIAA, UIL, CIF and the rest. Reading it back is both less work and less wrong than
   * retyping it, and it guarantees the girls' rows agree with the boys' for the same state.
   */
  const assocByState = new Map<string, string>()
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from("state_tournament_placers").select("state, association").range(from, from + 999)
    for (const r of (data ?? []) as Array<{ state: string; association: string }>) {
      if (r.state && r.association && !assocByState.has(r.state)) assocByState.set(r.state, r.association)
    }
    if (!data || data.length < 1000) break
  }
  const noAssoc = [...new Set(all.map((r) => STATE_CODE[r.state]).filter((c) => c && !assocByState.has(c)))]
  if (noAssoc.length) console.log(`no association on file for: ${noAssoc.join(", ")} — skipped\n`)

  /*
   * West Virginia's 2025 rows arrive with the grade stuck to the name - "Allegra Keaton-9" - and
   * only West Virginia's do. Left alone not one of them would ever match: Allegra Keaton wrestled
   * Brianna Palmer at the Ultimate Club Duals and the two records would never meet.
   *
   * The grade is worth keeping rather than deleting. Season 2025 is the 2024-25 year, so a ninth
   * grader there is the class of 2028 - the field that gates almost everything downstream and
   * that we hold for barely 1% of this table.
   */
  const splitGrade = (raw: string, season: number) => {
    const m = String(raw ?? "").trim().match(/^(.*?)[-–](\d{1,2})$/)
    if (!m) return { name: String(raw ?? "").trim(), grade: null as number | null, gradYear: null as number | null }
    const grade = Number(m[2])
    const sane = Number.isFinite(grade) && grade >= 7 && grade <= 12
    return {
      name: m[1]!.trim(),
      grade: sane ? grade : null,
      gradYear: sane ? season + (12 - grade) : null,
    }
  }

  const rows = all
    .filter((r) => r.state !== "North Carolina")
    .filter((r) => assocByState.has(STATE_CODE[r.state]))
    .filter((r) => STATE_CODE[r.state])
    .map((r) => {
      const season = Number(r.year) || SEASON
      const { name, grade, gradYear } = splitGrade(r.athlete_name, season)
      /*
       * West Virginia's girls' championship is unsanctioned - the "WV Girls State Invitational" -
       * and the file does not say so, though the note sending it does. Recording it here keeps a
       * placing there from being read as a state title.
       */
      const invitational = r.state === "West Virginia" && season === 2025
      return {
      season,
      state: STATE_CODE[r.state],
      association: assocByState.get(STATE_CODE[r.state])!,
      gender: "Girls",
      classification: invitational ? `${r.division || "Girls"} (invitational)` : r.division || null,
      weight: r.weight_class || null,
      place: Number(r.placement) || null,
      wrestler_name: name,
      grade: grade == null ? null : String(grade),
      grad_year: gradYear,
      school_raw: r.school || null,
      source_url: r.source_url || null,
      }
    })

  const { count: before } = await sb.from("state_tournament_placers").select("id", { count: "exact", head: true }).eq("gender", "Girls")
  console.log(`file: ${all.length} rows · North Carolina skipped: ${all.length - rows.length} · to insert: ${rows.length}`)
  console.log(`girls already in the table: ${before}`)
  console.log(`states: ${new Set(rows.map((r) => r.state)).size}`)

  const champions = rows.filter((r) => r.place === 1)
  console.log(`\nstate champions among them: ${champions.length}`)
  for (const r of champions.slice(0, 6)) console.log(`   ${r.state} ${String(r.classification).padEnd(10)} ${String(r.weight).padEnd(5)} ${r.wrestler_name} (${r.school_raw})`)

  /*
   * The divisions these placers belong to, which the placers table requires by foreign key.
   *
   * `places_awarded` is how deep the state awards places, and coverage is measured against it -
   * so setting it to however many placements we happened to collect would make every gap read as
   * "that place was not wrestled". It comes from the collector's own coverage note instead
   * ("1st–8th", "1st–4th (partial)"), and where that note says "varies" or gives no number the
   * division is skipped rather than guessed: a wrong depth is a silent, permanent lie about
   * coverage, and a missing division is visible.
   */
  const depthByState = new Map<string, number>()
  const note = fs.readFileSync(`${process.env.HOME}/Downloads/coverage-2026.md`, "utf8")
  for (const line of note.split("\n")) {
    if (!line.startsWith("| ") || line.includes("---")) continue
    const cells = line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
    const code = STATE_CODE[cells[0]]
    if (!code || !cells[2]) continue
    /* "1st–8th" and "1st–8th / 1st–6th" both mean the state goes to 8 somewhere. */
    const deepest = [...cells[2].matchAll(/(\d)(?:st|nd|rd|th)/g)].map((m) => Number(m[1]))
    const max = deepest.length ? Math.max(...deepest) : null
    if (max && max >= 1 && max <= 8) depthByState.set(code, max)
  }
  const noDepth = [...new Set(rows.map((r) => r.state))].filter((c) => !depthByState.has(c))
  if (noDepth.length) console.log(`\nno stated depth, divisions skipped: ${noDepth.join(", ")}`)

  const divisions = new Map<string, Record<string, unknown>>()
  for (const r of rows) {
    const depth = depthByState.get(r.state)
    if (!depth) continue
    const key = `${r.season}|${r.state}|${r.association}|Girls|${r.classification}`
    if (!divisions.has(key)) {
      divisions.set(key, {
        season: r.season,
        state: r.state,
        association: r.association,
        gender: "Girls",
        classification: r.classification,
        places_awarded: depth,
        source_url: r.source_url,
      })
    }
  }
  const placers = rows.filter((r) => depthByState.has(r.state))
  console.log(`\ndivisions to create: ${divisions.size} · placers: ${placers.length}`)

  if (!WRITE) { console.log("\nRe-run with --write to insert."); return }

  const { error: divErr } = await sb
    .from("state_tournament_divisions")
    .upsert([...divisions.values()] as never, { onConflict: "season,state,association,gender,classification" })
  if (divErr) { console.error("divisions FAILED:", divErr.message); return }
  console.log(`divisions written: ${divisions.size}`)

  /* Re-runnable: this season's girls only, never the boys and never another season. */
  await sb.from("state_tournament_placers").delete().eq("gender", "Girls").eq("season", SEASON)
  let inserted = 0
  for (let i = 0; i < placers.length; i += 500) {
    const { error } = await sb.from("state_tournament_placers").insert(placers.slice(i, i + 500) as never)
    if (error) { console.error("FAILED:", error.message); break }
    inserted += placers.slice(i, i + 500).length
  }
  console.log(`\ninserted ${inserted}`)
}
main()
