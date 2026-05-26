"use client"

import Image from "next/image"
import { Award, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { getWrestlersForScope } from "@/lib/nhsca-duals-command-center"
import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import {
  NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT,
  NHSCA_DUALS_2026_SELECT_ACHIEVEMENT,
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

export function NhscaDuals2026RecapSections({
  scope,
  snapshot,
}: {
  scope: CommandCenterScope
  snapshot: NhscaDualsResultsSnapshot | null
}) {
  const records = snapshot ? getWrestlersForScope(snapshot, scope) : []

  const mows = mowsForScope(scope)
  const tournamentMoments = tournamentMomentsForScope(scope)
  const mowMention =
    mows.length === 2
      ? " Most Outstanding Wrestler honors went to Tobin McNair (National, 160 lbs) and Danny McDermott (Select, 120 lbs)."
      : mows.length === 1
        ? ` ${mows[0].name} (${weightLabel(mows[0].weightClass)}) was named ${mows[0].team === "national" ? "National" : "Select"} team Most Outstanding Wrestler.`
        : ""

  const showMowGrid = mows.length > 0

  return (
    <section id="recap" className="scroll-mt-28 mb-10 sm:mb-14 space-y-8 sm:space-y-10">
      {/* Narrative */}
      <div className="border-l-4 border-[#CBAF5D] pl-4 sm:pl-6">
        <p className="text-sm sm:text-base md:text-lg leading-relaxed text-white/80">
          {scopeTeamLabel(scope)} represented North Carolina at the 2026 NHSCA National Duals in Virginia Beach.
          {scope === "all" ? (
            <>
              {" "}
              The National squad advanced to the{" "}
              <strong className="text-white font-semibold">{NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT}</strong>, while the
              Select team also advanced to the{" "}
              <strong className="text-white font-semibold">{NHSCA_DUALS_2026_SELECT_ACHIEVEMENT}</strong> in Day 3
              competition.
            </>
          ) : scope === "national" ? (
            <>
              {" "}
              The National squad advanced to the{" "}
              <strong className="text-white font-semibold">{NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT}</strong>.
            </>
          ) : (
            <>
              {" "}
              The Select team advanced to the{" "}
              <strong className="text-white font-semibold">{NHSCA_DUALS_2026_SELECT_ACHIEVEMENT}</strong> in Day 3
              competition.
            </>
          )}
          {mowMention}
        </p>
      </div>

      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-3 sm:mb-4">
          Tournament performance
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-white/65 max-w-3xl">
          NC United brought depth across the lineup — from lightweights to heavyweights. Use{" "}
          <a href="#results" className="text-[#CBAF5D] font-semibold hover:underline">
            Results
          </a>{" "}
          below to filter National or Select team duals and individual athlete records.
        </p>
      </div>

      {/* MOW cards */}
      {showMowGrid ? (
        <div className="max-w-xl">
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
        </div>
      ) : null}

      {/* MOW photo — portrait shot; keep compact on desktop */}
      {mows.length > 0 ? (
        <div id="mow" className="scroll-mt-28 w-full max-w-[280px] sm:max-w-[320px] mx-auto">
          <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-[#002147]/40">
            <Image
              src={NHSCA_DUALS_2026_MOW_PHOTO}
              alt={
                scope === "all"
                  ? "Tobin McNair and Danny McDermott, NC United Most Outstanding Wrestlers at NHSCA Duals 2026"
                  : `${mows[0].name}, NC United Most Outstanding Wrestler at NHSCA Duals 2026`
              }
              fill
              className="object-cover"
              style={{ objectPosition: "center 12%" }}
              sizes="(max-width: 640px) 280px, 320px"
            />
          </div>
          <p className="text-center text-sm text-white/55 italic mt-4 leading-relaxed">
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
