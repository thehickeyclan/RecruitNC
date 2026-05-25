"use client"

import Image from "next/image"
import { Award, Star, Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { getSummaryForScope, getWrestlersForScope } from "@/lib/nhsca-duals-command-center"
import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import type { PublicHeroStats } from "@/lib/nhsca-duals-public-hero-stats"
import {
  buildHeroStatTiles,
  NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT,
  scopeAchievementLine,
  scopeShowsNationalAchievement,
  scopeSubheadline,
  scopeTeamLabel,
} from "@/lib/nhsca-duals-public-hero-stats"
import {
  dualRecordForMow,
  mowPhotoCaption,
  mowsForScope,
  NHSCA_DUALS_2026_MOW_PHOTO,
  weightLabel,
} from "@/lib/nhsca-duals-2026-most-outstanding-wrestlers"
import { tournamentMomentsForScope } from "@/lib/nhsca-duals-2026-tournament-moments"
import { NhscaDualsTournamentMomentMedia } from "@/components/national-team/nhsca-duals-tournament-moment-media"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import { cn } from "@/lib/utils"

export function NhscaDuals2026RecapSections({
  scope,
  snapshot,
  heroStats,
}: {
  scope: CommandCenterScope
  snapshot: NhscaDualsResultsSnapshot | null
  heroStats: PublicHeroStats | null
}) {
  const summary = snapshot ? getSummaryForScope(snapshot, scope) : null
  const records = snapshot ? getWrestlersForScope(snapshot, scope) : []

  const winPctLabel =
    heroStats?.winPct != null ? `${heroStats.winPct}% individual win rate` : "individual results updating live"

  const highlightRows = heroStats ? buildHeroStatTiles(heroStats, scope) : []
  const achievementLine = scopeAchievementLine(scope)
  const mows = mowsForScope(scope)
  const tournamentMoments = tournamentMomentsForScope(scope)
  const mowMention =
    mows.length === 2
      ? " Most Outstanding Wrestler honors went to Tobin McNair (National, 160 lbs) and Danny McDermott (Select, 120 lbs)."
      : mows.length === 1
        ? ` ${mows[0].name} (${weightLabel(mows[0].weightClass)}) was named ${mows[0].team === "national" ? "National" : "Select"} team Most Outstanding Wrestler.`
        : ""

  const showHighlightsGrid = (summary && heroStats) || mows.length > 0

  return (
    <section id="recap" className="scroll-mt-28 mb-10 sm:mb-14 space-y-8 sm:space-y-10">
      {/* Narrative */}
      <div className="border-l-4 border-[#CBAF5D] pl-4 sm:pl-6">
        <p className="text-sm sm:text-base md:text-lg leading-relaxed text-white/80">
          {scopeTeamLabel(scope)} represented North Carolina at the 2026 NHSCA National Duals in Virginia Beach.
          {scopeShowsNationalAchievement(scope) ? (
            <>
              {" "}
              The National squad advanced to the{" "}
              <strong className="text-white font-semibold">{NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT}</strong>
              {scope === "all" ? ", while the Select team competed on the same national stage" : ""}.
            </>
          ) : null}
          {heroStats && heroStats.dualRecord !== "0-0" ? (
            <>
              {" "}
              NC United posted a{" "}
              <strong className="text-white font-semibold">{heroStats.dualRecord}</strong> dual meet record and a{" "}
              <strong className="text-white font-semibold">{heroStats.individual}</strong> mark in individual bouts
              {heroStats.winPct != null ? (
                <>
                  {" "}
                  — a <strong className="text-white font-semibold">{heroStats.winPct}%</strong> win rate on the mat.
                </>
              ) : (
                "."
              )}
            </>
          ) : !scopeShowsNationalAchievement(scope) ? (
            " Full dual and bout results update below as matches are entered."
          ) : null}
          {mowMention}
        </p>
      </div>

      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-3 sm:mb-4">
          Tournament performance
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-white/65 max-w-3xl">
          NC United brought depth across the lineup — from lightweights to heavyweights — with{" "}
          {scopeSubheadline(scope).toLowerCase()}. Explore every dual, athlete record, and highlighted win below.
          {heroStats && heroStats.teamPoints > 0 ? (
            <>
              {" "}
              The squad scored <strong className="text-white/90">{heroStats.teamPoints}</strong> total team points
              across all bouts.
            </>
          ) : null}
        </p>
      </div>

      {/* Highlights + MOW — 2025 two-column pattern */}
      {showHighlightsGrid ? (
        <div
          className={cn(
            "grid gap-4 sm:gap-6",
            heroStats && mows.length > 0 ? "md:grid-cols-2" : "max-w-xl"
          )}
        >
          {heroStats ? (
            <Card className="border-white/15 bg-[#0a2040]/70 shadow-lg">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-5">
                  <Trophy className="w-7 h-7 text-[#CBAF5D] shrink-0" aria-hidden />
                  <h3 className="text-lg sm:text-xl font-bold text-white">Tournament highlights</h3>
                </div>
                <ul className="space-y-2.5">
                  {highlightRows.map((row) => (
                    <li
                      key={row.label}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#002147]/45 px-3 py-2.5"
                    >
                      <span className="text-sm font-semibold text-white/75">{row.label}</span>
                      <span className="text-sm font-black tabular-nums text-[#CBAF5D]">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {mows.length > 0 ? (
            <Card className="border-[#CBAF5D]/25 bg-[#0a2040]/70 shadow-lg">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-5">
                  <Award className="w-7 h-7 text-[#CBAF5D] shrink-0" aria-hidden />
                  <h3 className="text-lg sm:text-xl font-bold text-white">Most Outstanding Wrestlers</h3>
                </div>
                <ul className="space-y-2.5">
                  {mows.map((mow) => {
                    const record = dualRecordForMow(mow, records)
                    return (
                      <li
                        key={mow.id}
                        className="rounded-lg border border-[#CBAF5D]/20 bg-[#002147]/45 px-3 py-3"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#CBAF5D] mb-1">
                          {mow.team === "national" ? "National team" : "Select team"}
                        </p>
                        <p className="text-base sm:text-lg font-black text-white">{mow.name}</p>
                        <p className="text-xs text-white/50 tabular-nums mt-0.5">
                          {weightLabel(mow.weightClass)}
                          {record ? ` · ${record} dual record` : ""}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* MOW photo — 2025 action-shot pattern */}
      {mows.length > 0 ? (
        <div id="mow" className="scroll-mt-28">
          <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-xl overflow-hidden border border-white/10">
            <Image
              src={NHSCA_DUALS_2026_MOW_PHOTO}
              alt={
                scope === "all"
                  ? "Tobin McNair and Danny McDermott, NC United Most Outstanding Wrestlers at NHSCA Duals 2026"
                  : `${mows[0].name}, NC United Most Outstanding Wrestler at NHSCA Duals 2026`
              }
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 1024px"
            />
          </div>
          <p className="text-center text-sm text-white/55 italic mt-4 max-w-2xl mx-auto leading-relaxed">
            {mowPhotoCaption(scope)}
          </p>
        </div>
      ) : null}

      {/* Tournament moments — video, team photos & candid shots */}
      {tournamentMoments.length > 0 ? (
        <div className="space-y-8">
          {tournamentMoments.map((moment) => (
            <figure key={moment.id} id={moment.id === "day-2-palmer-recap" ? "day-2-recap" : undefined}>
              <NhscaDualsTournamentMomentMedia moment={moment} />
              <figcaption className="text-center text-sm text-white/55 italic mt-4 max-w-2xl mx-auto leading-relaxed">
                {moment.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {/* Summary callout */}
      {heroStats && (heroStats.dualRecord !== "0-0" || achievementLine) ? (
        <div className="rounded-xl border border-white/10 bg-[#002147]/40 px-4 sm:px-6 py-4 sm:py-5">
          {achievementLine ? (
            <p className="text-base sm:text-lg font-bold text-[#CBAF5D] mb-1">{achievementLine}</p>
          ) : null}
          {heroStats.dualRecord !== "0-0" ? (
            <>
              <p className="text-base sm:text-lg font-semibold text-white mb-1">
                Overall dual record: {heroStats.dualRecord}
              </p>
              <p className="text-sm sm:text-base text-white/65">{winPctLabel}</p>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export function NhscaDuals2026ClosingSection() {
  return (
    <section className="mb-10 sm:mb-14 space-y-4 sm:space-y-6">
      <Card className="border-[#CBAF5D]/25 bg-[#0a2040]/80 shadow-lg">
        <CardContent className="p-5 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-7 h-7 text-[#CBAF5D] shrink-0" aria-hidden />
            <h2 className="text-xl sm:text-2xl font-bold text-white">Coaching &amp; leadership</h2>
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-white/75 mb-4">
            NC United was led by an exceptional coaching staff including Michael Macchiavello, Colton Palmer, and
            Araad Fischer — plus club coaches who supported the team in every corner and on the mat throughout the
            tournament.
          </p>
          <p className="text-sm sm:text-base leading-relaxed text-white/75">
            Special thanks to every parent, supporter, and club program that helped our National and Select squads
            compete at the highest level in Virginia Beach.
          </p>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-gradient-to-br from-[#002147] to-[#0a2040] shadow-lg">
        <CardContent className="p-5 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Looking ahead</h2>
          <p className="text-sm sm:text-base leading-relaxed text-white/80 mb-4">
            NHSCA Duals is a proving ground for North Carolina wrestling — and another step forward for NC United.
            Thank you for following along with every dual, bout, and big win.
          </p>
          <p className="text-lg sm:text-xl font-bold text-[#CBAF5D]">The best is yet to come for NC United Wrestling.</p>
        </CardContent>
      </Card>
    </section>
  )
}
