#!/usr/bin/env npx tsx
/**
 * Girls' bouts for two 2024 events we held nothing for: Fargo (16U and Junior women's freestyle)
 * and Super 32. Muse's files of 13 October 2026, one row per bout:
 *   event, year, division, weight, [bracket_pool,] round, match_number, wrestler, wrestler_team,
 *   opponent, opponent_team, winner, win_type, score, result, time, notes
 *
 * A bout becomes one row for each North Carolina girl in it (team printed "NC"), as
 * scripts/import-girls-bouts.ts does. That script is not reused: it clears and reloads every file
 * it knows about from ~/Downloads, and most of those files are no longer there.
 *
 * Nobody is created. A girl is linked when her name matches exactly one female profile; the rest
 * are stored unlinked, as evidence, and listed. Re-runnable: rows are replaced by source file.
 *
 *   npx tsx scripts/import-girls-bouts-2024.ts <dir>           # dry run
 *   npx tsx scripts/import-girls-bouts-2024.ts <dir> --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})
const WRITE = process.argv.includes("--write")
const DIR = process.argv.slice(2).find((a) => !a.startsWith("--"))
if (!DIR) {
  console.error("usage: import-girls-bouts-2024.ts <dir> [--write]")
  process.exit(1)
}

type Row = Record<string, string>
const SOURCES: Array<{ file: string; date: string; key: (r: Row) => string; name: (r: Row) => string; round: (r: Row) => string }> = [
  {
    file: "fargo-girls-2024-nc-bouts.csv",
    date: "2024-07-15",
    // The keys and names the 2025 and 2026 girls' Fargo bouts were written with.
    key: (r) => `fargo-2024-${/16u/i.test(r.division!) ? "16u" : "junior"}-fs`,
    name: (r) => `2024 Fargo ${/16u/i.test(r.division!) ? "16U" : "Junior"} Women's Freestyle`,
    round: (r) => r.round!,
  },
  {
    file: "super32-girls-2024-bouts.csv",
    date: "2024-10-19",
    key: () => "super32-2024",
    name: () => "2024 Super 32",
    // "7th Place / Finals [1st]" is the seventh-place match, not a final.
    round: (r) => {
      const pool = r.bracket_pool ?? ""
      const round = r.round!
      if (/place/i.test(pool)) return `${pool} Match`
      const label = round.replace(/^Finals \[1st\]$/, "1st Place Match").replace(/^(3rd|5th) Place \[\w+\]$/, "$1 Place Match")
      return pool && pool !== "Default Pool" ? `${pool} ${label}` : label
    },
  },
]

/** United World Wrestling's codes, as the rest of the table writes a result. */
const WIN_TYPE: Record<string, string> = { VFA: "F", VSU: "TF", VSU1: "TF", VPO: "DEC", VPO1: "DEC", VIN: "INJ", VFO: "FF", VCA: "DQ", DSQ: "DQ" }

function parse(file: string): Row[] {
  const lines = fs.readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim())
  const split = (line: string) => {
    const out: string[] = []
    let cur = ""
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]!
      if (c === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++ } else quoted = !quoted
      } else if (c === "," && !quoted) { out.push(cur.trim()); cur = "" } else cur += c
    }
    out.push(cur.trim())
    return out
  }
  const cols = split(lines[0]!)
  return lines.slice(1).map((line) => Object.fromEntries(split(line).map((v, i) => [cols[i]!, v])))
}

const isNC = (team: unknown) => String(team ?? "").trim().toUpperCase() === "NC"

async function main() {
  const girls: Array<{ id: string; name: string; graduationyear: number | null; highschool: string | null }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("athletes").select("id, name, graduationyear, highschool").eq("gender", "Female").order("id").range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    girls.push(...(data as never[]))
    if (data.length < 1000) break
  }

  for (const src of SOURCES) {
    const file = path.join(DIR!, src.file)
    if (!fs.existsSync(file)) { console.log(`${src.file}: not in this folder, skipped`); continue }
    const rows: Array<Record<string, unknown>> = []
    const seen = new Set<string>()
    const who = new Map<string, { id: string | null; label: string; w: number; l: number }>()
    let order = 0
    for (const r of parse(file)) {
      order += 1
      for (const side of ["wrestler", "opponent"] as const) {
        if (!isNC(r[`${side}_team`])) continue
        const other = side === "wrestler" ? "opponent" : "wrestler"
        const name = r[side]!
        if (!name || /^bye$/i.test(name)) continue
        const hits = girls.filter((g) => namesLikelySamePerson(g.name, name))
        const girl = hits.length === 1 ? hits[0]! : null
        const won = r.winner === name
        const round = src.round(r)
        const identity = `${src.key(r)}|${r.weight}|${round}|${name}|${r[other]}`
        if (seen.has(identity)) continue
        seen.add(identity)
        const tally = who.get(name) ?? {
          id: girl?.id ?? null,
          label: girl ? `${girl.name} ${girl.graduationyear ?? "?"} ${girl.highschool ?? ""}` : hits.length > 1 ? `AMBIGUOUS (${hits.length} profiles)` : "no profile",
          w: 0,
          l: 0,
        }
        if (won) tally.w++
        else tally.l++
        who.set(name, tally)
        rows.push({
          event_key: src.key(r),
          event_name: src.name(r),
          year: 2024,
          weight_class: r.weight || null,
          round,
          source_round: r.round || null,
          bout_order: Number(r.match_number) || order,
          athlete_name: name,
          athlete_id: girl?.id ?? null,
          athlete_club: "NC",
          opponent_name: r[other] || null,
          opponent_club: r[`${other}_team`] || null,
          win: won,
          is_bye: /^bye$/i.test(r[other] ?? ""),
          win_type: WIN_TYPE[r.win_type ?? ""] ?? (r.win_type || null),
          score: [r.score, r.time].filter(Boolean).join(" ") || null,
          source_file: src.file,
          event_date: src.date,
          gender: "F",
        })
      }
    }
    const linked = rows.filter((r) => r.athlete_id).length
    console.log(`\n${src.file}: ${rows.length} rows for ${who.size} NC girls; ${linked} linked to a profile`)
    for (const [name, t] of [...who].sort((a, b) => Number(Boolean(b[1].id)) - Number(Boolean(a[1].id)) || a[0].localeCompare(b[0]))) {
      console.log(`   ${t.id ? "linked " : "UNLINKED"}  ${name.padEnd(26)} ${t.w}-${t.l}   ${t.label}`)
    }
    if (!WRITE) continue
    const del = await sb.from("other_tournament_bouts").delete().eq("source_file", src.file)
    if (del.error) throw del.error
    for (let i = 0; i < rows.length; i += 200) {
      const ins = await sb.from("other_tournament_bouts").insert(rows.slice(i, i + 200))
      if (ins.error) throw new Error(`${src.file}: ${ins.error.message}`)
    }
    console.log(`   written`)
  }
  if (!WRITE) console.log("\nDry run. Re-run with --write to apply.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
