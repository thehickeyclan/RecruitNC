/**
 * Import the 2026 NCHSAA individual State Championships bout export.
 *
 * The Trackwrestling export's Round column is blank. Round labels below are therefore assigned
 * only when the two wrestlers' published final placements prove the bracket round. All other
 * bouts stay labelled "State Championships" rather than receiving a guess.
 *
 * Dry run (default):
 *   node --env-file=.env.local --import tsx scripts/import-nchsaa-states-2026.ts --file "/path/results.csv"
 * Apply:
 *   node --env-file=.env.local --import tsx scripts/import-nchsaa-states-2026.ts --file "/path/results.csv" --apply
 */
import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"
import {
  buildAthleteIndex,
  matchAthlete,
  normalizeName,
  parseTrackwrestlingBoutCsv,
  type MatchableAthlete,
  type SourceBoutRow,
} from "../lib/other-tournament-import"

const EVENT_KEY = "nchsaa-states-2026"
const EVENT_NAME = "NCHSAA State Championships"
const SOURCE_DATE = "2026-02-19"

function arg(name: string): string {
  const index = process.argv.indexOf(`--${name}`)
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing --${name}`)
  return process.argv[index + 1]!
}

function divisionAndWeight(raw: string): { classification: string; weight: string } {
  const cleaned = raw.trim()
  const parsed = cleaned.match(/^(.+?)(?:\s+-\s+|\s+)(\d+)$/)
  if (parsed) return { classification: parsed[1]!.trim().toUpperCase(), weight: parsed[2]! }
  throw new Error(`Unrecognized weight label: ${raw}`)
}

type Placer = { place: number; name: string; school: string }
type PlacementIndex = Map<string, Placer[]>
const placementKey = (classification: string, weight: string, name: string) =>
  `${classification}|${weight}|${normalizeName(name)}`

function findPlace(index: PlacementIndex, classification: string, weight: string, name: string, team: string) {
  const candidates = index.get(placementKey(classification, weight, name)) ?? []
  if (candidates.length === 1) return candidates[0]!.place
  const sourceTeam = normalizeName(team)
  const bySchool = candidates.filter((candidate) => {
    const school = normalizeName(candidate.school)
    return school && sourceTeam && (school === sourceTeam || school.includes(sourceTeam) || sourceTeam.includes(school))
  })
  return bySchool.length === 1 ? bySchool[0]!.place : null
}

export function provenRound(winnerPlace: number | null, loserPlace: number | null): string {
  if (winnerPlace == null || loserPlace == null) return "State Championships"
  const pair = new Set([winnerPlace, loserPlace])
  if (pair.has(1) && pair.has(2)) return "Finals"
  if (pair.has(3) && pair.has(4)) return "3rd Place"
  if (pair.has(5) && pair.has(6)) return "5th Place"
  if (pair.has(7) && pair.has(8)) return "7th Place"
  if ([winnerPlace, loserPlace].some((place) => place <= 2) && [winnerPlace, loserPlace].some((place) => place === 3 || place === 4)) {
    return "Semi-Finals"
  }
  if ([winnerPlace, loserPlace].some((place) => place <= 4) && [winnerPlace, loserPlace].some((place) => place >= 5 && place <= 8)) {
    return "Quarter-Finals"
  }
  return "State Championships"
}

const roundRank: Record<string, number> = {
  "State Championships": 10,
  "Quarter-Finals": 30,
  "Semi-Finals": 40,
  "7th Place": 50,
  "5th Place": 51,
  "3rd Place": 52,
  Finals: 53,
}

async function pageAll(supabase: ReturnType<typeof createClient>, table: string, select: string, filter?: (query: any) => any) {
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    let query: any = supabase.from(table).select(select).range(from, from + 999)
    if (filter) query = filter(query)
    const { data, error } = await query
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) return rows
  }
}

async function main() {
  const sourceFile = arg("file")
  const apply = process.argv.includes("--apply")
  const rows = parseTrackwrestlingBoutCsv(fs.readFileSync(sourceFile, "utf8"))
  const relevant = rows.filter((row) => /NCHSAA.*State Championship/i.test(row.event))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY")
  const supabase = createClient(url, key)

  const [roster, placements] = await Promise.all([
    pageAll(supabase, "athletes", 'id,name,wrestling_name,highschool,"wrestlingClub",graduationyear'),
    pageAll(
      supabase,
      "wrestling_nchsaa_results",
      "year,classification,weight_class,place,wrestler_name,school",
      (query) => query.eq("year", 2026),
    ),
  ])
  // A 2026 high-school competitor must graduate from 2026 through 2029. Excluding alumni with
  // the same name prevents a safe-looking exact-name match from writing to the wrong profile.
  const currentRoster = roster.filter((athlete) => {
    const year = Number(athlete.graduationyear)
    return Number.isFinite(year) && year >= 2026 && year <= 2029
  }) as MatchableAthlete[]
  const athleteIndex = buildAthleteIndex(currentRoster)
  const placementIndex: PlacementIndex = new Map()
  for (const row of placements) {
    const place = Number(row.place)
    if (!Number.isFinite(place) || place < 1) continue
    const key = placementKey(String(row.classification), String(row.weight_class), String(row.wrestler_name))
    const bucket = placementIndex.get(key) ?? []
    bucket.push({ place, name: String(row.wrestler_name), school: String(row.school ?? "") })
    placementIndex.set(key, bucket)
  }

  const resolved = new Map<string, MatchableAthlete | null>()
  const ambiguous = new Set<string>()
  const resolve = (name: string, team: string) => {
    const key = `${normalizeName(name)}|${normalizeName(team)}`
    if (resolved.has(key)) return resolved.get(key) ?? null
    const match = matchAthlete(name, team, athleteIndex)
    if (match.status === "matched") resolved.set(key, match.athlete)
    else {
      resolved.set(key, null)
      if (match.status === "ambiguous") ambiguous.add(`${name} [${team}]`)
    }
    return resolved.get(key) ?? null
  }

  type BoutInsert = Record<string, unknown> & { athlete_id: string; athlete_name: string; round: string; win: boolean }
  const inserts: BoutInsert[] = []
  for (const row of relevant) {
    const { classification, weight } = divisionAndWeight(row.weight)
    const winnerPlace = findPlace(placementIndex, classification, weight, row.winningWrestler, row.winningTeam)
    const loserPlace = findPlace(placementIndex, classification, weight, row.losingWrestler, row.losingTeam)
    const round = provenRound(winnerPlace, loserPlace)
    const common = {
      event_key: EVENT_KEY,
      event_name: EVENT_NAME,
      event_date: SOURCE_DATE,
      year: 2026,
      weight_class: weight,
      round,
      source_round: row.round || null,
      is_bye: false,
      win_type: row.winType || null,
      score: row.result || null,
      source_file: path.basename(sourceFile),
    }
    const winner = resolve(row.winningWrestler, row.winningTeam)
    const loser = resolve(row.losingWrestler, row.losingTeam)
    if (winner) inserts.push({
      ...common,
      athlete_id: winner.id,
      athlete_name: row.winningWrestler,
      athlete_club: row.winningTeam || null,
      opponent_name: row.losingWrestler,
      opponent_id: loser?.id ?? null,
      opponent_club: row.losingTeam || null,
      round,
      win: true,
    })
    if (loser) inserts.push({
      ...common,
      athlete_id: loser.id,
      athlete_name: row.losingWrestler,
      athlete_club: row.losingTeam || null,
      opponent_name: row.winningWrestler,
      opponent_id: winner?.id ?? null,
      opponent_club: row.winningTeam || null,
      round,
      win: false,
    })
  }

  const grouped = new Map<string, BoutInsert[]>()
  for (const bout of inserts) {
    const bucket = grouped.get(bout.athlete_id) ?? []
    bucket.push(bout)
    grouped.set(bout.athlete_id, bucket)
  }
  for (const bouts of grouped.values()) {
    bouts.sort((a, b) => (roundRank[a.round] ?? 10) - (roundRank[b.round] ?? 10))
    const occurrences = new Map<string, number>()
    bouts.forEach((bout, index) => {
      bout.bout_order = index
      // The live table's legacy uniqueness rule is event + weight + round + athlete. Keep multiple
      // bouts with the same display round distinct in storage; the profile reader removes this suffix.
      const key = `${bout.weight_class}|${bout.round}`
      const occurrence = (occurrences.get(key) ?? 0) + 1
      occurrences.set(key, occurrence)
      if (occurrence > 1 || bout.round === "State Championships") bout.round = `${bout.round} · Bout ${occurrence}`
    })
  }

  const proven = inserts.filter((row) => !row.round.startsWith("State Championships · Bout ")).length
  console.log(`Parsed ${rows.length} CSV bouts; ${relevant.length} are NCHSAA States.`)
  console.log(`Linked ${grouped.size} profiles to ${inserts.length} bout-side rows; ${proven} have proven round labels.`)
  console.log(`Ambiguous names left unlinked: ${ambiguous.size}`)
  for (const name of [...ambiguous].sort()) console.log(`  ? ${name}`)
  if (!apply) {
    console.log("DRY RUN — no database changes. Re-run with --apply after review.")
    return
  }

  const { error: deleteError } = await supabase.from("other_tournament_bouts").delete().eq("event_key", EVENT_KEY)
  if (deleteError) throw new Error(`Clearing prior import: ${deleteError.message}`)
  for (let index = 0; index < inserts.length; index += 400) {
    const { error } = await supabase.from("other_tournament_bouts").insert(inserts.slice(index, index + 400))
    if (error) throw new Error(`Insert batch ${index / 400 + 1}: ${error.message}`)
  }
  console.log(`Applied ${inserts.length} authoritative profile bout rows.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
