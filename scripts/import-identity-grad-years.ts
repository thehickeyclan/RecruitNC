#!/usr/bin/env npx tsx
/**
 * Fill in graduation years on the identity registry from a collected file.
 *
 * Grad year is the registry's biggest hole and the one that decides whether the rest is usable:
 * a college coach recruits by class, so a wrestler with a state placement, an NHSCA record and no
 * class year cannot be answered about. Girls were the worst of it — 2.6% against 13.9% for boys —
 * because the class years we had came almost entirely from NHSCA grade divisions, where girls
 * barely appear.
 *
 * Rules, all of them learned the hard way:
 *  - A row must resolve to exactly ONE person. Several of the name in that state is a judgement,
 *    not a match, and is skipped rather than guessed.
 *  - A grad year already on file is never overwritten. Where the file disagrees it is reported, so
 *    a real conflict is a decision someone makes, not a silent replacement.
 *  - The file states a grade; the grad year is derived from the season that grade belongs to, which
 *    is why the same "SR" yields 2026 in one file and 2027 in another.
 *
 *   npx tsx scripts/import-identity-grad-years.ts <file.csv> [--gender F] [--write]
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
const FILE = process.argv.slice(2).find((a) => !a.startsWith("--"))
const GENDER = (() => {
  const i = process.argv.indexOf("--gender")
  return i > 0 ? String(process.argv[i + 1] ?? "").toUpperCase() : null
})()
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")
const g1 = (v: unknown) => (/^[fgw]/i.test(String(v ?? "").trim()) ? "F" : String(v ?? "").trim() ? "M" : "?")

/** A hand-rolled reader, because splitting on commas has put a school into a surname before. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ",") { row.push(cell); cell = "" }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = "" }
    else if (c !== "\r") cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const head = rows.shift()!.map((h) => h.trim())
  return rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])))
}

type Identity = { id: string; normalized_name: string | null; state: string | null; gender: string | null; graduation_year: number | null; evidence: Record<string, unknown> | null }

async function main() {
  if (!FILE) { console.error("Give a CSV: name, state (or team), grad_year [, grade, school]"); process.exit(1) }
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  const rows = parseCsv(fs.readFileSync(FILE, "utf8"))
  console.log(`${path.basename(FILE)}: ${rows.length} rows${GENDER ? `, treated as ${GENDER}` : ""}`)

  const identities: Identity[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("athlete_identities")
      .select("id, normalized_name, state, gender, graduation_year, evidence")
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    identities.push(...((data ?? []) as Identity[]))
    if (!data || data.length < 1000) break
  }
  const byKey = new Map<string, Identity[]>()
  for (const i of identities) {
    for (const k of GENDER ? [`${i.normalized_name}|${i.state}|${g1(i.gender)}`] : [`${i.normalized_name}|${i.state}`]) {
      byKey.set(k, [...(byKey.get(k) ?? []), i])
    }
  }

  const updates: Array<{ id: string; grad: number; evidence: Record<string, unknown> }> = []
  const tally = { malformed: 0, unmatched: 0, ambiguous: 0, agree: 0, conflict: 0, fill: 0 }
  const conflicts: string[] = []
  for (const r of rows) {
    const name = nn(r.name)
    const state = String(r.state || r.team || "").toUpperCase()
    const grad = Number(r.grad_year)
    // A leading digit is a seed marker the collection failed to strip, not a first name.
    if (!name || name.split(" ").length < 2 || /^\d/.test(String(r.name).trim()) || !(grad >= 2020 && grad <= 2035)) {
      tally.malformed++
      continue
    }
    const cands = byKey.get(GENDER ? `${name}|${state}|${GENDER}` : `${name}|${state}`) ?? []
    if (!cands.length) { tally.unmatched++; continue }
    if (cands.length > 1) { tally.ambiguous++; continue }
    const held = Number(cands[0].graduation_year)
    if (held === grad) { tally.agree++; continue }
    if (held) {
      tally.conflict++
      if (conflicts.length < 12) conflicts.push(`${r.name} (${state}): on file ${held}, file says ${grad} — left as ${held}`)
      continue
    }
    tally.fill++
    updates.push({
      id: cands[0].id,
      grad,
      evidence: { ...(cands[0].evidence ?? {}), grad_year_source: r.source || path.basename(FILE), grad_year_grade: r.grade || null },
    })
  }

  console.log(`   unusable row (no name, seed marker, no year) : ${tally.malformed}`)
  console.log(`   nobody of that name in that state           : ${tally.unmatched}`)
  console.log(`   several of the name in that state           : ${tally.ambiguous}`)
  console.log(`   already on file and agreeing                : ${tally.agree}`)
  console.log(`   conflicts, left alone                       : ${tally.conflict}`)
  for (const c of conflicts) console.log(`      ${c}`)
  console.log(`   blank grad years this would fill            : ${tally.fill}`)
  const confirmed = tally.agree + tally.conflict
  if (confirmed) console.log(`   agreement where both have a value           : ${((tally.agree / confirmed) * 100).toFixed(1)}%`)

  if (!WRITE) { console.log("\nRe-run with --write."); return }
  let done = 0
  for (const u of updates) {
    const { error } = await sb
      .from("athlete_identities")
      .update({ graduation_year: u.grad, evidence: u.evidence, updated_at: new Date().toISOString() })
      .eq("id", u.id)
      .is("graduation_year", null)
    if (error) { console.error(`  ${u.id} FAILED: ${error.message}`); continue }
    done++
    if (done % 200 === 0) console.log(`   written ${done}/${updates.length}`)
  }
  console.log(`\nfilled ${done} graduation years`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
