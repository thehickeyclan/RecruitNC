#!/usr/bin/env npx tsx
/**
 * The wrestlers we hold matches for and cannot identify — the target list for a class-year hunt.
 *
 * Without this a collector is sweeping blind: it gathers every ranked wrestler in every state and
 * neither side can say what share of what we actually needed was found. With it, coverage is
 * reportable ("11,200 of your 18,316"), and the ones still missing are nameable.
 *
 * Gender is stated only where the event proves it. The bout store has no gender column — NHSCA and
 * Super 32 run their girls' divisions inside the one event name — so it is read from a women's
 * bracket or a girls' collection file and left unknown otherwise, rather than assumed male.
 *
 *   npx tsx scripts/export-wrestlers-needing-identity.ts --out ranking-snapshots/wrestlers-needing-class-year.csv
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { nameWords } from "@/lib/athlete-name-match"

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
const OUT = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1]
  : "ranking-snapshots/wrestlers-needing-class-year.csv"
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")

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
  const identities = await page<{ normalized_name: string | null; state: string | null }>(
    "athlete_identities",
    "normalized_name, state",
  )
  const known = new Set(identities.filter((i) => i.normalized_name && i.state).map((i) => `${i.normalized_name}|${i.state}`))

  const bouts = await page<{ athlete_name: string; athlete_club: string | null; event_name: string; source_file: string | null; year: number | null; weight_class: string | null }>(
    "other_tournament_bouts",
    "athlete_name, athlete_club, event_name, source_file, year, weight_class",
  )

  type Target = {
    name: string
    display: string
    state: string
    female: boolean
    years: Set<number>
    weights: Set<string>
    events: Set<string>
    bouts: number
  }
  const targets = new Map<string, Target>()
  for (const b of bouts) {
    const state = String(b.athlete_club ?? "").trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(state)) continue
    const name = nn(b.athlete_name)
    if (!name || known.has(`${name}|${state}`)) continue
    const key = `${name}|${state}`
    if (!targets.has(key)) {
      targets.set(key, { name, display: String(b.athlete_name).trim(), state, female: false, years: new Set(), weights: new Set(), events: new Set(), bouts: 0 })
    }
    const t = targets.get(key)!
    t.bouts++
    if (b.year) t.years.add(Number(b.year))
    if (b.weight_class) t.weights.add(String(b.weight_class))
    t.events.add(String(b.event_name).replace(/^\d{4}\s+/, ""))
    /* Stated, never inferred: the event names at NHSCA and Super 32 cover both fields. */
    if (/women|girls/i.test(String(b.event_name)) || /girls|women/i.test(String(b.source_file ?? ""))) t.female = true
  }

  const rows = [...targets.values()].sort((a, b) => a.state.localeCompare(b.state) || b.bouts - a.bouts)
  const esc = (v: unknown) => {
    const t = String(v ?? "")
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const header = "name,state,gender,last_season_seen,seasons_seen,weights,bouts_we_hold,likely_still_in_school,example_event"
  const out = rows.map((t) => {
    const last = Math.max(...t.years)
    return [
      t.display,
      t.state,
      t.female ? "Girls" : "unknown",
      last,
      [...t.years].sort().join(" "),
      [...t.weights].sort((x, y) => Number(x) - Number(y)).join(" "),
      t.bouts,
      last >= 2025 ? "yes" : "no",
      [...t.events][0] ?? "",
    ].map(esc).join(",")
  })
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, [header, ...out].join("\n") + "\n")

  const byState = new Map<string, number>()
  for (const t of rows) byState.set(t.state, (byState.get(t.state) ?? 0) + 1)
  console.log(`wrote ${OUT}`)
  console.log(`   wrestlers needing a class year: ${rows.length}`)
  console.log(`   still in school (last seen 2025/2026): ${rows.filter((t) => Math.max(...t.years) >= 2025).length}`)
  console.log(`   known to be girls: ${rows.filter((t) => t.female).length}`)
  console.log(`   states: ${byState.size}`)
  console.log(`   top: ${[...byState.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([s, n]) => `${s}:${n}`).join("  ")}`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
