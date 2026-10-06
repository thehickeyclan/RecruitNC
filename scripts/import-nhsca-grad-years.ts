#!/usr/bin/env npx tsx
/**
 * Class years from NHSCA's 2025 and 2026 grade divisions.
 *
 * Same evidence as scripts/derive-grad-years-from-nhsca.ts, which took 2023 and 2024 from files we
 * already had: NHSCA runs separate Freshman, Sophomore, Junior and Senior championships, so the
 * division a wrestler entered IS his grade. Our 2025/2026 exports come from a system that names
 * the tournament once for the whole event, so these two years had to be re-pulled.
 *
 * Checked against the years already derived rather than trusted. A wrestler who appears in both
 * sets must land in the same class, and a disagreement is two wrestlers sharing a name — neither
 * gets a year.
 *
 *   npx tsx scripts/import-nhsca-grad-years.ts ~/Downloads/nhsca-2025-2026-grad-years.csv
 *   npx tsx scripts/import-nhsca-grad-years.ts ... --write
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
const WRITE = process.argv.includes("--write")
const FILE = (process.argv.find((a) => a.endsWith(".csv")) ?? "").replace(/^~/, process.env.HOME ?? "~")
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")

function csv(file: string): Array<Record<string, string>> {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "").trim()
  const rows: string[][] = []
  let row: string[] = []
  let cur = ""
  let q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ",") { row.push(cur); cur = "" }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = "" }
    else if (ch !== "\r") cur += ch
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  const cols = (rows.shift() ?? []).map((c) => c.trim())
  return rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(cols.map((c, i) => [c, (r[i] ?? "").trim()])))
}

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
  if (!FILE) { console.error("pass the CSV path"); return }
  const rows = csv(FILE)
  console.log(`rows: ${rows.length}`)

  /* One wrestler, one class year. A name claiming two is two wrestlers. */
  const want = new Map<string, number>()
  const selfConflict: string[] = []
  for (const r of rows) {
    const name = nn(r.name)
    const state = String(r.team ?? "").trim().toUpperCase()
    const year = Number(r.grad_year)
    if (!name || name.split(" ").length < 2 || !/^[A-Z]{2}$/.test(state) || !year) continue
    const k = `${name}|${state}`
    const prior = want.get(k)
    if (prior && prior !== year) { selfConflict.push(`${k}: ${prior} vs ${year}`); want.delete(k); continue }
    if (!prior) want.set(k, year)
  }
  console.log(`usable (name, state) pairs: ${want.size}   dropped for disagreeing with themselves: ${selfConflict.length}`)

  const identities = await page<{ id: string; normalized_name: string | null; state: string | null; graduation_year: number | null; last_seen_season: number | null; canonical_name: string }>(
    "athlete_identities",
    "id, normalized_name, state, graduation_year, last_seen_season, canonical_name",
  )
  const byKey = new Map<string, typeof identities>()
  for (const i of identities) {
    if (!i.normalized_name || !i.state) continue
    const k = `${i.normalized_name}|${i.state}`
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k)!.push(i)
  }

  const updates: Array<{ id: string; year: number; who: string }> = []
  let agreesWithExisting = 0
  const disagrees: string[] = []
  let ambiguous = 0
  let absent = 0
  let impossible = 0
  for (const [key, year] of want) {
    const hits = byKey.get(key) ?? []
    if (!hits.length) { absent++; continue }
    if (hits.length > 1) { ambiguous++; continue }
    const id = hits[0]
    if (id.graduation_year) {
      /* The cross-check: a year we already derived from 2023/2024 must match this one. */
      if (id.graduation_year === year) agreesWithExisting++
      else disagrees.push(`${id.canonical_name} (${id.state}): held ${id.graduation_year}, this file says ${year}`)
      continue
    }
    if (id.last_seen_season && year < id.last_seen_season) { impossible++; continue }
    updates.push({ id: id.id, year, who: `${id.canonical_name} (${id.state})` })
  }
  console.log(`\n   identities that gain a class year      : ${updates.length}`)
  console.log(`   already held one, and it AGREES        : ${agreesWithExisting}`)
  console.log(`   already held one, and it DISAGREES     : ${disagrees.length}`)
  for (const d of disagrees.slice(0, 8)) console.log(`      ${d}`)
  console.log(`   no identity of that name and state     : ${absent}`)
  console.log(`   ambiguous                              : ${ambiguous}`)
  console.log(`   year precedes a season they wrestled   : ${impossible}`)

  if (!WRITE) { console.log("\nRe-run with --write."); return }
  let done = 0
  for (const u of updates) {
    const { error } = await sb.from("athlete_identities").update({ graduation_year: u.year, updated_at: new Date().toISOString() }).eq("id", u.id)
    if (error) { console.log(`   ${u.who} skipped: ${error.message.slice(0, 60)}`); continue }
    done++
    if (done % 1000 === 0) console.log(`   written ${done}/${updates.length}`)
  }
  const { count } = await sb.from("athlete_identities").select("id", { count: "exact", head: true }).not("graduation_year", "is", null)
  console.log(`\nwritten: ${done}   identities with a class year: ${count}`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
