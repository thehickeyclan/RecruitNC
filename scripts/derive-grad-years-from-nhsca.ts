#!/usr/bin/env npx tsx
/**
 * Class years from NHSCA's grade divisions — stated by the bracket, not inferred.
 *
 * NHSCA runs separate Freshman, Sophomore, Junior and Senior championships, so the division a
 * wrestler entered IS his grade, and grade plus season gives an exact class year. No estimate, no
 * "last seen" arithmetic: a Sophomore at the 2023 tournament is the class of 2025.
 *
 * Only the 2023 and 2024 files carry it. The 2025 and 2026 exports come from a different system
 * whose Event column holds one value for the whole tournament, so the grade is simply not there.
 *
 * A wrestler in both years must derive the same class year — Sophomore in 2023 and Junior in 2024
 * are the same person in the same cohort. A disagreement means two wrestlers sharing a name, and
 * neither gets a year.
 *
 *   npx tsx scripts/derive-grad-years-from-nhsca.ts            # dry run
 *   npx tsx scripts/derive-grad-years-from-nhsca.ts --write
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
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")

/** Seasons remaining after the one being wrestled. A senior finishes that spring. */
const GRADE_OFFSET: Record<string, number> = { senior: 0, junior: 1, sophomore: 2, freshman: 3 }

const FILES: Array<{ file: string; season: number }> = [
  { file: `${process.env.HOME}/Downloads/nhsca-2023-bouts.csv`, season: 2023 },
  { file: `${process.env.HOME}/Downloads/nhsca-2024-bouts.csv`, season: 2024 },
]

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

  /** name|state -> season -> derived class year */
  const derived = new Map<string, Map<number, number>>()
  const display = new Map<string, string>()
  let boutRows = 0
  let noGrade = 0
  for (const { file, season } of FILES) {
    if (!fs.existsSync(file)) { console.log(`missing: ${file}`); continue }
    for (const r of csv(file)) {
      boutRows++
      const grade = Object.keys(GRADE_OFFSET).find((g) => new RegExp(`\\b${g}\\b`, "i").test(String(r.tournament ?? "")))
      /* Girls' and middle-school divisions name no grade; they are skipped, not guessed at. */
      if (!grade) { noGrade++; continue }
      const year = season + GRADE_OFFSET[grade]
      for (const side of ["winner", "loser"] as const) {
        const name = nn(r[`${side}_name`])
        const state = String(r[`${side}_team`] ?? "").trim().toUpperCase()
        if (!name || name.split(" ").length < 2 || !/^[A-Z]{2}$/.test(state)) continue
        const key = `${name}|${state}`
        if (!derived.has(key)) derived.set(key, new Map())
        derived.get(key)!.set(season, year)
        if (!display.has(key)) display.set(key, String(r[`${side}_name`]).trim())
      }
    }
  }
  console.log(`bout rows read: ${boutRows}   rows whose division names no grade: ${noGrade}`)
  console.log(`wrestlers with a stated grade: ${derived.size}`)

  const agreed = new Map<string, number>()
  const conflicts: string[] = []
  for (const [key, years] of derived) {
    const distinct = [...new Set(years.values())]
    if (distinct.length === 1) agreed.set(key, distinct[0])
    else conflicts.push(`${key}: ${[...years.entries()].map(([s, y]) => `${s}->${y}`).join(", ")}`)
  }
  console.log(`   class year agreed across both years: ${agreed.size}`)
  console.log(`   disagreed (two wrestlers of a name): ${conflicts.length}`)
  for (const c of conflicts.slice(0, 5)) console.log(`      ${c}`)

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
  let already = 0
  let ambiguous = 0
  let absent = 0
  let impossible = 0
  for (const [key, year] of agreed) {
    const hits = byKey.get(key) ?? []
    if (!hits.length) { absent++; continue }
    if (hits.length > 1) { ambiguous++; continue }
    const id = hits[0]
    if (id.graduation_year) { already++; continue }
    /*
     * A class year cannot precede a season the wrestler is recorded competing in: a 2024 graduate
     * cannot have qualified in 2026. That is two wrestlers sharing a name, so neither is written.
     */
    if (id.last_seen_season && year < id.last_seen_season) { impossible++; continue }
    updates.push({ id: id.id, year, who: `${id.canonical_name} (${id.state})` })
  }
  console.log(`\n   identities that gain a class year : ${updates.length}`)
  console.log(`   already had one                   : ${already}`)
  console.log(`   no identity of that name and state: ${absent}`)
  console.log(`   ambiguous                         : ${ambiguous}`)
  console.log(`   year precedes a season they wrestled — held: ${impossible}`)
  for (const u of updates.slice(0, 6)) console.log(`      ${u.who} -> class of ${u.year}`)

  if (!WRITE) { console.log("\nRe-run with --write."); return }
  let done = 0
  for (const u of updates) {
    const { error } = await sb.from("athlete_identities").update({ graduation_year: u.year, updated_at: new Date().toISOString() }).eq("id", u.id)
    if (error) { console.log(`   ${u.who} skipped: ${error.message.slice(0, 70)}`); continue }
    done++
    if (done % 2000 === 0) console.log(`   written ${done}/${updates.length}`)
  }
  const { count } = await sb.from("athlete_identities").select("id", { count: "exact", head: true }).not("graduation_year", "is", null)
  console.log(`\nwritten: ${done}   identities with a class year: ${count}`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
