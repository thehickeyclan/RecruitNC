#!/usr/bin/env npx tsx
/**
 * Girls' bouts at the 2026 NC Freestyle & Greco State Championships and the Tar Heel State
 * Classic: North Carolina girl against North Carolina girl, in freestyle. For a women's college
 * coach these are the head-to-head results that matter most, and we held them for about 18 girls.
 *
 * Muse's files of 13 October 2026, one row per bout:
 *   event, year, division, weight, round, wrestler, wrestler_club, wrestler_club_abbr, opponent,
 *   opponent_club, opponent_club_abbr, winner, win_type, score, time, notes
 *
 * Every wrestler here is from North Carolina, so each bout becomes two rows, one per girl. The
 * girls' bouts already under these event keys (a partial earlier pull) are replaced. A girl is
 * linked when her name matches exactly one female profile; nobody is created. Each girl's result
 * row for the event then gets her record from these bouts.
 *
 *   npx tsx scripts/import-girls-nc-freestyle-bouts.ts <dir>           # dry run
 *   npx tsx scripts/import-girls-nc-freestyle-bouts.ts <dir> --write
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
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})
const WRITE = process.argv.includes("--write")
const DIR = process.argv.slice(2).find((a) => !a.startsWith("--"))
if (!DIR) {
  console.error("usage: import-girls-nc-freestyle-bouts.ts <dir> [--write]")
  process.exit(1)
}

type Event = { prefix: string; label: string; date: string }
const EVENTS: Array<{ match: RegExp } & Event> = [
  { match: /NC State Freestyle|NC Freestyle/i, prefix: "nc-usaw-states-2026", label: "2026 NC Freestyle & Greco State Championships", date: "2026-05-02" },
  { match: /Tar Heel/i, prefix: "tarheel-classic-2026", label: "2026 Tar Heel State Classic", date: "2026-04-18" },
]
const division = (d: string) => {
  const age = /16u/i.test(d) ? "16u" : "junior"
  const greco = /greco|\bgr\b/i.test(d)
  return { slug: `${age}-girls-${greco ? "gr" : "fs"}`, label: `${age === "16u" ? "16U" : "Junior"} Girls ${greco ? "Greco" : "Freestyle"}` }
}

/** USA Wrestling's rosters misspell two girls; the school-side spelling is the profile's. */
const SPELLING: Record<string, string> = { "kate vazquez": "kate vasquez", "nevaeh willamson": "nevaeh williamson" }
const norm = (s: unknown) => {
  const n = String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim()
  return SPELLING[n] ?? n
}

function parse(file: string): Array<Record<string, string>> {
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

async function main() {
  const girls: Array<{ id: string; name: string; graduationyear: number | null }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("athletes").select("id, name, graduationyear").eq("gender", "Female").order("id").range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    girls.push(...(data as never[]))
    if (data.length < 1000) break
  }
  const byName = new Map<string, typeof girls>()
  for (const g of girls) byName.set(norm(g.name), [...(byName.get(norm(g.name)) ?? []), g])

  for (const file of fs.readdirSync(DIR!).filter((f) => /bouts\.csv$/i.test(f))) {
    const bouts = parse(path.join(DIR!, file))
    const rows: Array<Record<string, unknown>> = []
    const keys = new Set<string>()
    const tally = new Map<string, { key: string; name: string; id: string | null; w: number; l: number }>()
    const seen = new Set<string>()
    let order = 0
    for (const b of bouts) {
      order += 1
      const event = EVENTS.find((e) => e.match.test(b.event ?? ""))
      if (!event) throw new Error(`Unknown event: ${b.event}`)
      const div = division(b.division ?? "")
      const key = `${event.prefix}-${div.slug}`
      keys.add(key)
      for (const side of ["wrestler", "opponent"] as const) {
        const other = side === "wrestler" ? "opponent" : "wrestler"
        const name = b[side]!
        if (!name || /^bye$/i.test(name)) continue
        const hits = byName.get(norm(name)) ?? []
        const girl = hits.length === 1 ? hits[0]! : null
        const identity = `${key}|${b.weight}|${b.round}|${name}|${b[other]}`
        if (seen.has(identity)) continue
        seen.add(identity)
        const won = norm(b.winner) === norm(name)
        const t = tally.get(`${key}|${norm(name)}`) ?? { key, name, id: girl?.id ?? null, w: 0, l: 0 }
        if (won) t.w++
        else t.l++
        tally.set(`${key}|${norm(name)}`, t)
        rows.push({
          event_key: key,
          event_name: `${event.label} - ${div.label}`,
          year: 2026,
          weight_class: b.weight || null,
          round: b.round || null,
          source_round: b.round || null,
          bout_order: order,
          athlete_name: girl?.name ?? name,
          athlete_id: girl?.id ?? null,
          athlete_club: b[`${side}_club_abbr`] || b[`${side}_club`] || null,
          opponent_name: (byName.get(norm(b[other]))?.length === 1 ? byName.get(norm(b[other]))![0]!.name : b[other]) || null,
          opponent_id: byName.get(norm(b[other]))?.length === 1 ? byName.get(norm(b[other]))![0]!.id : null,
          opponent_club: b[`${other}_club_abbr`] || b[`${other}_club`] || null,
          win: won,
          is_bye: /^bye$/i.test(b[other] ?? ""),
          win_type: b.win_type || null,
          score: [b.score, b.time].filter(Boolean).join(" ") || null,
          source_file: file,
          event_date: event.date,
          gender: "F",
        })
      }
    }
    const linked = [...tally.values()].filter((t) => t.id)
    console.log(`\n${file}: ${bouts.length} bouts, ${rows.length} wrestler-rows, ${tally.size} girl-divisions (${linked.length} on a profile)`)
    const unlinked = [...new Set([...tally.values()].filter((t) => !t.id).map((t) => t.name))]
    if (unlinked.length) console.log(`   no single profile (${unlinked.length}): ${unlinked.join(", ")}`)
    if (!WRITE) continue

    // Replace the girls' bouts under these keys: the earlier pull held a few pools of them.
    const del = await sb.from("other_tournament_bouts").delete().in("event_key", [...keys]).eq("gender", "F")
    if (del.error) throw del.error
    for (let i = 0; i < rows.length; i += 200) {
      const ins = await sb.from("other_tournament_bouts").insert(rows.slice(i, i + 200))
      if (ins.error) throw new Error(`${file}: ${ins.error.message}`)
    }
    // Each girl's result row for the division carries her record from these bouts.
    let recorded = 0
    for (const t of linked) {
      const { data: existing } = await sb.from("other_tournament_results").select("id").eq("event_key", t.key).eq("athlete_id", t.id!)
      for (const row of existing ?? []) {
        const { error } = await sb
          .from("other_tournament_results")
          .update({ wins: t.w, losses: t.l, record: `${t.w}-${t.l}`, updated_at: new Date().toISOString() })
          .eq("id", row.id)
        if (error) throw error
        recorded++
      }
    }
    console.log(`   written; ${recorded} result rows given their record`)
  }
  if (!WRITE) console.log("\nDry run. Re-run with --write to apply.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
