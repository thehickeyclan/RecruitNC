#!/usr/bin/env npx tsx
/**
 * Attach a placer's EARLIER state placements to the profile he already has.
 *
 * The minter creates a profile from one season. A junior's sophomore-year podium belongs on the
 * same page — without it his profile shows one season of a three-season career, which is the
 * difference between a placement and a record to a college coach.
 *
 * Creates nothing: a prior season is full of wrestlers who have since graduated, and minting them
 * back is the opposite of what the prune is for. Only rows whose name AND school agree with an
 * already-linked profile in the same state are attached.
 *
 *   npx tsx scripts/link-state-placer-prior-seasons.ts --state SC [--write]
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
const arg = (n: string, d?: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > 0 ? String(process.argv[i + 1]) : d
}
const WRITE = process.argv.includes("--write")
const STATE = normalizeState(arg("state"))
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")

type Row = {
  id: string
  season: number
  place: number | null
  classification: string | null
  weight: string | null
  wrestler_name: string
  school_clean: string | null
  school_raw: string | null
  athlete_id: string | null
}

async function page<T>(table: string, select: string, state?: string): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(select) as never
    if (state) q = (q as { eq: (c: string, v: string) => never }).eq("state", state)
    const { data, error } = await (q as { range: (a: number, b: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }> }).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

async function main() {
  if (!arg("state")) throw new Error("--state is required, e.g. --state SC")
  console.log(WRITE ? `WRITING — ${STATE}\n` : `DRY RUN — ${STATE}, nothing is written\n`)

  const rows = await page<Row>(
    "state_tournament_placers",
    "id, season, place, classification, weight, wrestler_name, school_clean, school_raw, athlete_id",
    STATE,
  )
  const linkedIds = [...new Set(rows.filter((r) => r.athlete_id).map((r) => String(r.athlete_id)))]
  console.log(`${STATE} rows: ${rows.length}, already reaching a profile: ${rows.filter((r) => r.athlete_id).length} across ${linkedIds.length} wrestlers`)

  const athletes = (await page<{ id: string; name: string; highschool: string | null; state: string | null }>("athletes", "id, name, highschool, state"))
    .filter((a) => String(a.state ?? "").toUpperCase() === STATE)
  const byName = new Map<string, Array<{ id: string; name: string; highschool: string | null }>>()
  for (const a of athletes) {
    const k = nn(a.name)
    byName.set(k, [...(byName.get(k) ?? []), a])
  }

  const schoolOf = (r: Row) => String(r.school_clean ?? r.school_raw ?? "").trim()
  const plan: Array<{ id: string; athleteId: string; label: string }> = []
  const skipped: string[] = []
  for (const r of rows.filter((x) => !x.athlete_id)) {
    const hits = (byName.get(nn(r.wrestler_name)) ?? []).filter((a) => schoolsLikelySame(a.highschool, schoolOf(r)))
    if (hits.length !== 1) {
      if (byName.has(nn(r.wrestler_name))) skipped.push(`${r.wrestler_name} (${schoolOf(r)}, ${r.season}) — ${hits.length} school matches`)
      continue
    }
    plan.push({ id: r.id, athleteId: hits[0]!.id, label: `${r.wrestler_name} ${r.season} ${r.classification} ${r.weight} place ${r.place ?? "-"} -> ${hits[0]!.name}` })
  }
  console.log(`   prior-season rows to attach: ${plan.length}`)
  console.log(`   name matches a profile but the school does not: ${skipped.length}`)
  for (const sline of skipped.slice(0, 10)) console.log(`      ${sline}`)
  for (const p of plan.slice(0, 8)) console.log(`      ${p.label}`)

  if (!WRITE) {
    console.log("\nRe-run with --write.")
    return
  }
  let ok = 0
  for (const p of plan) {
    const { error } = await sb.from("state_tournament_placers").update({ athlete_id: p.athleteId }).eq("id", p.id).is("athlete_id", null)
    if (error) console.error(`   failed ${p.label}: ${error.message}`)
    else ok++
  }
  console.log(`\nattached ${ok} of ${plan.length}`)
}
main().catch((e) => {
  console.error("FAILED:", e.message)
  process.exit(1)
})
