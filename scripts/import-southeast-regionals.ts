#!/usr/bin/env npx tsx
/**
 * Southeast Regional Championships placements - the whole field, 2025 and 2026.
 *
 * A USA Wrestling regional: freestyle and Greco-Roman, 16U and Junior, men and women (Matt, 3 Oct
 * 2026 - "southeast regionals for men and women both freestyle"). `lib/wrestling-style.ts` already
 * reads it as an Olympic-styles event for everybody, so nothing there has to change; the style
 * still comes from the division, so a Greco bracket stays Greco.
 *
 * Placements, not bouts: the file is one row per wrestler per bracket, with a finish and a record.
 * They go to `other_tournament_results`, where they label opponents on profiles and count toward
 * Significant wins, like every other event's placements.
 *
 * Keyed per year, age group and style - `southeast-regional-2026-16u-fs` - the way Fargo's are,
 * because a wrestler can enter freestyle and Greco in the same weekend and the two are different
 * records. Gender is not in the key: the bracket a wrestler was in is already a separate row, and
 * Fargo's keys carry no gender either.
 *
 *   npx tsx scripts/import-southeast-regionals.ts            # dry run
 *   npx tsx scripts/import-southeast-regionals.ts --write
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
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const WRITE = process.argv.includes("--write")
const FILE = "southeast-regionals-2025-2026-all.csv"
/** Held in May, after the high-school season and before Fargo. */
const EVENT_DATE = (year: number) => `${year}-05-16`

function csv(file: string): Array<Record<string, string>> {
  const lines = fs.readFileSync(path.join(`${process.env.HOME}/Downloads`, file), "utf8").trim().split("\n")
  const cols = lines[0].split(",").map((c) => c.trim())
  return lines.slice(1).map((line) => {
    const vals: string[] = []
    let cur = "", quoted = false
    for (const ch of line) {
      if (ch === '"') quoted = !quoted
      else if (ch === "," && !quoted) { vals.push(cur); cur = "" }
      else cur += ch
    }
    vals.push(cur)
    const row: Record<string, string> = {}
    cols.forEach((c, i) => (row[c] = (vals[i] ?? "").trim()))
    return row
  })
}

/** "16U Girls FS" and "Junior GR" -> the key's age and style, and the name's full words. */
function division(raw: string): { age: "16u" | "junior"; style: "fs" | "gr"; label: string } {
  const d = raw.toLowerCase()
  const age = /16u/.test(d) ? "16u" : "junior"
  const style = /\bgr\b|greco/.test(d) ? "gr" : "fs"
  const who = /girls|women/.test(d) ? "Girls " : /boys|men/.test(d) ? "Boys " : ""
  return { age, style, label: `${age === "16u" ? "16U" : "Junior"} ${who}${style === "gr" ? "Greco-Roman" : "Freestyle"}` }
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  if (!fs.existsSync(path.join(`${process.env.HOME}/Downloads`, FILE))) { console.error(`${FILE} not in ~/Downloads`); return }

  const athletes: Array<{ id: string; name: string }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("athletes").select("id,name").order("id").range(from, from + 999)
    if (error) throw new Error(error.message)
    athletes.push(...((data ?? []) as never[]))
    if (!data || data.length < 1000) break
  }

  const rows: Array<Record<string, unknown>> = []
  const keys = new Set<string>()
  let linked = 0, ambiguous = 0
  for (const r of csv(FILE)) {
    const year = Number(r.year)
    const who = r.athlete_name?.trim()
    if (!who || !Number.isFinite(year)) continue
    const { age, style, label } = division(r.division ?? "")
    const key = `southeast-regional-${year}-${age}-${style}`
    keys.add(key)
    /*
     * Only a North Carolina wrestler is linked, and only on an unambiguous name. This is a
     * regional - Georgia, South Carolina, Tennessee and Virginia are all in it - so a name
     * matching one of our profiles is often somebody else's wrestler.
     */
    const fromNc = (r.state ?? "").trim().toUpperCase() === "NC"
    const hits = fromNc ? athletes.filter((a) => namesLikelySamePerson(a.name, who)) : []
    if (hits.length > 1) ambiguous += 1
    const athleteId = hits.length === 1 ? hits[0].id : null
    if (athleteId) linked += 1
    const place = Number(r.placement)
    rows.push({
      event_key: key,
      event_name: `${year} Southeast Regional Championships - ${label}`,
      event_short_name: "Southeast Regional Championships",
      event_state: null,
      event_date: EVENT_DATE(year),
      year,
      athlete_name: who,
      athlete_id: athleteId,
      club: r.club?.trim() || null,
      high_school: r.high_school?.trim() || null,
      state: r.state?.trim().toUpperCase() || null,
      weight_class: r.weight_class?.trim() || null,
      wins: Number(r.wins) || 0,
      losses: Number(r.losses) || 0,
      record: r.record?.trim() || null,
      placement: Number.isFinite(place) && place > 0 ? place : null,
      qualified: false,
      source_file: FILE,
      verification_status: "verified",
    })
  }

  const states = new Set(rows.map((r) => r.state).filter(Boolean))
  console.log(`${rows.length} placements across ${keys.size} brackets, ${states.size} states`)
  console.log(`  linked to a profile: ${linked}${ambiguous ? ` · ${ambiguous} ambiguous names left unlinked` : ""}`)
  console.log(`  keys: ${[...keys].sort().join(", ")}`)
  if (!WRITE) { console.log("\nRe-run with --write."); return }

  // Re-runnable: this file's own rows only, never another import's.
  const { error: clearError } = await sb.from("other_tournament_results").delete().eq("source_file", FILE)
  if (clearError) throw new Error(`Clearing: ${clearError.message}`)
  let inserted = 0
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200)
    const { error } = await sb.from("other_tournament_results").insert(chunk as never)
    if (error) { console.error("FAILED:", error.message); break }
    inserted += chunk.length
  }
  console.log(`\ninserted ${inserted}`)
}
main()
