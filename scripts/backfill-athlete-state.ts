#!/usr/bin/env npx tsx
/**
 * Give every profile a state, so a filter can name one.
 *
 * Rankings, the public board and the coach roster all gate on `is_nc_athlete` — a boolean. The
 * first South Carolina profile is therefore either true, polluting North Carolina's rankings and
 * every coach's roster, or false and invisible everywhere. There is no third answer while the
 * column is a yes/no, and `athletes.state` cannot stand in for it yet: it is null on 860 of 1,334
 * rows, including every profile minted for the state tournament.
 *
 * So the state comes first and the query change second. `is_nc_athlete` is the source: true means
 * North Carolina, and a row already carrying a state keeps it. A false row with no state stays
 * null — those are the wrestlers who left (Jack Harty to Greens Farms Academy in Connecticut) and
 * guessing where they went is not this script's business.
 *
 * The dry run prints the equivalence that matters: after this, `state = 'NC'` must select exactly
 * the rows `is_nc_athlete = true` selects today, or the query change silently moves the boards.
 *
 *   npx tsx scripts/backfill-athlete-state.ts [--write]
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
const WRITE = process.argv.includes("--write")
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function page<T>(table: string, select: string): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  type Row = { id: string; name: string; state: string | null; is_nc_athlete: boolean | null }
  const rows = await page<Row>("athletes", "id, name, state, is_nc_athlete")
  const norm = (s: string | null) => String(s ?? "").trim().toUpperCase() || null
  console.log(`profiles: ${rows.length}`)
  console.log(`   is_nc_athlete true : ${rows.filter((r) => r.is_nc_athlete).length}`)
  console.log(`   is_nc_athlete false: ${rows.filter((r) => r.is_nc_athlete === false).length}`)
  console.log(`   is_nc_athlete null : ${rows.filter((r) => r.is_nc_athlete == null).length}`)
  const byState = new Map<string, number>()
  for (const r of rows) byState.set(String(norm(r.state) ?? "(null)"), (byState.get(String(norm(r.state) ?? "(null)")) ?? 0) + 1)
  console.log(`   state today: ${[...byState].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join("  ")}`)

  /* A row already carrying a state keeps it; a contradiction is printed and left alone. */
  const toSet = rows.filter((r) => r.is_nc_athlete && norm(r.state) !== "NC" && !norm(r.state))
  const conflict = rows.filter((r) => r.is_nc_athlete && norm(r.state) && norm(r.state) !== "NC")
  const leftNull = rows.filter((r) => !r.is_nc_athlete && !norm(r.state))
  console.log(`\n   to set state = NC                       : ${toSet.length}`)
  console.log(`   already NC                              : ${rows.filter((r) => r.is_nc_athlete && norm(r.state) === "NC").length}`)
  console.log(`   NC flag but another state on the row     : ${conflict.length}`)
  for (const c of conflict) console.log(`      ${c.name}: state ${c.state}`)
  console.log(`   not an NC athlete, state stays null      : ${leftNull.length}`)
  for (const c of leftNull.slice(0, 10)) console.log(`      ${c.name}`)

  const after = rows.filter((r) => r.is_nc_athlete || norm(r.state) === "NC").length
  const today = rows.filter((r) => r.is_nc_athlete).length
  console.log(`\n   EQUIVALENCE: state='NC' would select ${after}, is_nc_athlete=true selects ${today}${after === today ? "  ✓ identical" : "  ✗ DIFFERENT — do not change the queries"}`)

  if (!WRITE) { console.log("\nRe-run with --write."); return }
  let ok = 0
  for (const r of toSet) {
    const { error } = await sb.from("athletes").update({ state: "NC" }).eq("id", r.id)
    if (error) { console.error(`   failed ${r.name}: ${error.message}`); continue }
    ok++
  }
  console.log(`\nwrote state = NC on ${ok} of ${toSet.length}`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
