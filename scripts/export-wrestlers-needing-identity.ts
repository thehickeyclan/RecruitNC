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
/*
 * --focus keeps only the wrestlers whose identity does work today: the ones our athletes actually
 * wrestled, and the ones who placed top eight at a national event. 1,890 against 17,745, and the
 * 16,000 dropped are wrestlers we hold a bout or two for who never met us and never placed.
 * Identifying them costs the same as identifying the useful ones and buys nothing yet.
 */
const FOCUS = process.argv.includes("--focus")
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
    "athlete_name, athlete_club, event_name, source_file, year, weight_class, round, athlete_id, opponent_name, opponent_club, win",
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
    facedUs: boolean
    weBeatThem: boolean
    nationalPlacer: boolean
  }
  /* "1st Place Match" and the rest: reaching one means a top-eight finish. */
  const PLACEMENT_ROUND = /1st Place|3rd Place|5th Place|7th Place/i
  const targets = new Map<string, Target>()
  for (const b of bouts) {
    const state = String(b.athlete_club ?? "").trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(state)) continue
    const name = nn(b.athlete_name)
    if (!name || known.has(`${name}|${state}`)) continue
    const key = `${name}|${state}`
    if (!targets.has(key)) {
      targets.set(key, { name, display: String(b.athlete_name).trim(), state, female: false, years: new Set(), weights: new Set(), events: new Set(), bouts: 0, facedUs: false, weBeatThem: false, nationalPlacer: false })
    }
    const t = targets.get(key)!
    t.bouts++
    if (b.year) t.years.add(Number(b.year))
    if (b.weight_class) t.weights.add(String(b.weight_class))
    t.events.add(String(b.event_name).replace(/^\d{4}\s+/, ""))
    /* Stated, never inferred: the event names at NHSCA and Super 32 cover both fields. */
    if (/women|girls/i.test(String(b.event_name)) || /girls|women/i.test(String(b.source_file ?? ""))) t.female = true
    if (PLACEMENT_ROUND.test(String((b as { round?: string }).round ?? ""))) t.nationalPlacer = true
  }

  /*
   * Seen from our own athletes' rows: these wrestlers are their opponents, which is the whole
   * reason an out-of-state identity is worth anything to us.
   */
  for (const b of bouts as Array<Record<string, unknown>>) {
    if (!b.athlete_id) continue
    const oc = String(b.opponent_club ?? "").trim().toUpperCase()
    const on = nn(b.opponent_name)
    if (!/^[A-Z]{2}$/.test(oc) || !on) continue
    const t = targets.get(`${on}|${oc}`)
    if (!t) continue
    t.facedUs = true
    if (b.win) t.weBeatThem = true
  }

  let rows = [...targets.values()].sort((a, b) => a.state.localeCompare(b.state) || b.bouts - a.bouts)
  if (FOCUS) {
    const before = rows.length
    rows = rows.filter((t) => Math.max(...t.years) >= 2025 && (t.facedUs || t.nationalPlacer))
    console.log(`--focus: ${before} -> ${rows.length} (still in school, and either faced one of our athletes or placed top eight nationally)`)
  }
  const esc = (v: unknown) => {
    const t = String(v ?? "")
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const header = "name,state,gender,last_season_seen,seasons_seen,weights,bouts_we_hold,likely_still_in_school,faced_our_athlete,we_beat_them,national_placer,example_event"
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
      t.facedUs ? "yes" : "no",
      t.weBeatThem ? "yes" : "no",
      t.nationalPlacer ? "yes" : "no",
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
