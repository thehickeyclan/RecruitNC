/**
 * A state's USA Wrestling freestyle/Greco state championships - the FS/GR parity layer.
 *
 *   npx tsx --env-file=.env.local scripts/import-usaw-fsgr-states.ts --state NC --dir <package>
 *   ... --write                                                                          insert
 *
 * One bouts row per bout for each wrestler we hold a profile for in that state, and one results
 * row per such wrestler per division. Wrestlers without a profile are not stored. A name links only
 * when exactly one profile of that gender in that state carries it; anything ambiguous is left
 * unlinked and listed. Event keys read `<state>-usaw-states-<year>-<age>-<gender>-<style>`.
 *
 * Was SC-only (Muse's 21 Oct 2026 package). Generalised 4 Nov 2026 for NC's 2025 build, which
 * arrived in the same column shape under different file names, so the two CSVs are discovered by
 * pattern rather than named. Three things the SC version got away with and a second state cannot:
 *   - the roster query goes through `inState`, because North Carolina's profiles carry a flag
 *     rather than a state code;
 *   - the already-loaded guard is scoped to the state AND the years in the package. NC already
 *     held 2026, so a guard on the key prefix alone would have refused the 2025 load outright;
 *   - `opponent_id` is filled when the other side also has a profile. Writing it null costs the
 *     head-to-head, which is what left 870 NC state bout sides unreachable in the 2026 folkstyle
 *     key (4 Nov 2026).
 */
import { createClient } from "@supabase/supabase-js"
import { readdirSync, readFileSync } from "fs"
import { basename, join } from "path"
import { HOME_STATE, inState, normalizeStateCode } from "@/lib/recruiting/states"

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i < 0 ? undefined : process.argv[i + 1]
}
const dir = flag("dir") ?? process.argv.find((a, i) => i >= 2 && !a.startsWith("--") && process.argv[i - 1] !== "--state")
const STATE = normalizeStateCode(flag("state") ?? "SC") ?? "SC"
const write = process.argv.includes("--write")
if (!dir) throw new Error("Missing --dir <package-dir>")

/**
 * The first day of each championship. Keyed by state and year because a wrong date silently moves a
 * bout in or out of the 12-month head-to-head window, so nothing here is defaulted or guessed - an
 * unlisted year stops the run.
 */
const DATES: Record<string, string> = {
  "SC|2025": "2025-05-31",
  "SC|2026": "2026-06-06",
  // 54th Annual, 3-4 May 2025, Mooresville HS; the start date, matching 2026's single-date rows.
  "NC|2025": "2025-05-03",
}
const dateFor = (year: string) => {
  const d = DATES[`${STATE}|${year}`]
  if (!d) throw new Error(`No event date recorded for ${STATE} ${year} - add it to DATES`)
  return d
}

/** The package names its two files differently per state, so find them by shape, not by name. */
function findCsv(kind: "bouts" | "placements"): string {
  const hits = readdirSync(dir!).filter((f) => f.endsWith(".csv") && f.includes(kind))
  if (hits.length !== 1) throw new Error(`Expected exactly one *${kind}*.csv in ${dir}, found ${hits.length}`)
  return join(dir!, hits[0]!)
}

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
const eventKey = (r: Record<string, string>) =>
  `${STATE.toLowerCase()}-usaw-states-${r.year}-${ageSlug(r.age)}-${gSlug(r.gender)}-${styleSlug(r.style)}`
const eventName = (r: Record<string, string>) =>
  `${r.year} ${STATE} Freestyle & Greco State Championships - ${ageLabel(r.age)} ${/girl/i.test(r.gender) ? "Girls" : "Boys"} ${styleLabel(r.style)}`

function splitResult(result: string): { winType: string | null; score: string | null } {
  const t = result.trim()
  if (!t) return { winType: null, score: null }
  const [first, ...rest] = t.split(/\s+/)
  return { winType: first, score: rest.join(" ") || null }
}

async function main() {
  const boutsPath = findCsv("bouts")
  const placesPath = findCsv("placements")
  const SOURCE = basename(boutsPath)
  const bouts = parseCsv(readFileSync(boutsPath, "utf8"))
  const places = parseCsv(readFileSync(placesPath, "utf8"))
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const roster: any[] = []
  for (let p = 0; ; p++) {
    const { data, error } = await inState(
      admin.from("athletes").select("id,firstName,lastName,gender,graduationyear,highschool"),
      STATE,
    ).range(p * 1000, p * 1000 + 999)
    if (error) throw error
    roster.push(...data!)
    if (data!.length < 1000) break
  }
  const byName = new Map<string, any[]>()
  for (const a of roster) {
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
      const opponent = b[other] ? link(b[other]!, b.gender) : { id: null as string | null, ambiguous: false }
      boutRows.push({
        event_key: eventKey(b), event_name: eventName(b), year: Number(b.year), weight_class: b.weight,
        round: b.round, bout_order: i, athlete_name: name, athlete_id: l.id, athlete_club: b[`${side}_team`] || null,
        opponent_name: b[other] || null, opponent_id: opponent.id, opponent_club: b[`${other}_team`] || null,
        win: side === "winner", is_bye: false, win_type: winType, score, source_file: SOURCE,
        source_round: b.round, event_date: dateFor(b.year), gender: /girl/i.test(b.gender) ? "F" : "M",
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
      event_key: eventKey(r), event_name: eventName(r),
      event_short_name: `${STATE} Freestyle & Greco State Championships`, event_state: STATE,
      // Home-state profiles carry no state code, and the 2026 NC rows already stored null here.
      event_date: dateFor(r.year), year: Number(r.year), athlete_name: name, athlete_id: l.id, club,
      high_school: null, state: STATE === HOME_STATE ? null : STATE,
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

  console.log(`${STATE}: bouts ${bouts.length} · placements ${places.length} · ${STATE} profiles ${roster.length}`)
  console.log(`source files: ${basename(boutsPath)}, ${basename(placesPath)}`)
  console.log(`linked wrestlers ${linkedNames.size} · bout rows ${boutRows.length} · result rows ${resultRows.size} · ambiguous names ${ambiguous.size}`)
  if (ambiguous.size) console.log("ambiguous (left unlinked):", [...ambiguous].join("; "))
  console.log("sample:", [...resultRows.values()].filter((r) => r.placement === 1).slice(0, 8).map((r) => `${r.athlete_name} ${r.event_key} ${r.weight_class} ${r.record}`).join(" | "))

  // Never twice - but scoped to the YEARS in this package, so a state that already holds another
  // year is not refused. NC held 2026 when its 2025 package arrived.
  const years = [...new Set(bouts.map((b) => b.year))].sort()
  for (const y of years) {
    const { count } = await admin
      .from("other_tournament_bouts")
      .select("id", { count: "exact", head: true })
      .like("event_key", `${STATE.toLowerCase()}-usaw-states-${y}-%`)
    if (count) { console.log(`${STATE} ${y} already loaded (${count} bout rows) - nothing written`); return }
  }
  console.log(`years in this package: ${years.join(", ")}`)
  if (!write) return console.log("dry run - nothing written")
  for (let i = 0; i < boutRows.length; i += 500) { const { error } = await admin.from("other_tournament_bouts").insert(boutRows.slice(i, i + 500)); if (error) throw error }
  const res = [...resultRows.values()]
  for (let i = 0; i < res.length; i += 500) { const { error } = await admin.from("other_tournament_results").insert(res.slice(i, i + 500)); if (error) throw error }
  console.log(`written: ${boutRows.length} bout rows, ${res.length} result rows`)
}

main().catch((e) => { console.error(e); process.exit(1) })
