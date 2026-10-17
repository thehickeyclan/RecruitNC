"use client"

import { buildProfileRecord } from "@/lib/profile/profile-competition"
import { isInternationalStyle, styleOfEventForAthlete } from "@/lib/wrestling-style"
import { SignificantWinsSection } from "@/components/significant-wins-section"
import { Medal, Trophy } from "lucide-react"
import { AthleteDetail } from "@/components/athlete-detail"
import { TournamentAccordion, isTocRow } from "@/components/profile/tournament-accordion"
import { ProfileViewTracker } from "@/components/profile-view-tracker"
import { ProfileBackLink } from "@/components/profile/profile-back-link"
import { useAuth } from "@/contexts/auth-context"
import type { PublicAthleteProfile } from "@/lib/load-public-athlete-profile"
import type { TournamentRow } from "@/lib/profile/tournament-rows"
import { profileCredentials } from "@/lib/profile/credentials"
import { stateChampionshipName, stateName } from "@/lib/athlete-state"
import { shortOlympicEvent } from "@/lib/profile/olympic-event"

type ViewProfileClientProps = {
  id: string
  initialAthlete: PublicAthleteProfile | null
  initialError: string | null
  /** Resolved on the server, so it is right even where the browser holds no session cookie. */
  initialUserId: string | null
  /** Set on the server for the girls' ranker on a wrestler he ranks: he may change the photo. */
  rankerMayUploadPhoto?: boolean
}

export function ViewProfileClient({
  id,
  initialAthlete,
  initialError,
  initialUserId,
  rankerMayUploadPhoto = false,
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

  /* The record rows and the competition facts read from them (lib/profile/profile-competition.ts). */
  const { nchsaaResults, profileTournamentRows, stateTournamentRows, competition, summaryFacts } = buildProfileRecord(athlete)
  /* His state names his state tournament: the SCHSL does not run the NCHSAA's 4A. */
  const athleteState = (athlete as { state?: string | null })?.state ?? null
  /*
   * The body that runs his championship, for the section heading. Taken from the classification
   * his results actually carry, so an independent-schools placer reads "SCISA", not "SCHSL".
   */
  const stateChampionshipBody = stateChampionshipName(
    athleteState,
    nchsaaResults.find((r) => String(r?.classification ?? "").trim())?.classification ?? null,
  )
  const athleteName = String(athlete.name ?? "Athlete")
  // Freestyle and Greco-Roman go in their own section, last on the page; folkstyle keeps the rest.
  // The Ultimate Club Duals are folkstyle for the boys and freestyle for the girls (Matt), so the
  // split needs to know whose record this is.
  const athleteGender = (athlete as { gender?: string | null })?.gender ?? null
  const isOlympicRow = (row: { event: string; team: string | null }) =>
    isInternationalStyle(styleOfEventForAthlete(row.event, row.team, athleteGender))
  const folkstyleRows = profileTournamentRows.filter((row) => !isOlympicRow(row))
  const olympicRows: TournamentRow[] = profileTournamentRows
    .filter(isOlympicRow)
    .map((row) => ({ ...row, event: shortOlympicEvent(row.event) }))
  const tocRows = folkstyleRows.filter(isTocRow)
  // Key finishes for the banner's cards (Matt's mock): national, TOC, NCHSAA, NC Freestyle titles.
  /*
   * The state names his state championship. Both Carolinas run a 4A, so a card reading "4A State
   * Champion" with no state tells a coach nothing he can act on.
   */
  const credentials = profileCredentials({
    stateRows: stateTournamentRows,
    tocRows,
    tournamentRows: profileTournamentRows,
    max: 6,
    state: athleteState ?? undefined,
  })

  return (
    <main className="min-h-screen bg-[#0A1628]">
      <div className="border-b border-white/10 bg-[#0A1628]">
        <div className="container mx-auto px-4 py-3">
          <ProfileBackLink className="inline-flex min-h-[44px] items-center gap-2 text-sm text-white/60 hover:text-[#D3B574] transition-colors" />
        </div>
      </div>

      <div className="container mx-auto min-w-0 max-w-full px-4 pb-4 pt-0 lg:py-8">
        <ProfileViewTracker athleteId={String(athlete.id)} athleteName={athleteName} />
        <AthleteDetail
          rankerMayUploadPhoto={rankerMayUploadPhoto}
          theme="dark"
          mobileRecruiterLayout
          competition={competition}
          credentials={credentials}
          summaryFacts={summaryFacts}
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
                <SignificantWinsSection athleteId={String(athlete.id)} styles="olympic" gender={athleteGender} />
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
                  /*
                   * His state's tournament, named after it. "NCHSAA State Championships" over a
                   * South Carolina wrestler's SCHSL titles names a tournament he was never at —
                   * the rows below the heading already said SCHSL and the heading contradicted
                   * them.
                   */
                  title={`${stateChampionshipBody} State Championships`}
                  subtitle={`Folkstyle — the ${stateName(athleteState) || "North Carolina"} high school state tournament`}
                  emptyText={`No ${stateChampionshipBody} state results recorded`}
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
