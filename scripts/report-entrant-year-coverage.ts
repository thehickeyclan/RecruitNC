#!/usr/bin/env npx tsx
/**
 * Entrant-year coverage, state by state: the number Matt's standard is actually measured by.
 *
 * "We should have all qualifiers for all states, that's the standard, with all grad years. Kids
 * should not be in the platform w/o grad years." (Matt, 5 November 2026.) Every state package
 * reports its own coverage, but those are the BUILD's numbers, measured on the build's files. This
 * measures what the platform actually holds after the import, which is the only figure that can
 * be defended to him, and it covers every state at once rather than the one just imported.
 *
 * Counted with head requests rather than by paging the table: 50 states of placer rows is well
 * over a hundred thousand rows, and the answer is three counts per state.
 *
 *   npx tsx scripts/report-entrant-year-coverage.ts
 *   npx tsx scripts/report-entrant-year-coverage.ts --state AK
 *   npx tsx scripts/report-entrant-year-coverage.ts --csv ranking-snapshots/entrant-year-coverage.csv
 */
import fs from "node:fs"
import path from "node:path"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { RECRUITING_BRAND } from "../lib/recruiting/brand"

for (const file of [".env.local", ".env"]) {
  const full = path.join(process.cwd(), file)
  if (!fs.existsSync(full)) continue
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const eq = line.indexOf("=")
    if (eq < 1 || line.trimStart().startsWith("#")) continue
    const key = line.slice(0, eq).trim()
    if (process.env[key]) continue
    process.env[key] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
  }
}

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > 0 ? String(process.argv[i + 1] ?? "") : ""
}
const ONLY = arg("state").toUpperCase()
const CSV = arg("csv")

async function count(sb: SupabaseClient, build: (q: never) => never): Promise<number> {
  const base = sb.from("state_tournament_placers").select("id", { count: "exact", head: true })
  const { count: n, error } = await (build(base as never) as unknown as Promise<{ count: number | null; error: { message: string } | null }>)
  if (error) throw new Error(error.message)
  return n ?? 0
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const states = RECRUITING_BRAND.states.filter((s) => !ONLY || s.code === ONLY)
  const rows: Array<{ code: string; name: string; entrants: number; years: number; linked: number; live: boolean }> = []

  for (const s of states) {
    const where = (q: never) => (q as unknown as { eq: (c: string, v: string) => never }).eq("state", s.code)
    const entrants = await count(sb, where)
    if (entrants === 0) {
      rows.push({ code: s.code, name: s.name, entrants: 0, years: 0, linked: 0, live: s.live })
      continue
    }
    const years = await count(sb, (q) => (where(q) as unknown as { not: (c: string, o: string, v: null) => never }).not("grad_year", "is", null))
    const linked = await count(sb, (q) => (where(q) as unknown as { not: (c: string, o: string, v: null) => never }).not("athlete_id", "is", null))
    rows.push({ code: s.code, name: s.name, entrants, years, linked, live: s.live })
  }

  rows.sort((a, b) => b.entrants - a.entrants)
  const pct = (n: number, d: number) => (d === 0 ? "—" : `${((n / d) * 100).toFixed(1)}%`)
  console.log("state  entrants   with year   coverage   linked to a profile")
  for (const r of rows) {
    console.log(
      `${r.code.padEnd(5)} ${String(r.entrants).padStart(8)} ${String(r.years).padStart(11)} ${pct(r.years, r.entrants).padStart(10)} ${String(r.linked).padStart(10)} ${pct(r.linked, r.entrants).padStart(8)}${r.live ? "   LIVE" : ""}`,
    )
  }
  const held = rows.filter((r) => r.entrants > 0)
  const te = held.reduce((a, r) => a + r.entrants, 0)
  const ty = held.reduce((a, r) => a + r.years, 0)
  const tl = held.reduce((a, r) => a + r.linked, 0)
  console.log(`\nstates with entrants: ${held.length} of ${rows.length}`)
  console.log(`entrants ${te} · with a class year ${ty} (${pct(ty, te)}) · linked to a profile ${tl} (${pct(tl, te)})`)
  const short = held.filter((r) => r.years / r.entrants < 0.95).map((r) => `${r.code} ${pct(r.years, r.entrants)}`)
  console.log(short.length ? `below 95%: ${short.join(", ")}` : "every state with entrants is at 95% or better")
  /*
   * North Carolina reads zero here and that is correct, not a gap: its championship results live
   * in their own store behind getMergedNchsaaForAthlete, and state_tournament_placers holds the
   * other 49 (see lib/state-tournament-results.ts). Said out loud because a zero against the home
   * state in a coverage report is exactly the line someone acts on at speed.
   */
  const empty = rows.filter((r) => r.entrants === 0 && r.code !== "NC").map((r) => r.code)
  if (empty.length) console.log(`no entrant rows at all: ${empty.join(", ")}`)
  console.log("NC is not counted here: its placers live in the NCHSAA store, not this table.")

  if (CSV) {
    fs.mkdirSync(path.dirname(CSV), { recursive: true })
    fs.writeFileSync(
      CSV,
      ["state,name,entrants,with_grad_year,coverage,linked_to_profile,live"]
        .concat(rows.map((r) => `${r.code},"${r.name}",${r.entrants},${r.years},${pct(r.years, r.entrants)},${r.linked},${r.live}`))
        .join("\n") + "\n",
    )
    console.log(`\nwrote ${CSV}`)
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
