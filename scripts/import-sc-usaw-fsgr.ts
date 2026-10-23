/**
 * SC USA Wrestling freestyle/Greco state championships, 2025 + 2026 (Muse's package, 21 Oct 2026).
 *
 *   npx tsx --env-file=.env.local scripts/import-sc-usaw-fsgr.ts <package-dir>          dry run
 *   ... --write                                                                          insert
 *
 * Same shape as the NC freestyle/Greco states (event_key nc-usaw-states-YYYY-<age>-<gender>-<style>):
 * one bouts row per bout for each wrestler we hold a South Carolina profile for, and one results
 * row per such wrestler per division. Wrestlers without a profile are not stored, like the other
 * out-of-state imports. A name links only when exactly one SC profile of that gender carries it;
 * anything ambiguous is left unlinked and listed.
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { join } from "path"

const dir = process.argv[2]
const write = process.argv.includes("--write")
const SOURCE = "SC-USAW-FSGR-2025-2026-2026-10-21.zip"
const DATES: Record<string, string> = { "2025": "2025-05-31", "2026": "2026-06-06" }

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = [], cell = "", q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') q = false; else cell += c }
    else if (c === '"') q = true
    else if (c === ",") { row.push(cell); cell = "" }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = "" }
    else if (c !== "\r") cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [head, ...body] = rows
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])))
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z ]/g, " ").replace(/\b(jr|sr|ii|iii|iv)\b/g, " ").replace(/\s+/g, " ").trim()
/** Name key for linking: spaces dropped, so "Isabela Da Costa" finds the profile "Isabela DaCosta". */
const nameKey = (s: string) => norm(s).replace(/ /g, "")
const ageSlug = (a: string) => (/junior/i.test(a) ? "junior" : "16u")
const ageLabel = (a: string) => (/junior/i.test(a) ? "Junior" : "16U")
const gSlug = (g: string) => (/girl/i.test(g) ? "girls" : "boys")
const styleSlug = (s: string) => (/^gr/i.test(s) ? "gr" : "fs")
const styleLabel = (s: string) => (/^gr/i.test(s) ? "Greco-Roman" : "Freestyle")
const eventKey = (r: Record<string, string>) => `sc-usaw-states-${r.year}-${ageSlug(r.age)}-${gSlug(r.gender)}-${styleSlug(r.style)}`
const eventName = (r: Record<string, string>) =>
  `${r.year} SC Freestyle & Greco State Championships - ${ageLabel(r.age)} ${/girl/i.test(r.gender) ? "Girls" : "Boys"} ${styleLabel(r.style)}`

function splitResult(result: string): { winType: string | null; score: string | null } {
  const t = result.trim()
  if (!t) return { winType: null, score: null }
  const [first, ...rest] = t.split(/\s+/)
  return { winType: first, score: rest.join(" ") || null }
}

async function main() {
  const bouts = parseCsv(readFileSync(join(dir, "sc-usaw-fsgr-bouts.csv"), "utf8"))
  const places = parseCsv(readFileSync(join(dir, "sc-usaw-fsgr-placements.csv"), "utf8"))
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const sc: any[] = []
  for (let p = 0; ; p++) {
    const { data, error } = await admin.from("athletes").select("id,firstName,lastName,gender,graduationyear,highschool").eq("state", "SC").range(p * 1000, p * 1000 + 999)
    if (error) throw error
    sc.push(...data!)
    if (data!.length < 1000) break
  }
  const byName = new Map<string, any[]>()
  for (const a of sc) {
    const key = `${nameKey(`${a.firstName} ${a.lastName}`)}|${String(a.gender ?? "").toLowerCase().startsWith("f") ? "F" : "M"}`
    byName.set(key, [...(byName.get(key) ?? []), a])
  }
  const link = (name: string, gender: string) => {
    if (!name || /^bye$/i.test(name)) return { id: null as string | null, ambiguous: false }
    const hits = byName.get(`${nameKey(name)}|${/girl/i.test(gender) ? "F" : "M"}`) ?? []
    return { id: hits.length === 1 ? hits[0].id : null, ambiguous: hits.length > 1 }
  }

  const boutRows: any[] = []
  const ambiguous = new Set<string>()
  const linkedNames = new Map<string, string>()
  bouts.forEach((b, i) => {
    const { winType, score } = splitResult(b.result)
    for (const side of ["winner", "loser"] as const) {
      const name = b[side]
      if (!name) continue // double forfeits print no winner
      const other = side === "winner" ? "loser" : "winner"
      const l = link(name, b.gender)
      if (l.ambiguous) ambiguous.add(`${name} (${b.gender})`)
      if (!l.id) continue
      linkedNames.set(l.id, name)
      boutRows.push({
        event_key: eventKey(b), event_name: eventName(b), year: Number(b.year), weight_class: b.weight,
        round: b.round, bout_order: i, athlete_name: name, athlete_id: l.id, athlete_club: b[`${side}_team`] || null,
        opponent_name: b[other] || null, opponent_id: null, opponent_club: b[`${other}_team`] || null,
        win: side === "winner", is_bye: false, win_type: winType, score, source_file: SOURCE,
        source_round: b.round, event_date: DATES[b.year] ?? null, gender: /girl/i.test(b.gender) ? "F" : "M",
      })
    }
  })

  // One result row per linked wrestler per division: record from the bouts, place from the placements page.
  const resultRows = new Map<string, any>()
  const entrants = new Map<string, Set<string>>()
  const div = (r: Record<string, string>) => `${eventKey(r)}|${r.weight}`
  for (const b of bouts) for (const n of [b.winner, b.loser]) if (n) entrants.set(div(b), (entrants.get(div(b)) ?? new Set()).add(norm(n)))
  for (const p of places) entrants.set(div(p), (entrants.get(div(p)) ?? new Set()).add(norm(p.name)))
  const touch = (r: Record<string, string>, name: string, club: string | null) => {
    const l = link(name, r.gender)
    if (!l.id) return null
    const key = `${eventKey(r)}|${r.weight}|${l.id}`
    if (!resultRows.has(key)) resultRows.set(key, {
      event_key: eventKey(r), event_name: eventName(r), event_short_name: "SC Freestyle & Greco State Championships", event_state: "SC",
      event_date: DATES[r.year] ?? null, year: Number(r.year), athlete_name: name, athlete_id: l.id, club, high_school: null, state: "SC",
      gender: /girl/i.test(r.gender) ? "F" : "M", weight_class: r.weight, wins: 0, losses: 0, byes: 0, record: "0-0", placement: null,
      qualified: false, entrants: entrants.get(div(r))?.size ?? null, source_file: SOURCE, verification_status: "verified",
    })
    return resultRows.get(key)
  }
  for (const b of bouts) {
    const w = b.winner ? touch(b, b.winner, b.winner_team || null) : null
    const l = b.loser ? touch(b, b.loser, b.loser_team || null) : null
    if (b.winner && w) w.wins++
    if (b.winner && l) l.losses++
  }
  for (const p of places) { const r = touch(p, p.name, p.team || null); if (r) r.placement = Number(p.place) || null }
  for (const r of resultRows.values()) r.record = `${r.wins}-${r.losses}`

  console.log(`bouts ${bouts.length} · placements ${places.length} · SC profiles ${sc.length}`)
  console.log(`linked wrestlers ${linkedNames.size} · bout rows ${boutRows.length} · result rows ${resultRows.size} · ambiguous names ${ambiguous.size}`)
  if (ambiguous.size) console.log("ambiguous (left unlinked):", [...ambiguous].join("; "))
  console.log("sample:", [...resultRows.values()].filter((r) => r.placement === 1).slice(0, 8).map((r) => `${r.athlete_name} ${r.event_key} ${r.weight_class} ${r.record}`).join(" | "))

  // Never twice: refuse if any of these events is already loaded.
  const { count } = await admin.from("other_tournament_bouts").select("id", { count: "exact", head: true }).like("event_key", "sc-usaw-states-%")
  if (count) { console.log(`already loaded (${count} bout rows) - nothing written`); return }
  if (!write) return console.log("dry run - nothing written")
  for (let i = 0; i < boutRows.length; i += 500) { const { error } = await admin.from("other_tournament_bouts").insert(boutRows.slice(i, i + 500)); if (error) throw error }
  const res = [...resultRows.values()]
  for (let i = 0; i < res.length; i += 500) { const { error } = await admin.from("other_tournament_results").insert(res.slice(i, i + 500)); if (error) throw error }
  console.log(`written: ${boutRows.length} bout rows, ${res.length} result rows`)
}

main().catch((e) => { console.error(e); process.exit(1) })
