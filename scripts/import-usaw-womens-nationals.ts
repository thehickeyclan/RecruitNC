#!/usr/bin/env npx tsx
/**
 * USAW Women's Nationals (Spokane) - U15, U17 and U20 women's freestyle, 2023-2026.
 *
 * One of the largest women's events in the country and absent from the database entirely. Goes
 * into other_tournament_results, which already holds the TOC, the duals and the state freestyle
 * championships, and which the identity matcher already reads.
 *
 * North Carolina rows only. For 2023-25 that is the file's own state column. Rows elsewhere
 * carrying a name matching one of our wrestlers while tagged WA, WI or IL are namesakes, not
 * mis-tagged locals - importing on a name across a national file is how one girl ends up wearing
 * another's national placement.
 *
 * 2026 has no state column at all: 1,216 of its 1,219 rows are blank, which a state filter would
 * drop silently along with the year that matters most. Club stands in for it - Pembroke RTC, Port
 * City Pirates and the rest are North Carolina beyond argument. Two clubs are left out rather than
 * guessed: Victory School of Wrestling, whose nine entries include a wrestler the file tags WI
 * elsewhere, and Baynard Trained. Ask for 2026 again with the state column and this becomes moot.
 *
 * A row that should not be here is not a disaster either way: the identity matcher links on name
 * plus school or year, so an out-of-state wrestler finds no profile and sits unlinked.
 *
 * Weights stay in kilograms as published. The event is freestyle and seeds its brackets in kg;
 * converting to pounds would print a number that appears on no bracket anywhere.
 *
 *   npx tsx scripts/import-usaw-womens-nationals.ts          # dry run
 *   npx tsx scripts/import-usaw-womens-nationals.ts --write
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
const FILE = `${process.env.HOME}/Downloads/usaw-womens-nationals-2023-2026-all.csv`

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

/** Blank means did not place. Number("") is 0, which would read as a finish. */
const num = (v: string) => {
  const s = String(v ?? "").trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
const text = (v: string) => { const s = String(v ?? "").trim(); return s ? s : null }

/** "U17 Women FS" and "U17 Women" are the same bracket in different years. */
function division(raw: string): string {
  const age = (raw.match(/U(15|17|20)/i) ?? [])[0]?.toUpperCase() ?? "U17"
  return `${age} Women's Freestyle`
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  const all = csv(FILE)
  /* Clubs that place a wrestler in North Carolina without a state column to say so. */
  const NC_CLUBS = [
    "pembroke rtc", "port city pirates", "laney high school wrestling", "umo", "mount olive",
    "north carolina", "eastern carolina wrestling academy", "combat athletics wrestling club",
  ]
  /*
   * A wrestler the file itself tags NC in another year.
   *
   * Mia Pardo is NC in 2024 and 2025 and blank in 2026, where she placed 4th - the year the state
   * column is missing. The file corroborating itself is a different thing from matching a name
   * against our database, which across a national field is how namesakes get swapped.
   */
  const ncNames = new Set(
    all
      .filter((r) => ["NC", "NORTH CAROLINA"].includes(String(r.state ?? "").trim().toUpperCase()))
      .map((r) => String(r.athlete_name ?? "").trim().toLowerCase()),
  )
  const isNC = (r: Record<string, string>) => {
    if (["NC", "NORTH CAROLINA"].includes(String(r.state ?? "").trim().toUpperCase())) return true
    if (String(r.state ?? "").trim()) return false // tagged another state: not ours
    if (NC_CLUBS.includes(String(r.club ?? "").trim().toLowerCase())) return true
    return ncNames.has(String(r.athlete_name ?? "").trim().toLowerCase())
  }
  const nc = all.filter(isNC)
  const byState = nc.filter((r) => String(r.state ?? "").trim())
  console.log(`file: ${all.length} rows · North Carolina: ${nc.length} (${byState.length} by state, ${nc.length - byState.length} by club) · with a placement: ${nc.filter((r) => num(r.placement) != null).length}`)

  const { data: existing } = await sb
    .from("other_tournament_results")
    .select("year, athlete_name, weight_class, event_short_name")
    .eq("event_short_name", "USAW Women's Nationals")
  const seen = new Set((existing ?? []).map((r: any) => `${r.year}|${String(r.athlete_name).toLowerCase()}|${r.weight_class}`))

  const rows = nc
    .filter((r) => !seen.has(`${r.year}|${r.athlete_name.toLowerCase()}|${r.weight_class}`))
    .map((r) => ({
      event_key: `usaw-womens-nationals-${r.year}-${division(r.division).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      event_name: `${r.year} USAW Women's Nationals — ${division(r.division)}`,
      event_short_name: "USAW Women's Nationals",
      event_state: "WA",
      year: num(r.year),
      athlete_name: r.athlete_name,
      weight_class: text(r.weight_class),
      placement: num(r.placement),
      wins: num(r.wins),
      losses: num(r.losses),
      record: text(r.record),
      club: text(r.club),
      high_school: text(r.high_school),
      state: "NC",
      gender: "Female",
      source_file: "usaw-womens-nationals-2023-2026-all.csv",
    }))

  console.log(`new rows to insert: ${rows.length}`)
  const placed = rows.filter((r) => r.placement != null)
  console.log(`\nplacements:`)
  for (const r of placed.sort((a, b) => Number(a.year) - Number(b.year)))
    console.log(`  ${r.year} ${String(r.athlete_name).padEnd(22)} ${String(r.weight_class).padEnd(7)} ${r.event_name.split("— ")[1]}  —  ${r.placement}`)

  if (!WRITE) { console.log("\nRe-run with --write to insert, then run the identity linker."); return }

  let inserted = 0
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await sb.from("other_tournament_results").insert(rows.slice(i, i + 200) as never)
    if (error) { console.error("FAILED:", error.message); break }
    inserted += rows.slice(i, i + 200).length
  }
  console.log(`\ninserted ${inserted}`)
}
main()
