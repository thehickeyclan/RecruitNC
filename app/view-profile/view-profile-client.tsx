"use client"

import { isInternationalStyle, styleOfEvent, summarizeCompetition } from "@/lib/wrestling-style"
import { SignificantWinsSection } from "@/components/significant-wins-section"
import Link from "next/link"
import { ArrowLeft, Medal, Trophy } from "lucide-react"
import { AthleteDetail } from "@/components/athlete-detail"
import { TournamentAccordion, buildNchsaaStateRows, buildTournamentRows, isTocRow } from "@/components/profile/tournament-accordion"
import { ProfileViewTracker } from "@/components/profile-view-tracker"
import { useAuth } from "@/contexts/auth-context"
import type { PublicAthleteProfile } from "@/lib/load-public-athlete-profile"
import { profileCredentials } from "@/lib/profile/credentials"
import type { TournamentRow } from "@/lib/profile/tournament-rows"

/**
 * "2026 NC Freestyle & Greco State Championships - 16U Boys Freestyle" -> "NC Freestyle & Greco
 * States · 16U Freestyle", so the Olympic rows read like the Fargo ones ("Fargo · Freestyle").
 */
function shortOlympicEvent(event: string): string {
  const [rawName, rawDivision] = event.replace(/^\d{4}\s+/, "").split(" - ")
  if (!rawDivision) return rawName
  const name = rawName.replace(/State Championships$/i, "States")
  let division = rawDivision.replace(/\bBoys\s+/i, "").replace(/\bGreco\b(?!-)/i, "Greco-Roman").trim()
  const age = division.match(/^(16U|Junior)\s+/i)
  if (age && new RegExp(`\\b${age[1]}\\b`, "i").test(name)) division = division.slice(age[0].length)
  return `${name} · ${division}`
}

type NchsaaResult = { year: number; place: number | null; classification: string; weight_class: string }

type ViewProfileClientProps = {
  id: string
  initialAthlete: PublicAthleteProfile | null
  initialError: string | null
  /** Resolved on the server, so it is right even where the browser holds no session cookie. */
  initialUserId: string | null
}

export function ViewProfileClient({
  id,
  initialAthlete,
  initialError,
  initialUserId,
}: ViewProfileClientProps) {
  const { user } = useAuth()
  /**
   * The server's answer wins, and the client's only adds to it.
   *
   * `useAuth` reads the session in the browser, which is empty inside an in-app browser even
   * when the person is signed in — that is what left wrestlers on a page with no edit controls
   * and nothing to press. The client value still matters for someone who signs in without a
   * reload, so it is a fallback rather than a replacement.
   */
  const viewerId = initialUserId ?? user?.id ?? null
  const athlete = initialAthlete
  const error = initialError

  if (error || !athlete) {
    return (
      <main className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-white/10 bg-[#0f1c2e] p-6">
          <h1 className="text-xl font-bold text-white mb-2">Profile not found</h1>
          <p className="text-sm text-red-400 font-mono mb-4">{error ?? "No data"}</p>
          <div className="flex flex-wrap gap-4">
            <a href={`/view-profile?id=${encodeURIComponent(id)}`} className="text-[#D3B574] underline">
              Try again
            </a>
            <a href="/prospects/all" className="text-[#D3B574] underline">
              Browse athletes
            </a>
          </div>
        </div>
      </main>
    )
  }

  const nchsaaResults = Array.isArray(athlete.nchsaa_profile) ? (athlete.nchsaa_profile as NchsaaResult[]) : []
  const nchsaaStateBouts = Array.isArray(athlete.nchsaa_state_bouts) ? athlete.nchsaa_state_bouts : []
  const nhscaResults = Array.isArray(athlete.nhsca_results) ? athlete.nhsca_results : []
  const super32Results = Array.isArray(athlete.super32_results) ? athlete.super32_results : []
  const fargoResults = Array.isArray(athlete.fargo_results) ? athlete.fargo_results : []
  const otherTournamentBlocks = Array.isArray(athlete.other_tournament_blocks)
    ? athlete.other_tournament_blocks
    : []
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
  const stateTournamentRows = buildNchsaaStateRows(nchsaaResults, nchsaaStateBouts)
  // Every event on the record, bouts included (NC United duals and Fargo Greco have no results row).
  // A North Carolina wrestler has a folkstyle season whatever else he wrestles.
  const competition = summarizeCompetition(
    [...profileTournamentRows, ...stateTournamentRows].flatMap((row) => [
      `${row.event} ${row.team ?? ""}`,
      ...row.bouts.map((b) => b.eventName),
    ]),
    athlete.is_nc_athlete !== false,
  )
  const athleteName = String(athlete.name ?? "Athlete")
  // Freestyle and Greco-Roman go in their own section, last on the page; folkstyle keeps the rest.
  const isOlympicRow = (row: { event: string; team: string | null }) => isInternationalStyle(styleOfEvent(row.event, row.team))
  const folkstyleRows = profileTournamentRows.filter((row) => !isOlympicRow(row))
  const olympicRows: TournamentRow[] = profileTournamentRows
    .filter(isOlympicRow)
    .map((row) => ({ ...row, event: shortOlympicEvent(row.event) }))
  const tocRows = folkstyleRows.filter(isTocRow)
  const credentials = profileCredentials({
    stateRows: stateTournamentRows,
    tocRows,
    tournamentRows: profileTournamentRows,
  })

  return (
    <main className="min-h-screen bg-[#0A1628]">
      <div className="border-b border-white/10 bg-[#0A1628]">
        <div className="container mx-auto px-4 py-3">
          <Link
            href="/prospects/all"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#D3B574] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Athletes
          </Link>
        </div>
      </div>

      <div className="container mx-auto min-w-0 max-w-full px-4 py-4 lg:py-8">
        <ProfileViewTracker athleteId={String(athlete.id)} athleteName={athleteName} />
        <AthleteDetail
          theme="dark"
          mobileRecruiterLayout
          competition={competition}
          credentials={credentials}
          olympicStylesSection={
            olympicRows.length ? (
              <div className="w-full min-w-0 max-w-full space-y-6" id="olympic-styles">
                <TournamentAccordion
                  theme="dark"
                  sectionId="olympic-styles-results"
                  title="Olympic Styles — Freestyle & Greco-Roman"
                  subtitle="USA Wrestling events — not folkstyle"
                  rows={olympicRows}
                  duelsLabel="Dual results"
                />
                <SignificantWinsSection athleteId={String(athlete.id)} styles="olympic" />
              </div>
            ) : null
          }
          athlete={athlete as unknown as Parameters<typeof AthleteDetail>[0]["athlete"]}
          nchsaaResults={nchsaaResults.map((r) => ({
            ...r,
            place: r.place ?? 0,
          }))}
          currentUserId={viewerId}
          tournamentResultsComponent={
            <div className="w-full min-w-0 max-w-full space-y-6">
              {/* In-state first: the Tournament of Champions, then NCHSAA States (Matt). Then the
                  national folkstyle events as one collapsed list. See tournament-accordion. */}
              <div id="in-state" className="space-y-6">
                <TournamentAccordion
                  theme="dark"
                  sectionId="toc"
                  icon={Trophy}
                  title="Tournament of Champions"
                  subtitle="North Carolina's invitational championship"
                  rows={tocRows}
                  hideWhenEmpty
                />
                <TournamentAccordion
                  rows={stateTournamentRows}
                  theme="dark"
                  sectionId="nchsaa-states"
                  icon={Medal}
                  title="NCHSAA State Championships"
                  subtitle="Folkstyle — the North Carolina high school state tournament"
                  emptyText="No NCHSAA state results recorded"
                />
              </div>
              <TournamentAccordion
                theme="dark"
                sectionId="tournaments"
                title="National Tournaments — Folkstyle"
                subtitle="Super 32, NHSCA, Journeymen, duals and open events"
                rows={folkstyleRows.filter((row) => !isTocRow(row))}
              />
            </div>
          }
        />
      </div>
    </main>
  )
}
