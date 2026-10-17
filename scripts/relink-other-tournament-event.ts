/**
 * Attach an already-imported event's unlinked rows to profiles created after the import.
 *
 *   npx tsx scripts/relink-other-tournament-event.ts --event-key i64-fall-duals-2026            # dry run
 *   npx tsx scripts/relink-other-tournament-event.ts --event-key i64-fall-duals-2026 --apply
 *
 * `import-other-tournament-csv.ts` resolves every entrant to a profile once, when the bracket is
 * loaded. A profile minted afterwards never gets the rows: the 2026 I-64 Fall Duals was imported on
 * 10 October and 758 state-qualifier profiles were minted on 14 October, so 21 NC wrestlers there
 * had six bouts each sitting under their exact name with no athlete_id. Profiles fall back to name
 * for those, but only per weight, so a wrestler who bumped up a class for a dual lost those bouts,
 * and anything reading by athlete_id (head-to-head, opponent links) saw none of them.
 *
 * Re-importing the CSV would re-resolve, but it deletes and re-inserts every row, which orphans
 * the result_athlete_links pointing at the old result ids. This updates in place instead:
 *
 *   - Entrants are resolved with the importer's own matcher (`buildAthleteIndex` + `matchAthlete`,
 *     keyed by name and club exactly as the importer keys them). No other name matching.
 *   - A match is only written when the weight corroborates: within CLOSE_LB of a weight the profile
 *     wrestled at the NCHSAA state tournament or in an already-linked bout, within CLOSE_SEASONS.
 *     Same rule as link-our-bouts-by-identity.ts. Anything else is printed and left alone.
 *   - Only empty ids are filled; a row that already names a profile is never changed. The one
 *     exception is opponent_id, which is set to whatever the mirror row (the same bout from the
 *     other side) already says, so the two sides of a bout can never disagree.
 *   - Before --apply writes, every row it will change is saved to --backup (JSON).
 *
 * Idempotent: a second run finds nothing left to fill.
 */

import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"
import { buildAthleteIndex, matchAthlete, type MatchableAthlete } from "../lib/other-tournament-import"

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]!
  if (fallback !== undefined) return fallback
  throw new Error(`Missing required --${name}`)
}

const APPLY = process.argv.includes("--apply")
const CLOSE_LB = 30
const CLOSE_SEASONS = 2

type Row = Record<string, any>

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function page(table: string, select: string, filter: (q: any) => any = (q) => q): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(supabase.from(table).select(select)).order("id").range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

const pounds = (weight: unknown): number | null => {
  const m = String(weight ?? "").match(/\d{2,3}/)
  return m ? Number(m[0]) : null
}
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase()
const entrantKey = (name: unknown, club: unknown) => `${norm(name)}|${norm(club)}`
/** One bout seen from one side; the mirror is the same key with the two wrestlers swapped. */
const boutKey = (r: Row, self: "athlete" | "opponent") => {
  const [a, b] = self === "athlete" ? [r.athlete_name, r.opponent_name] : [r.opponent_name, r.athlete_name]
  const [ac, bc] = self === "athlete" ? [r.athlete_club, r.opponent_club] : [r.opponent_club, r.athlete_club]
  return [entrantKey(a, ac), entrantKey(b, bc), norm(r.weight_class), norm(r.source_round), norm(r.score), norm(r.win_type)].join("#")
}

async function main() {
  const eventKey = arg("event-key")
  const backupPath = arg("backup", `ranking-snapshots/${eventKey}-relink-backup-${new Date().toISOString().slice(0, 10)}.json`)
  console.log(APPLY ? `APPLYING to ${eventKey}\n` : `DRY RUN for ${eventKey} - nothing is written (pass --apply)\n`)

  const [bouts, results, roster] = await Promise.all([
    page("other_tournament_bouts", "*", (q) => q.eq("event_key", eventKey)),
    page("other_tournament_results", "*", (q) => q.eq("event_key", eventKey)),
    page("athletes", 'id, name, wrestling_name, highschool, "wrestlingClub", graduationyear'),
  ])
  if (!bouts.length) throw new Error(`No bouts for ${eventKey}`)
  const eventYear = Number(bouts[0]!.year) || Number(String(bouts[0]!.event_date ?? "").slice(0, 4))
  const index = buildAthleteIndex(roster as MatchableAthlete[])
  const athleteById = new Map(roster.map((a) => [a.id as string, a]))

  // Entrants with no profile on any of their rows, with the weights they wrestled here.
  const linkedEntrants = new Set<string>()
  for (const b of bouts) if (b.athlete_id) linkedEntrants.add(entrantKey(b.athlete_name, b.athlete_club))
  for (const r of results) if (r.athlete_id) linkedEntrants.add(entrantKey(r.athlete_name, r.club))
  const entrants = new Map<string, { name: string; club: string; weights: Set<number> }>()
  const note = (name: unknown, club: unknown, weight: unknown) => {
    const key = entrantKey(name, club)
    if (!String(name ?? "").trim() || linkedEntrants.has(key)) return
    const e = entrants.get(key) ?? { name: String(name), club: String(club ?? ""), weights: new Set<number>() }
    const lb = pounds(weight)
    if (lb) e.weights.add(lb)
    entrants.set(key, e)
  }
  for (const b of bouts) if (!b.athlete_id) note(b.athlete_name, b.athlete_club, b.weight_class)
  for (const r of results) if (!r.athlete_id) note(r.athlete_name, r.club, r.weight_class)

  // Which profile each still-unlinked entrant now matches, by the importer's matcher.
  const proposals = new Map<string, { athlete: Row; tier: string; name: string; club: string; weights: number[] }>()
  for (const [key, e] of entrants) {
    const outcome = matchAthlete(e.name, e.club, index)
    if (outcome.status === "matched") {
      proposals.set(key, { athlete: athleteById.get(outcome.athlete.id)!, tier: outcome.tier, name: e.name, club: e.club, weights: [...e.weights] })
    } else if (outcome.status === "ambiguous") {
      console.log(`  ambiguous, left alone: ${e.name} [${e.club}] -> ${outcome.candidates.map((c) => `${c.name}/${c.highschool ?? "?"}`).join(" | ")}`)
    }
  }

  // Weight corroboration: state tournament weights and already-linked bouts, by profile.
  const ids = [...new Set([...proposals.values()].map((p) => p.athlete.id as string))]
  const history = new Map<string, Array<{ weight: number; year: number; source: string }>>()
  const push = (id: string, weight: unknown, year: unknown, source: string) => {
    const w = pounds(weight)
    const y = Number(year)
    if (!w || !y) return
    history.set(id, [...(history.get(id) ?? []), { weight: w, year: y, source }])
  }
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const [byId, linkedBouts] = await Promise.all([
      page("wrestling_nchsaa_results", "id, athlete_id, weight_class, year", (q) => q.in("athlete_id", chunk)),
      page("other_tournament_bouts", "id, athlete_id, weight_class, year, event_key", (q) => q.in("athlete_id", chunk).neq("event_key", eventKey)),
    ])
    for (const r of byId) push(r.athlete_id, r.weight_class, r.year, "NCHSAA")
    for (const r of linkedBouts) push(r.athlete_id, r.weight_class, r.year, r.event_key)
  }
  // State tournament rows the minter did not stamp with athlete_id: same name AND same school only.
  for (const id of ids.filter((id) => !history.has(id))) {
    const a = athleteById.get(id)!
    if (!a.highschool) continue
    const rows = await page("wrestling_nchsaa_results", "id, wrestler_name, school, weight_class, year", (q) =>
      q.ilike("wrestler_name", String(a.name)).ilike("school", String(a.highschool)),
    )
    for (const r of rows) push(id, r.weight_class, r.year, "NCHSAA (name+school)")
  }

  const accepted = new Map<string, string>() // entrantKey -> athlete id
  console.log(`Unlinked entrants: ${entrants.size}; now matching a profile: ${proposals.size}\n`)
  for (const [key, p] of proposals) {
    const h = history.get(p.athlete.id) ?? []
    const support = h.find((x) => p.weights.some((w) => Math.abs(x.weight - w) <= CLOSE_LB) && Math.abs(x.year - eventYear) <= CLOSE_SEASONS)
    const label = `${p.name} [${p.club}] @${p.weights.join("/")} -> ${p.athlete.name} / ${p.athlete.highschool ?? "?"} / ${p.athlete.graduationyear ?? "?"} (${p.tier})`
    if (support) {
      accepted.set(key, p.athlete.id)
      console.log(`  ✓ ${label}  [${support.source} ${support.year} @${support.weight}]`)
    } else {
      console.log(`  held ${label}  [no weight on record within ${CLOSE_LB} lb]`)
    }
  }

  // Row changes.
  const boutUpdates = new Map<string, Row>()
  const set = (row: Row, patch: Row) => boutUpdates.set(row.id, { ...(boutUpdates.get(row.id) ?? {}), ...patch })
  for (const b of bouts) {
    const self = accepted.get(entrantKey(b.athlete_name, b.athlete_club))
    if (!b.athlete_id && self) set(b, { athlete_id: self })
  }
  // opponent_id follows the mirror row's athlete_id (after the fills above).
  const finalAthleteId = (r: Row) => boutUpdates.get(r.id)?.athlete_id ?? r.athlete_id ?? null
  const byKey = new Map<string, Row>()
  for (const b of bouts) byKey.set(boutKey(b, "athlete"), b)
  let opponentFromMirror = 0
  for (const b of bouts) {
    if (b.is_bye || !b.opponent_name) continue
    const mirror = byKey.get(boutKey(b, "opponent"))
    const want = mirror ? finalAthleteId(mirror) : accepted.get(entrantKey(b.opponent_name, b.opponent_club)) ?? null
    if (want && (b.opponent_id ?? null) !== want) {
      if (b.opponent_id) {
        console.log(`  opponent_id disagreement left alone: ${b.id} ${b.athlete_name} v ${b.opponent_name} (${b.opponent_id} vs ${want})`)
        continue
      }
      set(b, { opponent_id: want })
      opponentFromMirror++
    }
  }
  const resultUpdates = new Map<string, Row>()
  for (const r of results) {
    const id = accepted.get(entrantKey(r.athlete_name, r.club))
    if (r.athlete_id || !id) continue
    // high_school only ever from our athletes table, as the importer writes it.
    resultUpdates.set(r.id, { athlete_id: id, high_school: athleteById.get(id)?.highschool ?? null })
  }

  const boutSelf = [...boutUpdates.values()].filter((p) => p.athlete_id).length
  console.log(`\nWould set athlete_id on ${boutSelf} bout rows, opponent_id on ${opponentFromMirror} bout rows (${boutUpdates.size} bout rows in all)`)
  console.log(`Would set athlete_id + high_school on ${resultUpdates.size} result rows`)

  if (!APPLY) return
  if (!boutUpdates.size && !resultUpdates.size) { console.log("Nothing to write."); return }

  const backup = {
    eventKey,
    takenAt: new Date().toISOString(),
    note: "Rows as they were before relink-other-tournament-event.ts --apply; restore by writing these values back by id.",
    other_tournament_bouts: bouts.filter((b) => boutUpdates.has(b.id)).map((b) => ({ before: b, patch: boutUpdates.get(b.id) })),
    other_tournament_results: results.filter((r) => resultUpdates.has(r.id)).map((r) => ({ before: r, patch: resultUpdates.get(r.id) })),
  }
  fs.mkdirSync(path.dirname(backupPath), { recursive: true })
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  console.log(`Backup of ${backup.other_tournament_bouts.length + backup.other_tournament_results.length} rows: ${backupPath}`)

  // Grouped by identical patch so it is a handful of requests, each guarded on the column still being empty.
  const writeGroups = async (table: string, updates: Map<string, Row>) => {
    const groups = new Map<string, string[]>()
    for (const [id, patch] of updates) {
      const k = JSON.stringify(patch)
      groups.set(k, [...(groups.get(k) ?? []), id])
    }
    let written = 0
    for (const [k, rowIds] of groups) {
      const patch = JSON.parse(k) as Row
      let q = supabase.from(table).update(patch).in("id", rowIds)
      for (const col of Object.keys(patch)) if (col.endsWith("_id")) q = q.is(col, null)
      const { data, error } = await q.select("id")
      if (error) throw new Error(`${table}: ${error.message}`)
      written += data?.length ?? 0
    }
    return written
  }
  const wroteBouts = await writeGroups("other_tournament_bouts", boutUpdates)
  const wroteResults = await writeGroups("other_tournament_results", resultUpdates)
  console.log(`Wrote ${wroteBouts} bout rows and ${wroteResults} result rows.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
