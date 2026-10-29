#!/usr/bin/env npx tsx
/**
 * The grade division of every NHSCA placement and bout, so a credential can say which it was.
 *
 * NHSCA High School Nationals is six tournaments in one building: Freshman, Sophomore, Junior and
 * Senior brackets, plus unified Girls and Middle School. Four wrestlers win one weight. Without
 * the division a freshman title and a senior title are the same string on a profile, and they are
 * not the same thing to a college coach.
 *
 * The division is not inferred from anyone's class year — it is the tournament's own bracket
 * label, carried in Muse's FloArena extractions and delivered as
 * scripts/data/nhsca-divisions-2023-2026.csv (20,797 rows: year, division, weight, wrestler,
 * state, bouts).
 *
 * Joined on (year, weight, name). Five keys in four years share a name and weight across two
 * divisions; four are namesakes and resolve on the state stamp. The fifth does not resolve and is
 * left alone rather than guessed - see HELD below.
 *
 *   npx tsx scripts/backfill-nhsca-divisions.ts [--write]
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
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const WRITE = process.argv.includes("--write")

/**
 * The one key the source cannot settle: 2026, 152 lb, Isaac Young, North Carolina in BOTH the
 * Freshman bracket (7 bouts) and the Junior bracket (2 bouts). The state stamp that separates the
 * other four collisions is the same here. The Freshman is Canton's Isaac Young; the Junior entry
 * needs a person to look at it, so nothing with this key is filled either way.
 */
const HELD = new Set(["2026|152|isaac young"])

/**
 * Names our rows and the brackets spell differently.
 *
 * FloArena printed no first name for one 2026 heavyweight — the participant is literally "James"
 * (VA), who took 3rd in the Sophomore 285 bracket — and our import stored the single token in
 * both name fields, so it reads "James James" and matches nothing. Keyed on the year and weight
 * as well as the name, because "James" on its own is not an identity.
 */
const NAME_EXCEPTIONS: Record<string, string> = {
  "2026|285|jamesjames": "James",
}

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "")
const weightKey = (s: unknown) => String(s ?? "").replace(/[^0-9]/g, "")
const key = (year: unknown, weight: unknown, name: unknown) => `${year}|${weightKey(weight)}|${String(name ?? "").trim().toLowerCase()}`
const nameKey = (year: unknown, weight: unknown, name: unknown) => `${year}|${weightKey(weight)}|${norm(name)}`

function readCsv(file: string): Array<Record<string, string>> {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "")
  const rows: string[][] = []
  let row: string[] = [], cell = "", q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ",") row.push(cell), (cell = "")
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(cell), rows.push(row), (row = []), (cell = "")
    } else cell += c
  }
  if (cell || row.length) row.push(cell), rows.push(row)
  const [head, ...body] = rows
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head!.map((h, i) => [h.trim(), (r[i] ?? "").trim()])))
}

async function page<T>(run: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    let data: T[] | null = null
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const r = await run(from, from + 999)
        if (r.error) throw new Error(r.error.message)
        data = r.data
        break
      } catch (cause) {
        if (attempt === 4) throw cause
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
      }
    }
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

type Lookup = Map<string, Array<{ division: string; state: string }>>

function buildLookup(): { exact: Lookup; loose: Lookup; byYearName: Lookup } {
  const rows = readCsv(path.join(process.cwd(), "scripts/data/nhsca-divisions-2023-2026.csv"))
  const exact: Lookup = new Map()
  const loose: Lookup = new Map()
  /*
   * A third key without the weight, because 321 of our NHSCA placer rows carry no weight at all -
   * an old import that recorded the placement and not the bracket. Name within a year is a weaker
   * key, so it is only ever used when it lands on exactly one division.
   */
  const byYearName: Lookup = new Map()
  for (const r of rows) {
    const entry = { division: r.division, state: String(r.team_state ?? "").toUpperCase() }
    for (const [map, k] of [
      [exact, key(r.year, r.weight, r.wrestler_name)],
      [loose, nameKey(r.year, r.weight, r.wrestler_name)],
      [byYearName, `${r.year}|${norm(r.wrestler_name)}`],
    ] as const) {
      map.set(k, [...(map.get(k) ?? []), entry])
    }
  }
  return { exact, loose, byYearName }
}

/** The division for one row, or null when the source cannot say which it was. */
function resolve(lookup: { exact: Lookup; loose: Lookup; byYearName: Lookup }, year: unknown, weight: unknown, name: unknown, state: unknown): string | null {
  if (HELD.has(nameKey(year, weight, name))) return null
  const asPrinted = NAME_EXCEPTIONS[nameKey(year, weight, name)]
  if (asPrinted) name = asPrinted
  /* A row with no weight can only be keyed on the name, and then only if it is unambiguous. */
  const hits = weightKey(weight)
    ? lookup.exact.get(key(year, weight, name)) ?? lookup.loose.get(nameKey(year, weight, name)) ?? []
    : lookup.byYearName.get(`${year}|${norm(name)}`) ?? []
  if (!hits.length) return null
  const divisions = new Set(hits.map((h) => h.division))
  if (divisions.size === 1) return hits[0]!.division
  /* Two divisions under one name and weight: the state stamp separates the namesakes. */
  const st = String(state ?? "").toUpperCase()
  if (!st) return null
  const byState = hits.filter((h) => h.state === st)
  const stateDivisions = new Set(byState.map((h) => h.division))
  return stateDivisions.size === 1 ? byState[0]!.division : null
}

async function main() {
  const lookup = buildLookup()
  console.log(`division lookup: ${lookup.exact.size} exact keys, ${lookup.loose.size} normalised\n`)

  /* 1. national_event_placers — the table the credential labels read. */
  const placers = await page<Record<string, unknown>>((a, b) =>
    sb.from("national_event_placers").select("id, event_name, year, weight, wrestler_name, state, division").order("id").range(a, b))
  const nhsca = placers.filter((r) => /nhsca/i.test(String(r.event_name)))
  const fills: Array<{ id: string; division: string }> = []
  const unmatched: string[] = []
  for (const r of nhsca) {
    if (r.division) continue
    const division = resolve(lookup, r.year, r.weight, r.wrestler_name, r.state)
    if (division) fills.push({ id: String(r.id), division })
    else unmatched.push(`${r.year} ${r.weight} ${r.wrestler_name} (${r.state ?? "no state"})`)
  }
  console.log(`national_event_placers: ${nhsca.length} NHSCA rows · ${nhsca.filter((r) => r.division).length} already had a division`)
  console.log(`  to fill: ${fills.length} · the source cannot say: ${unmatched.length}`)
  for (const u of unmatched.slice(0, 10)) console.log(`     ${u}`)
  if (unmatched.length > 10) console.log(`     … ${unmatched.length - 10} more`)

  /* 2. The bouts, where only a handful are ever missing. */
  const bouts = await page<Record<string, unknown>>((a, b) =>
    sb.from("other_tournament_bouts").select("id, year, weight_class, athlete_name, athlete_club, division").like("event_key", "nhsca-nationals-%").is("division", null).order("id").range(a, b))
  const boutFills: Array<{ id: string; division: string }> = []
  const boutMisses: string[] = []
  for (const r of bouts) {
    const division = resolve(lookup, r.year, r.weight_class, r.athlete_name, r.athlete_club)
    if (division) boutFills.push({ id: String(r.id), division })
    else boutMisses.push(`${r.year} ${r.weight_class} ${r.athlete_name} (${r.athlete_club ?? "no state"})`)
  }
  console.log(`\nother_tournament_bouts: ${bouts.length} NHSCA sides carry no division`)
  console.log(`  to fill: ${boutFills.length} · the source cannot say: ${boutMisses.length}`)
  for (const m of boutMisses) console.log(`     ${m}`)

  if (!WRITE) return console.log("\nDry run. --write to apply.")
  for (const [table, rows] of [["national_event_placers", fills], ["other_tournament_bouts", boutFills]] as const) {
    let ok = 0
    for (const f of rows) {
      const { error } = await sb.from(table).update({ division: f.division }).eq("id", f.id)
      if (error) { console.log(`  ${table} ${f.id} FAILED: ${error.message}`); continue }
      ok++
    }
    console.log(`${table}: wrote ${ok} of ${rows.length}`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
