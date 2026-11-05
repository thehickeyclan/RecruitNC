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
 *
 * Two further changes on 4 Nov 2026, when nine more states arrived at once and most of them hold
 * no profiles yet:
 *   - EVERY side of every bout is stored, with a null `athlete_id` where no profile exists yet, the
 *     way the folkstyle importer banks them. Before this an FS/GR load could not heal: the sides of
 *     wrestlers minted later were never written at all, so each mint batch meant re-importing every
 *     package. A banked side is attached in place afterwards by
 *     `scripts/relink-other-tournament-event.ts`. It also means a complete ledger is stored for a
 *     state with no profiles at all, which is what Indiana, Florida and the rest are.
 *   - `--reload` replaces a year this state already holds. The guard still refuses it by accident.
 *     Bouts are deleted and rewritten; RESULTS ARE NOT - 703 of the 705 FS/GR result rows carry a
 *     `result_athlete_links` row pointing at their id, and that link is how a profile reaches the
 *     credential, so results are updated in place and only new ones inserted.
 *
 * Several packages ship one CSV pair per year rather than one pair covering both, so the two kinds
 * are read as sets of files, not single files. Rows carry their own year.
 *
 * Two shapes in the wave-2 packages collide with the bouts table's unique key
 * (event_key, weight_class, round, athlete_name, opponent_name), and they are opposites:
 *   - Delaware prints five bouts TWICE, identical in every column. One bout scraped twice, not two
 *     meetings. Dropped, and named in the output.
 *   - West Virginia's package prints no round label, and a pair there can meet twice (different
 *     bout numbers, different results - real rematches). Those are kept and told apart with the
 *     ledger's own convention, the "· Bout N" suffix the folkstyle importer uses. The suffix goes
 *     on the BOUT, so both of its sides carry the same label and the launch sweep still reads the
 *     bout as mirrored; `source_round` keeps the label the package actually printed.
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
const reload = process.argv.includes("--reload")
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
  // VAWA FS/GR states, 3-4 May 2025, Heritage HS, Lynchburg (FloArena event 13994316).
  "VA|2025": "2025-05-03",
  // VAWA FS/GR states, 2-3 May 2026, Heritage HS, Lynchburg (FloArena event 15848569).
  "VA|2026": "2026-05-02",
  // Parity wave 2, 4 Nov 2026. Each is the first day of the championship, from that package's
  // delivery note; a two-day event is entered on its opening day, as NC and VA already are.
  "AL|2025": "2025-05-03", // Alabama Freestyle and Greco State Championship, Homewood
  "AL|2026": "2026-05-02", // Team Alabama State Tournament, Homewood Middle School
  "DE|2025": "2025-05-18", // both styles one day, Smyrna HS
  "DE|2026": "2026-05-16", // Greco Sat 16 May, Freestyle Sun 17 May, Smyrna HS
  "FL|2025": "2025-05-30", // Spartan Nationals + FAWA states, 30 May - 1 Jun
  "FL|2026": "2026-05-30", // FS Sat 30 May, FAWA Greco Sun 31 May
  "GA|2025": "2025-05-10", // TGA FS/Greco State (FloArena 14186722)
  "IN|2025": "2025-05-02", // ISWA state finals, 2-4 May
  "IN|2026": "2026-05-01", // ISWA state finals, 1-3 May
  "MD|2025": "2025-05-17", // Loyola-Blakefield, both styles one day
  "MD|2026": "2026-05-16", // Mount Saint Joseph HS
  "MS|2025": "2025-05-31", // MS USA State Tournament, Oak Grove HS
  "WV|2025": "2025-05-10", // WV state FS + Greco, University HS, Morgantown
  // Kentucky's delivery note fixes the YEAR by content but gives no day - USA Wrestling's mirror
  // prints none, and the 2024 edition ran 20 April. The month is recorded, the day is not known,
  // and the run says so out loud rather than letting a guess pass as a date. Nothing downstream
  // turns on it at this distance: the 12-month head-to-head window closed on spring 2025 long ago.
  "KY|2025": "2025-05-01",
  // Both styles the same day and venue, Walker HS (FloArena 13956434 freestyle, 14143294 Greco).
  "LA|2025": "2025-05-03",
}
/** Dates whose day is not established by the delivery note. Printed on every run. */
const APPROX_DATES = new Set(["KY|2025"])
const dateFor = (year: string) => {
  const d = DATES[`${STATE}|${year}`]
  if (!d) throw new Error(`No event date recorded for ${STATE} ${year} - add it to DATES`)
  return d
}

/**
 * The package names its files differently per state, so they are found by shape, not by name - and
 * as a SET: Delaware, Florida, Georgia, Maryland and West Virginia ship one pair per year where
 * Alabama, Indiana, Kentucky and Mississippi ship one pair covering both. Every row carries its
 * own year, so the files simply concatenate.
 */
function findCsvs(kind: "bouts" | "placements"): string[] {
  const hits = readdirSync(dir!).filter((f) => f.endsWith(".csv") && f.includes(kind)).sort()
  if (!hits.length) throw new Error(`No *${kind}*.csv in ${dir}`)
  return hits.map((f) => join(dir!, f))
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
  const boutsPaths = findCsvs("bouts")
  const placesPaths = findCsvs("placements")
  const SOURCE = boutsPaths.map((f) => basename(f)).join(", ")
  const rawBouts = boutsPaths.flatMap((f) => parseCsv(readFileSync(f, "utf8")))
  const places = placesPaths.flatMap((f) => parseCsv(readFileSync(f, "utf8")))

  // A row repeated in every column, bout number included, is one bout scraped twice.
  const seenRow = new Set<string>()
  const exactDupes: string[] = []
  const bouts = rawBouts.filter((b) => {
    const k = JSON.stringify(Object.values(b))
    if (seenRow.has(k)) { exactDupes.push(`${b.year} ${b.age} ${b.gender} ${b.style} ${b.weight} ${b.round || "(no round)"}: ${b.winner} over ${b.loser}`); return false }
    seenRow.add(k)
    return true
  })
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

  /**
   * One label per bout. A pair that meets more than once under the same printed round label is
   * numbered in bout order, so the two meetings are distinguishable - both sides of one bout get
   * the same label, which is what keeps the pair mirrored.
   */
  const meetings = new Map<string, Record<string, string>[]>()
  /**
   * NOT `norm()` here: it strips digits, so "Champ. Round 2" and "Champ. Round 3" fold together and
   * a pair that met in two different rounds reads as a rematch. Case and spacing only.
   */
  const roundFold = (s: string) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ")
  for (const b of bouts) {
    const pair = [norm(b.winner ?? ""), norm(b.loser ?? "")].sort().join(" vs ")
    const k = `${eventKey(b)}|${b.weight}|${roundFold(b.round ?? "")}|${pair}`
    meetings.set(k, [...(meetings.get(k) ?? []), b])
  }
  const roundLabel = new Map<Record<string, string>, string>()
  let rematches = 0
  for (const list of meetings.values()) {
    if (list.length === 1) continue
    rematches += list.length
    list.sort((a, b) => Number(a.bout_no || 0) - Number(b.bout_no || 0))
    list.forEach((b, i) => roundLabel.set(b, b.round ? `${b.round} · Bout ${i + 1}` : `Bout ${i + 1}`))
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
      // A side with no profile is still stored, with a null athlete_id, so the ledger is complete
      // and the row attaches when that wrestler is minted. See the note at the top of this file.
      if (l.id) linkedNames.set(l.id, name)
      const opponent = b[other] ? link(b[other]!, b.gender) : { id: null as string | null, ambiguous: false }
      boutRows.push({
        event_key: eventKey(b), event_name: eventName(b), year: Number(b.year), weight_class: b.weight,
        round: roundLabel.get(b) ?? b.round, bout_order: i, athlete_name: name, athlete_id: l.id, athlete_club: b[`${side}_team`] || null,
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
  console.log(`source files: ${SOURCE} | ${placesPaths.map((f) => basename(f)).join(", ")}`)
  console.log(`linked wrestlers ${linkedNames.size} · bout rows ${boutRows.length} · result rows ${resultRows.size} · ambiguous names ${ambiguous.size}`)
  if (exactDupes.length) console.log(`dropped ${exactDupes.length} row(s) printed twice in the package: ${exactDupes.join("; ")}`)
  if (rematches) console.log(`${rematches} bout(s) are a pair meeting again under the same round label - numbered "· Bout N" in bout order`)
  if (ambiguous.size) console.log("ambiguous (left unlinked):", [...ambiguous].join("; "))
  console.log("sample:", [...resultRows.values()].filter((r) => r.placement === 1).slice(0, 8).map((r) => `${r.athlete_name} ${r.event_key} ${r.weight_class} ${r.record}`).join(" | "))

  const banked = boutRows.filter((r) => !r.athlete_id).length
  console.log(`bout sides banked with no profile yet: ${banked} of ${boutRows.length} - they attach when the wrestler is minted`)

  const years = [...new Set(bouts.map((b) => b.year))].sort()
  for (const y of years) if (APPROX_DATES.has(`${STATE}|${y}`)) {
    console.log(`NOTE: ${STATE} ${y} event date ${dateFor(y)} is the month only - the day is not established by the delivery note`)
  }

  // Never twice by accident - scoped to the YEARS in this package, so a state that already holds
  // another year is not refused (NC held 2026 when its 2025 package arrived). --reload is the
  // deliberate replacement, for a package rebuilt or re-parsed after the first load.
  const held: string[] = []
  for (const y of years) {
    const { count, error } = await admin
      .from("other_tournament_bouts")
      .select("id", { count: "exact", head: true })
      .like("event_key", `${STATE.toLowerCase()}-usaw-states-${y}-%`)
    if (error) throw error
    if (count) held.push(`${y} (${count} bout rows)`)
  }
  if (held.length && !reload) {
    console.log(`${STATE} already loaded: ${held.join(", ")} - nothing written. Re-run with --reload to replace it.`)
    return
  }
  console.log(`years in this package: ${years.join(", ")}${held.length ? ` | --reload replacing ${held.join(", ")}` : ""}`)
  if (!write) return console.log("dry run - nothing written")

  if (held.length) {
    for (const y of years) {
      const { error } = await admin.from("other_tournament_bouts").delete().like("event_key", `${STATE.toLowerCase()}-usaw-states-${y}-%`)
      if (error) throw error
    }
    console.log(`deleted the held bout rows for ${years.join(", ")}`)
  }
  for (let i = 0; i < boutRows.length; i += 500) { const { error } = await admin.from("other_tournament_bouts").insert(boutRows.slice(i, i + 500)); if (error) throw error }

  // Results are never deleted: a result_athlete_links row points at the id, and that link is how a
  // profile reaches the credential. Existing rows are updated in place, keyed by what identifies a
  // wrestler's division entry - event key, weight, profile - and only genuinely new ones inserted.
  const res = [...resultRows.values()]
  const existing = new Map<string, string>()
  for (const y of years) {
    for (let p = 0; ; p++) {
      const { data, error } = await admin.from("other_tournament_results").select("id,event_key,weight_class,athlete_id")
        .like("event_key", `${STATE.toLowerCase()}-usaw-states-${y}-%`).order("id").range(p * 1000, p * 1000 + 999)
      if (error) throw error
      for (const r of data!) existing.set(`${r.event_key}|${r.weight_class}|${r.athlete_id}`, r.id)
      if (data!.length < 1000) break
    }
  }
  const keyOf = (r: any) => `${r.event_key}|${r.weight_class}|${r.athlete_id}`
  const fresh = res.filter((r) => !existing.has(keyOf(r)))
  const updates = res.filter((r) => existing.has(keyOf(r)))
  for (let i = 0; i < fresh.length; i += 500) { const { error } = await admin.from("other_tournament_results").insert(fresh.slice(i, i + 500)); if (error) throw error }
  for (const r of updates) {
    const { error } = await admin.from("other_tournament_results").update({
      wins: r.wins, losses: r.losses, record: r.record, placement: r.placement, entrants: r.entrants,
      club: r.club, athlete_name: r.athlete_name, event_date: r.event_date, source_file: r.source_file,
    }).eq("id", existing.get(keyOf(r))!)
    if (error) throw error
  }
  console.log(`written: ${boutRows.length} bout rows (${banked} banked) | results ${fresh.length} new, ${updates.length} updated in place`)
}

main().catch((e) => { console.error(e); process.exit(1) })
