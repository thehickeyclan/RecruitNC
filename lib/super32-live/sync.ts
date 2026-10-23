/**
 * On publish, Super 32 2026 results go where the rest of the site reads them:
 *
 * - `other_tournament_bouts` under `super32-2026`: every high school bout, all states, one row per
 *   wrestler per bout, as the 2025 import stored them. The coach starred-wrestler report reads the
 *   whole bracket from here (opponent credentials, placement rounds), so the full field goes in;
 *   NC wrestlers carry their profile id.
 * - `super32_results` for 2026: one row per linked NC wrestler, the record and placement a profile
 *   and the ranking formula read.
 *
 * Both are replaced whole on every publish, so a corrected export corrects the site.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { parseFloExport, roundOrder, samePerson, splitDivisions, type SeedRow } from "./engine"
import type { SnapshotData } from "./snapshot"

export const SYNC_SOURCE_FILE = "super32-2026-live.csv"
const EVENT_NAME = "2026 Super 32"
const EVENT_DATE = "2026-10-24"
const YEAR = 2026

export async function syncResults(
  supabase: SupabaseClient,
  eventKey: string,
  floContent: string,
  seeds: SeedRow[],
  snapshot: SnapshotData,
): Promise<{ bouts: number; results: number }> {
  const rows = buildBoutRows(eventKey, floContent, seeds, snapshot)
  const linked = snapshot.entrants.filter((e) => e.athleteId)

  const del = await supabase.from("other_tournament_bouts").delete().eq("event_key", eventKey).eq("source_file", SYNC_SOURCE_FILE)
  if (del.error) throw new Error(`clearing bouts: ${del.error.message}`)
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("other_tournament_bouts").insert(rows.slice(i, i + 500))
    if (error) throw new Error(`writing bouts: ${error.message}`)
  }

  const results = linked
    .filter((e) => e.wins + e.losses > 0)
    .map((e) => ({
      athlete_name: e.name, year: YEAR, weight_class: e.weight, placement: e.placement, wins: e.wins, losses: e.losses,
      record: `${e.wins}-${e.losses}`, high_school: e.school, school: e.school, state: "NC", seed: e.seed,
      // Matches the table as filled: girls "F", boys left null.
      gender: e.gender === "girls" ? "F" : null, athlete_id: e.athleteId,
    }))
  const delR = await supabase.from("super32_results").delete().eq("year", YEAR)
  if (delR.error) throw new Error(`clearing results: ${delR.error.message}`)
  if (results.length) {
    const { error } = await supabase.from("super32_results").insert(results)
    if (error) throw new Error(`writing results: ${error.message}`)
  }
  return { bouts: rows.length, results: results.length }
}

/** One row per wrestler per bout, every high school bracket, NC wrestlers linked. Pure. */
export function buildBoutRows(eventKey: string, floContent: string, seeds: SeedRow[], snapshot: SnapshotData): Record<string, unknown>[] {
  const split = splitDivisions(parseFloExport(floContent), seeds.map((s) => ({ gender: s.gender, weight: s.weight, name: s.name, state: s.state })))
  const linked = snapshot.entrants.filter((e) => e.athleteId)
  const idFor = (name: string, team: string, gender: string, weight: string) =>
    team.toUpperCase() === "NC"
      ? linked.find((e) => e.gender === gender && e.weight === weight && samePerson(e, { name, state: team }))?.athleteId ?? null
      : null

  const rows: Record<string, unknown>[] = []
  for (const b of split.bouts) {
    const base = {
      event_key: eventKey, event_name: EVENT_NAME, year: YEAR, weight_class: b.weight, round: b.round, source_round: b.round,
      bout_order: Math.round(roundOrder(b.round) * 10), win_type: b.winType || null, score: b.result || null,
      source_file: SYNC_SOURCE_FILE, event_date: EVENT_DATE, gender: b.gender === "girls" ? "F" : "M",
    }
    const isBye = !b.loser || /^bye$/i.test(b.winType)
    rows.push({ ...base, athlete_name: b.winner, athlete_id: idFor(b.winner, b.winnerTeam, b.gender, b.weight), athlete_club: b.winnerTeam,
      opponent_name: isBye ? null : b.loser, opponent_id: null, opponent_club: isBye ? null : b.loserTeam, win: true, is_bye: isBye })
    if (!isBye) {
      rows.push({ ...base, athlete_name: b.loser, athlete_id: idFor(b.loser, b.loserTeam, b.gender, b.weight), athlete_club: b.loserTeam,
        opponent_name: b.winner, opponent_id: null, opponent_club: b.winnerTeam, win: false, is_bye: false })
    }
  }

  return rows
}
