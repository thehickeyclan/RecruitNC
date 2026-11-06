#!/usr/bin/env npx tsx
/**
 * Convert a state-package bout ledger into the bout CSV `import-other-tournament-csv.ts` reads.
 *
 * Muse ships every ledger in one shape - Season, State, Association, Gender, Classification,
 * Weight Class, Bout, Round, Winner, Winner School, Loser, Loser School, Result Type, Result... -
 * which `import-state-championship-bouts.ts` takes directly. National Preps cannot go that way:
 * its rows are stamped State "NP", which is not a state, and the event belongs in
 * `other_tournament_results` beside the 2025 rows that are already there. That importer reads
 * Trackwrestling's column names instead, so this translates between the two.
 *
 * Written for National Preps, which recurs every February, but nothing here is specific to it:
 * any national event Muse builds to the state standard can be routed this way.
 *
 *   npx tsx scripts/convert-state-bouts-to-tournament-csv.ts \
 *     --in <ledger.csv> --out <converted.csv> --event "National Preps" --date 2026-02-20
 */
import fs from "fs"

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cur = "", q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
    else if (c === '"') q = true
    else if (c === ",") { row.push(cur); cur = "" }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = "" }
    else if (c !== "\r") cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows
}
const quote = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const arg = (n: string) => process.argv[process.argv.indexOf(`--${n}`) + 1] ?? ""

const IN = arg("in"), OUT = arg("out"), EVENT = arg("event"), DATE = arg("date")
if (!IN || !OUT || !EVENT || !DATE) {
  console.error("--in <ledger.csv> --out <converted.csv> --event <name> --date <YYYY-MM-DD> are all required")
  process.exit(1)
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) {
  // The date decides whether a bout falls inside the 12-month head-to-head window, so it is
  // never inferred from a filename or a season number.
  console.error(`--date must be YYYY-MM-DD, got "${DATE}"`)
  process.exit(1)
}

const grid = parseCsv(fs.readFileSync(IN, "utf8"))
const head = (grid.shift() ?? []).map((h) => h.trim())
const col = (cells: string[], name: string) => {
  const i = head.findIndex((h) => h.toLowerCase() === name.toLowerCase())
  return i >= 0 ? (cells[i] ?? "").trim() : ""
}

const OUT_HEAD = ["Date", "Weight", "Round", "Winning Wrestler", "Winning Team", "Result", "Win Type", "Losing Wrestler", "Losing Team", "City", "State", "Event"]
const lines = [OUT_HEAD.join(",")]
let kept = 0, byes = 0
for (const cells of grid) {
  if (!cells.some((v) => v.trim())) continue
  const winner = col(cells, "Winner"), loser = col(cells, "Loser")
  // A bout with only one side is a bye; the other importer drops them and so do we, counted.
  if (!winner || !loser) { byes++; continue }
  lines.push([
    DATE,
    col(cells, "Weight Class"),
    col(cells, "Round"),
    winner,
    col(cells, "Winner School"),
    col(cells, "Result"),
    col(cells, "Result Type"),
    loser,
    col(cells, "Loser School"),
    "",
    "",
    EVENT,
  ].map(quote).join(","))
  kept++
}
fs.writeFileSync(OUT, lines.join("\n") + "\n")
console.log(`${IN} -> ${OUT}: ${kept} bouts, ${byes} one-sided rows dropped`)
