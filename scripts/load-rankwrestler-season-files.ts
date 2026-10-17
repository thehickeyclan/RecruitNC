#!/usr/bin/env npx tsx
/**
 * Load RankWrestler season payloads into `matches`, the way the Match Manager admin tool does.
 *
 * These files are already the parser's output shape — {wrestler_info, season_summary, matches} —
 * so nothing is re-parsed here. This is the same write /api/admin/submit-athlete-matches performs:
 * one row per athlete and season, holding the matches as JSON, keyed `{name}_{season}`, replacing
 * any existing row for that pair.
 *
 * It refuses three things rather than guessing:
 *   - a file whose wrestler has no profile, or more than one plausible profile
 *   - a file whose school disagrees with the profile's, which is how a namesake gets someone
 *     else's season
 *   - a season that looks truncated (a single match), which is a failed pull, not a record
 *
 * `--state` restricts the profiles a file may match to one state. It matters now that South
 * Carolina is live: matching is name-plus-school across every profile, and the two Carolinas
 * share school names — "High Point" is an SC school and a NC city — so without it an SC season
 * can land on an NC namesake's profile. Pass the state the files belong to.
 *
 *   npx tsx scripts/load-rankwrestler-season-files.ts <dir> [--state SC] [--write] [--allow-school-mismatch NAME]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { nameWords, schoolsLikelySame } from "@/lib/athlete-name-match"
import { normalizeState } from "@/lib/athlete-state"

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
const ALLOW = process.argv.reduce<string[]>((acc, a, i) => (a === "--allow-school-mismatch" ? [...acc, String(process.argv[i + 1] ?? "")] : acc), [])
const STATE = process.argv.includes("--state")
  ? normalizeState(String(process.argv[process.argv.indexOf("--state") + 1] ?? ""))
  : null
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")
/** A season with one match is a pull that stopped, not a wrestler who wrestled once. */
const MIN_MATCHES = 2
const num = (v: unknown) => Number.parseFloat(String(v ?? "")) || 0

async function main() {
  if (!DIR) { console.error("give the directory holding the season JSON files"); process.exit(1) }
  console.log(`${WRITE ? "WRITING" : "DRY RUN — nothing is written"}${STATE ? ` — matching only ${STATE} profiles` : " — matching profiles in EVERY state"}\n`)
  const athletes: Array<{ id: string; name: string; highschool: string | null; state?: string | null }> = []
  for (let from = 0; ; from += 1000) {
    let q = sb.from("athletes").select("id, name, highschool, state")
    if (STATE) q = q.eq("state", STATE)
    const { data, error } = await q.range(from, from + 999)
    if (error) throw new Error(error.message)
    athletes.push(...((data ?? []) as never))
    if (!data || data.length < 1000) break
  }

  for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
    const d = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"))
    const wi = d.wrestler_info ?? {}
    const ss = d.season_summary ?? {}
    const matches = Array.isArray(d.matches) ? d.matches : []
    const full = `${wi.first_name ?? ""} ${wi.last_name ?? ""}`.trim()
    const say = (verdict: string) => console.log(`${file}\n   ${full} | ${wi.season} | ${matches.length} matches ${ss.wins}-${ss.losses}\n   ${verdict}`)

    if (matches.length < MIN_MATCHES) { say(`SKIPPED — only ${matches.length} match, a truncated pull rather than a season`); continue }
    const sameName = athletes.filter((a) => nn(a.name) === nn(full))
    if (!sameName.length) { say("SKIPPED — no profile of that name"); continue }
    const schoolOk = sameName.filter((a) => schoolsLikelySame(a.highschool, wi.high_school))
    let pick = schoolOk.length === 1 ? schoolOk[0] : null
    if (!pick && sameName.length === 1 && ALLOW.some((n) => nn(n) === nn(full))) pick = sameName[0]
    if (!pick) {
      say(
        sameName.length > 1
          ? `SKIPPED — ${sameName.length} profiles of that name, none school-confirmed`
          : `SKIPPED — the file says "${wi.high_school}" and the profile says "${sameName[0]!.highschool}"; pass --allow-school-mismatch "${full}" if she transferred`,
      )
      continue
    }

    const { data: held } = await sb.from("matches").select("id, total_matches").eq("athlete_id", pick.id).eq("season", wi.season)
    const existing = (held ?? [])[0] as { id: string; total_matches: number } | undefined
    if (existing && Number(existing.total_matches) === matches.length) { say(`already loaded with ${matches.length} matches — unchanged, left alone`); continue }

    const row = {
      athlete_id: pick.id,
      wrestler_id: `${pick.name.toLowerCase().replace(/\s+/g, "_")}_${wi.season}`,
      first_name: wi.first_name,
      last_name: wi.last_name,
      season: wi.season,
      grade: wi.grade,
      high_school: wi.high_school,
      total_matches: ss.total_matches ?? matches.length,
      wins: ss.wins,
      losses: ss.losses,
      pins: ss.pins,
      tech_falls: ss.tech_falls,
      decisions: ss.decisions,
      major_decisions: ss.major_decisions,
      forfeits_won: ss.forfeits_won,
      pin_percentage: num(ss.pin_percentage),
      tf_percentage: num(ss.tf_percentage),
      finishing_percentage: num(ss.finishing_percentage),
      matches,
    }
    say(`${existing ? `REPLACES an existing row (${existing.total_matches} -> ${matches.length} matches)` : "loads"} onto ${pick.name} (${pick.highschool})`)
    if (!WRITE) continue
    const { error: delErr } = await sb.from("matches").delete().eq("athlete_id", pick.id).eq("season", wi.season)
    if (delErr) { console.log(`      clearing failed: ${delErr.message}`); continue }
    const { error } = await sb.from("matches").insert(row)
    console.log(error ? `      INSERT FAILED: ${error.message}` : `      written`)
  }
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
