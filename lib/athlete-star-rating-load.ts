/**
 * Assembles a real athlete into a `StarRatingInput`.
 *
 * The rating engine shipped with tests and no caller, so no wrestler had ever been rated with
 * live data. This is the missing half: it reads the same tables the profile and the scouting
 * report already read, and hands `rateAthlete` the four axes.
 *
 * Nothing here judges anything. Every value traces to a row on file, and a missing source
 * yields an absent axis rather than a zero — the engine scores absence as absence, so a
 * wrestler with no national events is not penalised for the events they did not enter.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { loadAthleteTournamentBundle, type AthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import {
  summarizeNationalExposure,
  summarizeSeasonStrength,
  type NationalEventRow,
} from "@/lib/competition-strength"
import { rateAthlete, type StarRating, type StarRatingInput } from "@/lib/athlete-star-rating"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import { latestSeasonMatchRows } from "@/lib/toc/ai-seeding"
import type { HeadToHeadBout } from "@/lib/head-to-head"

/** Placement strings are "1st", "3rd", "Champion", "R16" — only a finish counts. */
export function placementNumber(raw: string | null | undefined): number | null {
  const s = String(raw ?? "").trim()
  if (!s) return null
  if (/champ/i.test(s)) return 1
  if (/runner|finalist/i.test(s)) return 2
  const m = s.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\b/)
  if (!m) return null
  const n = Number(m[1])
  // A national bracket pays placement to eighth; beyond that it is a round, not a place.
  return Number.isFinite(n) && n >= 1 && n <= 8 ? n : null
}

/**
 * The national events on file, newest first.
 *
 * NHSCA, Super 32, Fargo and the Super 32 qualifiers. Deliberately excludes NCHSAA — that is
 * the state axis, and counting it twice would let one strong state run carry two components.
 */
export function nationalEventRows(bundle: AthleteTournamentBundle): NationalEventRow[] {
  const rows: NationalEventRow[] = []
  for (const r of bundle.nhsca ?? []) {
    rows.push({ event: "NHSCA Nationals", year: Number(r.year), placement: placementNumber(r.placement), record: r.record ?? null })
  }
  for (const r of bundle.super32 ?? []) {
    rows.push({ event: "Super 32", year: Number(r.year), placement: placementNumber(r.placement), record: r.record ?? null })
  }
  for (const r of bundle.fargo ?? []) {
    rows.push({ event: "Fargo Nationals", year: Number(r.year), placement: placementNumber(r.placement), record: r.record ?? null })
  }
  for (const r of bundle.other ?? []) {
    rows.push({
      event: r.eventShortName || "Qualifier",
      year: Number(r.year),
      placement: r.placement ?? null,
      record: r.record ?? null,
    })
  }
  return rows
    .filter((r) => Number.isFinite(r.year))
    .sort((a, b) => b.year - a.year)
}

/** NCHSAA finishing places across every year on file. */
export function statePlaces(bundle: AthleteTournamentBundle): Array<number | null> {
  return (bundle.nchsaa ?? []).map((row) => {
    const place = (row as { place?: number | null }).place
    return place == null ? null : Number(place)
  })
}

/** The season's bouts, parsed out of the `matches` JSON column. */
export function parseSeasonBouts(rows: ReadonlyArray<{ matches?: unknown }>): HeadToHeadBout[] {
  return latestSeasonMatchRows(rows as never).flatMap((row) => {
    try {
      const value = (row as { matches?: unknown }).matches
      return Array.isArray(value) ? value : JSON.parse(String(value ?? "[]"))
    } catch {
      return []
    }
  })
}

export type RatedAthlete = {
  athleteId: string
  name: string
  graduationYear: number | null
  weightClass: string | null
  rating: StarRating
}

/**
 * Everything the rating needs for one athlete.
 *
 * `nationallyRanked` is passed in rather than queried per athlete: rating a field means one
 * lookup of the ranked ids, not one per wrestler.
 */
export async function loadStarRatingInput(
  supabase: SupabaseClient,
  athlete: Record<string, unknown>,
  nationallyRankedIds: ReadonlySet<string>,
): Promise<StarRatingInput> {
  const athleteId = String(athlete.id)
  const [bundle, { data: matchRows }] = await Promise.all([
    loadAthleteTournamentBundle(supabase, athlete),
    supabase.from("matches").select("season,matches").eq("athlete_id", athleteId),
  ])

  const gradYear = athlete.graduationyear == null ? null : Number(athlete.graduationyear)
  const rawRank = athlete.prospect_ranking == null ? null : Number(athlete.prospect_ranking)
  const prospectRanking = rawRank != null && Number.isFinite(rawRank) && rawRank >= 1 ? rawRank : null

  return {
    exposure: summarizeNationalExposure(nationalEventRows(bundle as AthleteTournamentBundle)),
    strength: summarizeSeasonStrength(parseSeasonBouts(matchRows ?? [])),
    prospectRanking,
    rankingPublished:
      prospectRanking != null &&
      isPublicRankingsYearPublished(gradYear) &&
      prospectRanking <= getPublicRankingsMax(gradYear),
    statePlaces: statePlaces(bundle as AthleteTournamentBundle),
    nationallyRanked: nationallyRankedIds.has(athleteId),
  }
}

/** Load and rate one athlete. */
export async function rateOneAthlete(
  supabase: SupabaseClient,
  athlete: Record<string, unknown>,
  nationallyRankedIds: ReadonlySet<string>,
): Promise<RatedAthlete> {
  const input = await loadStarRatingInput(supabase, athlete, nationallyRankedIds)
  return {
    athleteId: String(athlete.id),
    name: String(athlete.name ?? "Athlete"),
    graduationYear: athlete.graduationyear == null ? null : Number(athlete.graduationyear),
    weightClass: athlete.weightclass == null ? null : String(athlete.weightclass),
    rating: rateAthlete(input),
  }
}
