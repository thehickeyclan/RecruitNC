/**
 * A profile's record rows and the competition facts read from them - assembled once, here, so the
 * page and anything server-side that must say the same thing (the coach event report's Strength of
 * Competition) cannot drift apart.
 *
 * Moved out of app/view-profile/view-profile-client.tsx unchanged. Pure: give it the payload
 * loadPublicAthleteProfile returns and it does no reads of its own.
 */

import type { PublicAthleteProfile } from "@/lib/load-public-athlete-profile"
import { buildCompetitionGrade, type CompetitionGrade } from "@/lib/competition-grade"
import { accoladesFrom, offSeasonEvents, type Accolades } from "@/lib/profile/profile-summary"
import { buildNchsaaStateRows, buildTournamentRows, type TournamentRow } from "@/lib/profile/tournament-rows"
import { isNationalEvent, summarizeCompetition } from "@/lib/wrestling-style"

type NchsaaResult = { year: number; place: number | null; classification: string; weight_class: string }

export type ProfileSummaryFacts = { accolades: Accolades; offSeasonEvents: number; offSeasonCareer: number }

export type ProfileRecord = {
  nchsaaResults: NchsaaResult[]
  /** Every non-state tournament on the record, bouts attached. */
  profileTournamentRows: TournamentRow[]
  stateTournamentRows: TournamentRow[]
  competition: ReturnType<typeof summarizeCompetition>
  summaryFacts: ProfileSummaryFacts
}

export function buildProfileRecord(athlete: PublicAthleteProfile): ProfileRecord {
  const nchsaaResults = Array.isArray(athlete.nchsaa_profile) ? (athlete.nchsaa_profile as NchsaaResult[]) : []
  const nchsaaStateBouts = Array.isArray(athlete.nchsaa_state_bouts) ? athlete.nchsaa_state_bouts : []
  const nhscaResults = Array.isArray(athlete.nhsca_results) ? athlete.nhsca_results : []
  const super32Results = Array.isArray(athlete.super32_results) ? athlete.super32_results : []
  const fargoResults = Array.isArray(athlete.fargo_results) ? athlete.fargo_results : []
  const otherTournamentBlocks = Array.isArray(athlete.other_tournament_blocks) ? athlete.other_tournament_blocks : []
  const nationalTeamResults = Array.isArray(athlete.national_team_results) ? athlete.national_team_results : []

  const profileTournamentRows = buildTournamentRows({
    otherTournamentBlocks: otherTournamentBlocks as never[],
    nhscaResults: nhscaResults as never[],
    nhscaBouts: (Array.isArray(athlete.nhsca_bouts) ? athlete.nhsca_bouts : []) as never[],
    super32Results: super32Results as never[],
    super32Bouts: (Array.isArray(athlete.super32_bouts) ? athlete.super32_bouts : []) as never[],
    fargoResults: fargoResults as never[],
    nationalTeamResults: nationalTeamResults as never[],
    attachedEventBouts: (Array.isArray(athlete.attached_event_bouts) ? athlete.attached_event_bouts : []) as never[],
  })
  /* His state names his state tournament: the SCHSL does not run the NCHSAA's 4A. */
  const athleteState = (athlete as { state?: string | null })?.state ?? null
  const stateTournamentRows = buildNchsaaStateRows(nchsaaResults, nchsaaStateBouts, athleteState ?? undefined)

  // Every event on the record, bouts included (NC United duals and Fargo Greco have no results row).
  // A North Carolina wrestler has a folkstyle season whatever else they wrestle.
  const competition = summarizeCompetition(
    [...profileTournamentRows, ...stateTournamentRows].flatMap((row) => [
      `${row.event} ${row.team ?? ""}`,
      ...row.bouts.map((b) => b.eventName),
    ]),
    athlete.is_nc_athlete !== false,
    /* Girls lead with freestyle - the college standard. */
    (athlete as { gender?: string | null })?.gender,
  )

  /*
   * The facts behind the three sentences under the name (lib/profile/profile-summary.ts), from the
   * same rows the page prints: accolades, and how many events fall outside the NC season.
   */
  const summaryRows = [...profileTournamentRows, ...stateTournamentRows]
  const summaryFacts: ProfileSummaryFacts = {
    accolades: accoladesFrom({ stateRows: stateTournamentRows, tournamentRows: profileTournamentRows }),
    offSeasonEvents: offSeasonEvents(summaryRows),
    // Every national event-year on file, for the competition grade the scouting report also uses.
    offSeasonCareer: new Set(
      profileTournamentRows.filter((r) => isNationalEvent(r.event)).map((r) => `${r.event.replace(/^\d{4}\s+/, "")}|${r.year}`),
    ).size,
  }

  return { nchsaaResults, profileTournamentRows, stateTournamentRows, competition, summaryFacts }
}

/**
 * The profile's "Strength of Competition" row: the grade on lib/competition-grade.ts's scale from
 * the significant wins the profile lists (/api/athletes/[id]/significant-wins, every style), the
 * national events in its competition summary, and its national event-years.
 */
export function profileStrengthOfCompetition(input: {
  significantWins: number
  competition: { nationalEvents: readonly unknown[] } | null | undefined
  summaryFacts: { offSeasonCareer: number } | null | undefined
}): CompetitionGrade {
  return buildCompetitionGrade({
    rankedWins: input.significantWins,
    nationalEvents: input.competition?.nationalEvents.length ?? 0,
    offSeasonEvents: input.summaryFacts?.offSeasonCareer ?? 0,
  })
}
