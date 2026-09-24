/**
 * Import verified NC-profile results from the nationwide 2026 NHSCA National Duals export.
 *
 * This intentionally does not import the full national field. It writes only:
 * - strict, unique profile matches (`verified`), and
 * - plausible NC-profile matches that failed one safety check (`needs_review`, unlinked).
 *
 * NC United / NC United Select are excluded because their results already come from the
 * canonical national-team result source. Dry-run is the default; pass `--apply` to write.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/import-nhsca-national-duals-2026.ts \
 *     --file /path/to/2026NHSCANationalDuals.csv [--apply]
 */

import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"
import {
  nhscaDualsEntrantKey,
  resolveNhscaNationalDualsProfiles,
  type NhscaDirectoryAthlete,
} from "../lib/nhsca-national-duals-import"
import { parseTournament, parseTrackwrestlingBoutCsv } from "../lib/other-tournament-import"

const EVENT_KEY = "nhsca-national-duals-2026"
const EVENT_NAME = "2026 NHSCA National Duals"
const EVENT_DATE = "2026-05-23"
const EVENT_YEAR = 2026

function arg(name: string): string {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]!
  throw new Error(`Missing required --${name}`)
}

async function insertChunks(client: ReturnType<typeof createClient>, table: string, rows: unknown[]) {
  for (let index = 0; index < rows.length; index += 250) {
    const { error } = await client.from(table).insert(rows.slice(index, index + 250))
    if (error) throw new Error(`Inserting ${table}: ${error.message}`)
  }
}

async function main() {
  const file = path.resolve(arg("file"))
  const apply = process.argv.includes("--apply")
  const sourceRows = parseTrackwrestlingBoutCsv(fs.readFileSync(file, "utf8"))
  const parsed = parseTournament(sourceRows)

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE!,
  )
  const { data: roster, error } = await client
    .from("athletes")
    .select("id,name,wrestling_name,highschool,weightclass,graduationyear,gender")
    .eq("is_nc_athlete", true)
  if (error) throw new Error(`Loading athlete directory: ${error.message}`)

  const resolved = resolveNhscaNationalDualsProfiles(
    parsed.athletes,
    (roster ?? []) as NhscaDirectoryAthlete[],
    { eventYear: EVENT_YEAR },
  )
  const matchedByEntrant = new Map(
    resolved.matches.map((row) => [nhscaDualsEntrantKey(row.source.athleteName, row.source.club), row.athlete]),
  )
  const reviewByEntrant = new Map(
    resolved.review.map((row) => [nhscaDualsEntrantKey(row.name, row.team), row]),
  )
  const selected = parsed.athletes.filter((row) => {
    const key = nhscaDualsEntrantKey(row.athleteName, row.club)
    return matchedByEntrant.has(key) || reviewByEntrant.has(key)
  })

  const resultRows = selected.map((row) => {
    const key = nhscaDualsEntrantKey(row.athleteName, row.club)
    const athlete = matchedByEntrant.get(key)
    return {
      event_key: EVENT_KEY,
      event_name: EVENT_NAME,
      event_short_name: "NHSCA National Duals",
      event_state: "VA",
      event_date: EVENT_DATE,
      year: EVENT_YEAR,
      athlete_name: row.athleteName,
      athlete_id: athlete?.id ?? null,
      club: row.club,
      high_school: athlete?.highschool ?? null,
      gender: athlete?.gender ?? null,
      weight_class: row.weightClass,
      wins: row.wins,
      losses: row.losses,
      byes: row.byes,
      record: row.record,
      placement: null,
      qualified: false,
      entrants: null,
      source_file: path.basename(file),
      verification_status: athlete ? "verified" : "needs_review",
    }
  })

  const boutRows = parsed.bouts.flatMap((bout) => {
    const selfKey = nhscaDualsEntrantKey(bout.athleteName, bout.athleteClub)
    if (!matchedByEntrant.has(selfKey) && !reviewByEntrant.has(selfKey)) return []
    const self = matchedByEntrant.get(selfKey)
    const opponent = bout.opponentName
      ? matchedByEntrant.get(nhscaDualsEntrantKey(bout.opponentName, bout.opponentClub ?? ""))
      : undefined
    return [{
      event_key: EVENT_KEY,
      event_name: EVENT_NAME,
      event_date: EVENT_DATE,
      year: EVENT_YEAR,
      weight_class: bout.weightClass,
      round: bout.round,
      source_round: bout.sourceRound,
      bout_order: bout.boutOrder,
      athlete_name: bout.athleteName,
      athlete_id: self?.id ?? null,
      athlete_club: bout.athleteClub,
      opponent_name: bout.opponentName,
      opponent_id: opponent?.id ?? null,
      opponent_club: bout.opponentClub,
      win: bout.win,
      is_bye: bout.isBye,
      win_type: bout.winType,
      score: bout.score,
      source_file: path.basename(file),
    }]
  })

  console.log(`Source: ${sourceRows.length} bouts, ${parsed.athletes.length} entrants`)
  console.log(`Verified profile matches: ${resolved.matches.length}`)
  for (const row of resolved.matches) {
    console.log(`  ✓ ${row.source.athleteName} — ${row.source.club}, ${row.source.weightClass}, ${row.source.record}`)
  }
  console.log(`Needs review: ${resolved.review.length}`)
  for (const row of resolved.review) {
    console.log(`  ? ${row.name} — ${row.team}, ${row.weight}: ${row.reason}`)
  }
  console.log(`${apply ? "Writing" : "DRY RUN — would write"} ${resultRows.length} results and ${boutRows.length} athlete-bout rows`)
  if (!apply) return

  // This event owns its key. A corrected source can be safely re-run without duplicates.
  for (const table of ["other_tournament_bouts", "other_tournament_results"]) {
    const { error: deleteError } = await client.from(table).delete().eq("event_key", EVENT_KEY)
    if (deleteError) throw new Error(`Clearing ${table}: ${deleteError.message}`)
  }
  await insertChunks(client, "other_tournament_results", resultRows)
  await insertChunks(client, "other_tournament_bouts", boutRows)
  console.log(`Imported ${resolved.matches.length} verified profiles; ${resolved.review.length} unlinked rows await review.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
