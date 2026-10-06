#!/usr/bin/env npx tsx
/**
 * Check a state-qualifier collection before any of it is written.
 *
 * The checks are the ones that have actually cost us data: a truncated bracket looks exactly like
 * a small one, a "0-0" record is a claim about a real wrestler rather than an absent value, and a
 * forfeit marker in a name field mints an identity called "FF".
 *
 *   npx tsx scripts/validate-state-qualifiers.ts ~/Downloads/state-qualifiers-2024-2026
 */
import fs from "fs"
import path from "path"

const DIR = (process.argv[2] ?? "").replace(/^~/, process.env.HOME ?? "~")
const EXPECTED = [
  "first_name", "last_name", "school", "grad_year", "gender", "state", "season", "division",
  "weight", "qualified", "place", "state_wins", "state_losses", "source", "source_url",
  "source_wrestler_id", "association",
]

function csv(file: string): { cols: string[]; rows: Array<Record<string, string>> } {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "").trim()
  if (!text) return { cols: [], rows: [] }
  const out: string[][] = []
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
    else if (ch === "\n") { row.push(cur); out.push(row); row = []; cur = "" }
    else if (ch !== "\r") cur += ch
  }
  if (cur || row.length) { row.push(cur); out.push(row) }
  const cols = (out.shift() ?? []).map((c) => c.trim())
  return { cols, rows: out.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(cols.map((c, i) => [c, (r[i] ?? "").trim()]))) }
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".csv")).sort()
let total = 0
const badCols: string[] = []
const notYes: string[] = []
const zeroZero: string[] = []
const dirtyNames: string[] = []
const noAssociation: string[] = []
const badSeason: string[] = []
const empties: string[] = []
const thinBrackets: Array<{ file: string; bracket: string; n: number }> = []
const byState = new Map<string, number>()
const seasons = new Map<string, number>()
let withId = 0
let blankRecord = 0

for (const f of files) {
  const { cols, rows } = csv(path.join(DIR, f))
  if (!rows.length) { empties.push(f); continue }
  total += rows.length
  const missing = EXPECTED.filter((c) => !cols.includes(c))
  if (missing.length) badCols.push(`${f}: missing ${missing.join(",")}`)
  for (const r of rows) {
    if (r.qualified !== "yes") { if (notYes.length < 5) notYes.push(`${f}: qualified="${r.qualified}"`); }
    /* 0-0 is impossible for a bracket entrant: everyone wrestles at least once. */
    if (r.state_wins === "0" && r.state_losses === "0") { if (zeroZero.length < 5) zeroZero.push(`${f}: ${r.first_name} ${r.last_name}`); }
    if (r.state_wins === "" || r.state_losses === "") blankRecord++
    if (/\b(FF|DQ|BYE|NC)\b/.test(`${r.first_name} ${r.last_name}`)) { if (dirtyNames.length < 5) dirtyNames.push(`${f}: "${r.first_name} ${r.last_name}"`); }
    if (!String(r.association ?? "").trim()) { if (noAssociation.length < 5) noAssociation.push(f); }
    if (!["2024", "2025", "2026"].includes(r.season)) { if (badSeason.length < 5) badSeason.push(`${f}: season="${r.season}"`); }
    if (String(r.source_wrestler_id ?? "").trim()) withId++
    byState.set(r.state, (byState.get(r.state) ?? 0) + 1)
    seasons.set(r.season, (seasons.get(r.season) ?? 0) + 1)
  }
  /* A truncated bracket is indistinguishable from a small one, so look at every bracket. */
  const brackets = new Map<string, number>()
  for (const r of rows) brackets.set(`${r.division}|${r.weight}`, (brackets.get(`${r.division}|${r.weight}`) ?? 0) + 1)
  for (const [b, n] of brackets) if (n < 4) thinBrackets.push({ file: f, bracket: b, n })
}

console.log(`files ${files.length}   rows ${total}   empty files ${empties.length}`)
console.log(`states ${byState.size}   seasons ${[...seasons.entries()].sort().map(([k, v]) => `${k}:${v}`).join("  ")}`)
console.log(`with a stable wrestler id: ${withId} (${Math.round((100 * withId) / total)}%)`)
console.log(`blank (unknown) W-L rows : ${blankRecord}`)
const report = (label: string, list: string[]) => console.log(`${label}: ${list.length}${list.length ? "\n   " + list.slice(0, 5).join("\n   ") : ""}`)
console.log()
report("files missing a column", badCols)
report(`rows where qualified is not "yes"`, notYes)
report("rows recording 0-0 (a contradiction for an entrant)", zeroZero)
report("names holding a forfeit marker", dirtyNames)
report("rows with no association", noAssociation)
report("rows with an unexpected season label", badSeason)
console.log(`\nbrackets with fewer than 4 entrants (possible truncation): ${thinBrackets.length}`)
for (const t of thinBrackets.slice(0, 10)) console.log(`   ${t.file} ${t.bracket} = ${t.n}`)
console.log(`\nempty files: ${empties.join(", ")}`)
