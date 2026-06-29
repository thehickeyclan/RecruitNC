"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { ArrowLeft, Calendar, MapPin, Search, Trophy, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { HardLink } from "@/components/hard-link"
import {
  AAU_SCHOLASTIC_DUALS_2026_DUALS,
  AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS,
  AAU_SCHOLASTIC_DUALS_2026_MOW_SPOTLIGHTS,
  AAU_SCHOLASTIC_DUALS_2026_RECAP_PARAGRAPHS,
  AAU_SCHOLASTIC_DUALS_2026_RESULTS_META,
  AAU_SCHOLASTIC_DUALS_2026_RESULTS_PUBLISHED,
  AAU_SCHOLASTIC_DUALS_2026_TEAM_SUMMARY,
  AAU_SCHOLASTIC_DUALS_2026_TEAM_TROPHY,
  AAU_SCHOLASTIC_DUALS_2026_TEAM_VICTORY_PHOTO,
  AAU_SCHOLASTIC_DUALS_2026_HIGHLIGHT_VIDEOS,
  AAU_SCHOLASTIC_INDIVIDUAL_STATS_FOOTNOTE,
  AAU_SCHOLASTIC_DUALS_2026_WIN_TYPES,
  aauIndividualWinPct,
  sortAauDuals,
  sortAauIndividualsByWeight,
} from "@/lib/aau-scholastic-duals-2026-results"
import { aauScholasticProfileHref } from "@/lib/content/aau-scholastic-duals-2026-profile-ids"
import { AauScholasticDualMeetRow } from "@/components/national-team/aau-scholastic-dual-meet-row"
import { AauScholasticIndividualRow } from "@/components/national-team/aau-scholastic-individual-row"
import { AauScholasticQualityWinsTeamRollup } from "@/components/national-team/aau-scholastic-quality-wins-section"
import { AauScholasticDualsWrestlerCards } from "@/components/national-team/aau-scholastic-duals-wrestler-cards"
import {
  buildAauIndividualBoutLogsByWrestler,
  getAauScholasticDualBouts,
} from "@/lib/aau-scholastic-duals-2026-dual-bouts"
import { NhscaDualsTournamentMomentMedia } from "@/components/national-team/nhsca-duals-tournament-moment-media"
import {
  aauNavPillClass,
  aauPageClass,
  aauPanelClass,
  aauPanelDescClass,
  aauPanelHeaderClass,
  aauPanelTitleClass,
  aauPrimaryBtnClass,
  aauSecondaryBtnClass,
  aauInputClass,
} from "@/components/national-team/aau-scholastic-theme"
import { cn } from "@/lib/utils"
import { getAauScholasticQualityWinsEnriched, summarizeAauScholasticQualityWins } from "@/lib/aau-scholastic-duals-2026-quality-wins"

const NAV_LINKS = [
  { href: "#summary", label: "Recap" },
  { href: "#mow", label: "MOW" },
  { href: "#team-trophy", label: "Team photo" },
  { href: "#team-stats", label: "Team stats" },
  { href: "#media", label: "Videos" },
  { href: "#duals", label: "Dual results" },
  { href: "#individual", label: "Individual" },
  { href: "#cards", label: "Athlete cards" },
] as const

type Props = {
  profileIdMap?: Record<string, string>
  highSchoolMap?: Record<string, string>
}

export function AauScholasticDuals2026PublicResults({
  profileIdMap = {},
  highSchoolMap = {},
}: Props) {
  const meta = AAU_SCHOLASTIC_DUALS_2026_RESULTS_META
  const teamSummary = AAU_SCHOLASTIC_DUALS_2026_TEAM_SUMMARY
  const teamTrophy = AAU_SCHOLASTIC_DUALS_2026_TEAM_TROPHY
  const teamVictory = AAU_SCHOLASTIC_DUALS_2026_TEAM_VICTORY_PHOTO
  const highlightVideos = AAU_SCHOLASTIC_DUALS_2026_HIGHLIGHT_VIDEOS
  const winTypes = AAU_SCHOLASTIC_DUALS_2026_WIN_TYPES
  const duals = useMemo(() => sortAauDuals(AAU_SCHOLASTIC_DUALS_2026_DUALS), [])
  const individuals = useMemo(
    () => sortAauIndividualsByWeight(AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS),
    [],
  )
  const individualBoutsByWrestler = useMemo(
    () => buildAauIndividualBoutLogsByWrestler(duals, individuals),
    [duals, individuals],
  )
  const qualityWinEntries = useMemo(() => getAauScholasticQualityWinsEnriched(), [])
  const qualityWinsSummary = useMemo(() => summarizeAauScholasticQualityWins(), [])
  const qualityWinsByWrestler = useMemo(() => {
    const map = new Map<string, (typeof qualityWinEntries)[number]>()
    for (const entry of qualityWinEntries) map.set(entry.wrestler, entry)
    return map
  }, [qualityWinEntries])
  const [search, setSearch] = useState("")

  const computedIndividualPct = aauIndividualWinPct(individuals)

  const filteredIndividuals = individuals.filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.wrestler.toLowerCase().includes(q) ||
      r.weightLabel.toLowerCase().includes(q) ||
      (r.highSchool ?? highSchoolMap[r.wrestler] ?? "").toLowerCase().includes(q) ||
      (r.notes ?? "").toLowerCase().includes(q)
    )
  })

  const statTiles = [
    { label: "Dual record", value: meta.teamRecord },
    { label: "Individual matches", value: meta.individualRecord },
    { label: "Dual win %", value: meta.teamWinPct },
    {
      label: "Individual win %",
      value: meta.individualWinPct !== "—" ? meta.individualWinPct : computedIndividualPct != null ? `${computedIndividualPct}%` : "—",
    },
  ]

  if (!AAU_SCHOLASTIC_DUALS_2026_RESULTS_PUBLISHED) {
    return (
      <div className={aauPageClass}>
        <div className="container mx-auto px-4 py-10 max-w-3xl text-center">
          <HardLink
            href="/national-team"
            className="inline-flex items-center min-h-[44px] mb-6 rounded-lg px-3 -ml-3 text-white/90 hover:bg-white/10 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
            Back to National Team
          </HardLink>
          <Badge className="mb-4 bg-[#B31B1B] text-white border-0">AAU Scholastic Duals 2026</Badge>
          <h1 className="text-3xl font-black mb-3">Results coming soon</h1>
          <p className="text-white/75 mb-8">
            The tournament recap, dual meet scores, and individual records will be posted here after Fort Lauderdale.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <HardLink href={meta.infoPagePath} className={aauPrimaryBtnClass}>
              Team info & roster
            </HardLink>
            <HardLink href={meta.newsArticlePath} className={aauSecondaryBtnClass}>
              Pre-event story
            </HardLink>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={aauPageClass}>
      {/* Hero */}
      <section className="bg-[#002147] text-white border-b border-white/10">
        <div className="container mx-auto px-4 py-6 sm:py-10 max-w-5xl">
          <HardLink
            href="/national-team"
            className="inline-flex items-center min-h-[44px] mb-4 rounded-lg px-2 sm:px-3 -ml-2 text-white/90 hover:bg-white/10 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2 shrink-0" aria-hidden />
            Back to National Team
          </HardLink>

          <div className="grid gap-8 lg:grid-cols-[1fr_min(280px)] lg:items-start">
            <div>
              <Badge className="mb-3 bg-[#B31B1B] text-white border-0 text-xs sm:text-sm rounded-full px-4 py-1">
                {meta.badge}
              </Badge>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight mb-2">{meta.headline}</h1>
              <p className="text-blue-100/90 text-sm sm:text-base md:text-lg mb-5 max-w-2xl">{meta.subheadline}</p>

              <div className="flex flex-wrap gap-4 sm:gap-6 text-sm text-blue-100/90 mb-6">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="w-4 h-4 shrink-0" aria-hidden />
                  {meta.dates}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" aria-hidden />
                  {meta.location}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Trophy className="w-4 h-4 shrink-0" aria-hidden />
                  {meta.placement}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {statTiles.map((tile) => (
                  <Card key={tile.label} className="bg-white/10 border-white/15 text-white">
                    <CardContent className="p-3 sm:p-4 text-center">
                      <div className="text-xl sm:text-2xl font-black text-[#D3B574] tabular-nums">{tile.value}</div>
                      <div className="text-[10px] sm:text-xs text-white/80 mt-1">{tile.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/15 shadow-lg lg:aspect-[16/11]">
              <Image
                src={meta.heroImage}
                alt={meta.heroImageAlt}
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 360px"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-20 border-b border-[#B31B1B]/25 bg-[#001428]/95 backdrop-blur-md">
        <div className="container mx-auto px-4 max-w-5xl py-2.5 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-0.5">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={aauNavPillClass}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 sm:py-10 max-w-5xl space-y-10 pb-16">
        {/* Recap */}
        <section id="summary" className={aauPanelClass}>
          <div className={aauPanelHeaderClass}>
            <h2 className={aauPanelTitleClass}>Tournament recap</h2>
            <p className={aauPanelDescClass}>{meta.venue} · {meta.dates}</p>
          </div>
          <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4 text-white/85 text-sm sm:text-base leading-relaxed">
            {AAU_SCHOLASTIC_DUALS_2026_RECAP_PARAGRAPHS.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        {/* Most Outstanding Wrestlers */}
        <section id="mow" className={aauPanelClass}>
          <div className={cn(aauPanelHeaderClass, "flex items-center gap-2")}>
            <Trophy className="w-5 h-5 text-[#FF7070]" aria-hidden />
            <div>
              <h2 className={aauPanelTitleClass}>Most Outstanding Wrestlers</h2>
              <p className={aauPanelDescClass}>Individual honors · AAU Scholastic Duals 2026</p>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-8">
            {AAU_SCHOLASTIC_DUALS_2026_MOW_SPOTLIGHTS.map((spotlight) => (
              <div
                key={spotlight.wrestler}
                className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_min(280px,40%)] lg:items-start border-b border-white/10 last:border-0 pb-8 last:pb-0"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <HardLink
                      href={aauScholasticProfileHref(spotlight.wrestler, profileIdMap)}
                      className="text-lg sm:text-xl font-black text-white hover:text-[#FF7070] hover:underline"
                    >
                      {spotlight.wrestler}
                    </HardLink>
                    {spotlight.record && (
                      <Badge className="bg-[#B31B1B] text-white border-0 tabular-nums">{spotlight.record}</Badge>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#FF7070] mb-3">{spotlight.title}</p>
                  <p className="text-sm sm:text-base text-white/80 leading-relaxed">{spotlight.description}</p>
                </div>
                {spotlight.imageSrc && (
                  <figure className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    <div className="relative aspect-[3/4] max-h-[420px] w-full mx-auto lg:max-w-none">
                      <Image
                        src={spotlight.imageSrc}
                        alt={spotlight.imageAlt ?? spotlight.wrestler}
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 1024px) 100vw, 320px"
                      />
                    </div>
                  </figure>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Team trophy & victory photo */}
        <section id="team-trophy" className={aauPanelClass}>
          <div className={cn(aauPanelHeaderClass, "flex items-center gap-2")}>
            <Trophy className="w-5 h-5 text-[#FF7070]" aria-hidden />
            <div>
              <h2 className={aauPanelTitleClass}>Team victory</h2>
              <p className={aauPanelDescClass}>
                {teamTrophy.placement} · {teamTrophy.division}
              </p>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-8">
            <figure className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
              <div className="relative aspect-[16/10] sm:aspect-[2/1] w-full">
                <Image
                  src={teamVictory.imageSrc}
                  alt={teamVictory.imageAlt}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 960px"
                />
              </div>
              <figcaption className="px-4 py-3 text-sm text-white/70 border-t border-white/10 text-center">
                {teamVictory.caption}
              </figcaption>
            </figure>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(300px,42%)] lg:items-center">
              <div className="space-y-3">
                <p className="text-lg font-bold text-white">Team tournament trophy</p>
                <p className="text-2xl sm:text-3xl font-black text-[#D3B574]">{teamTrophy.placement}</p>
                <p className="text-sm font-semibold text-white">{teamTrophy.event}</p>
                <p className="text-sm text-white/75">{teamTrophy.division}</p>
                <p className="text-sm text-white/75">{teamTrophy.location}</p>
                <p className="text-sm sm:text-base text-white/85 leading-relaxed pt-2">{teamTrophy.caption}</p>
              </div>
              <figure className="overflow-hidden rounded-xl border border-[#D3B574]/30 bg-black/30 shadow-lg">
                <div className="relative aspect-[3/4] w-full max-h-[480px]">
                  <Image
                    src={teamTrophy.imageSrc}
                    alt={teamTrophy.imageAlt}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 100vw, 360px"
                  />
                </div>
              </figure>
            </div>
          </div>
        </section>

        {/* Team stats */}
        <section id="team-stats" className={aauPanelClass}>
          <div className={aauPanelHeaderClass}>
            <h2 className={aauPanelTitleClass}>Team summary</h2>
            <p className={aauPanelDescClass}>
              {teamSummary.dualRecord} overall · Pool play {teamSummary.poolPlay} · Gold Pool {teamSummary.goldPool} ·{" "}
              {teamSummary.goldPoolPlacement}
            </p>
          </div>
          <div className="px-4 sm:px-6 py-5 sm:py-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {[
                { label: "Dual pts scored", value: teamSummary.teamPointsScored },
                { label: "Dual pts allowed", value: teamSummary.teamPointsAllowed },
                { label: "Dual differential", value: `+${teamSummary.pointDifferential}` },
                { label: "Individual record", value: teamSummary.individualRecord },
                { label: "Allowed (assigned)", value: teamSummary.individualPointsAllowed },
                { label: "Net (assigned)", value: `+${teamSummary.individualNetPoints}` },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-xl border border-[#B31B1B]/25 bg-[#0a2040]/50 px-3 py-4 text-center"
                >
                  <div className="text-xl sm:text-2xl font-black text-[#D3B574] tabular-nums">{tile.value}</div>
                  <div className="text-[10px] sm:text-xs text-white/70 mt-1">{tile.label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs sm:text-sm text-white/60 mb-6">{AAU_SCHOLASTIC_INDIVIDUAL_STATS_FOOTNOTE}</p>

            <div className="mb-8 pb-8 border-b border-white/10">
              <h3 className="text-sm font-bold text-white mb-1">Quality wins vs state-level opponents</h3>
              <AauScholasticQualityWinsTeamRollup summary={qualityWinsSummary} />
            </div>

            <h3 className="text-sm font-bold text-white mb-3">Team win types (127 bout wins)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-sm">
              {[
                { label: "Falls", value: winTypes.falls },
                { label: "Tech falls", value: winTypes.techFalls },
                { label: "Major decisions", value: winTypes.majorDecisions },
                { label: "Decisions", value: winTypes.decisions },
                { label: "Forfeits", value: winTypes.forfeits },
                { label: "Injury default", value: winTypes.injuryDefault },
              ].map((row) => (
                <div key={row.label} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                  <div className="font-bold text-white tabular-nums">{row.value}</div>
                  <div className="text-[10px] text-white/60 mt-0.5">{row.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tournament highlight videos */}
        <section id="media" className={aauPanelClass}>
          <div className={aauPanelHeaderClass}>
            <h2 className={aauPanelTitleClass}>Tournament highlights</h2>
            <p className={aauPanelDescClass}>NC United National Team · AAU Scholastic Duals 2026 · Fort Lauderdale</p>
          </div>
          <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-8">
            {highlightVideos.map((video, index) => (
              <div key={video.title}>
                <h3 className="text-base font-bold text-white mb-3">{video.title}</h3>
                <NhscaDualsTournamentMomentMedia
                  moment={{
                    id: `aau-day-${index + 1}-highlights`,
                    type: "video",
                    caption: video.caption,
                    videoSrc: video.videoSrc,
                    ariaLabel: video.ariaLabel,
                    aspectClass: "aspect-video",
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Dual results */}
        <section id="duals" className={aauPanelClass}>
          <div className={cn(aauPanelHeaderClass, "flex items-center gap-2")}>
            <Trophy className="w-5 h-5 text-[#FF7070]" aria-hidden />
            <div>
              <h2 className={aauPanelTitleClass}>Dual meet results</h2>
              <p className={aauPanelDescClass}>
                {duals.length > 0
                  ? `${duals.filter((d) => d.result === "W").length} wins · ${duals.filter((d) => d.result === "L").length} losses · tap a dual for bout-by-bout results`
                  : "Scores will appear here"}
              </p>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-5 space-y-3">
            {duals.length === 0 ? (
              <p className="text-white/60 text-sm">Dual results not posted yet.</p>
            ) : (
              duals.map((dual) => (
                <AauScholasticDualMeetRow
                  key={`${dual.matchNumber ?? dual.opponent}-${dual.opponent}`}
                  dual={dual}
                  bouts={getAauScholasticDualBouts(dual.matchNumber)}
                />
              ))
            )}
          </div>
        </section>

        {/* Individual results */}
        <section id="individual" className={aauPanelClass}>
          <div className={cn(aauPanelHeaderClass, "flex items-center gap-2")}>
            <Users className="w-5 h-5 text-[#FF7070]" aria-hidden />
            <div className="flex-1 min-w-0">
              <h2 className={aauPanelTitleClass}>Individual results</h2>
              <p className={aauPanelDescClass}>
                Full lineup (106 → HWT) — tap for all matches; quality wins flagged in gold
              </p>
              <p className="text-xs text-white/45 mt-2">{AAU_SCHOLASTIC_INDIVIDUAL_STATS_FOOTNOTE}</p>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <p className="text-xs text-white/45">
                {individuals.length} wrestlers · {qualityWinsSummary.totalWins} team quality wins documented
              </p>
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" aria-hidden />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search wrestler, weight, school…"
                  className={cn("pl-9", aauInputClass)}
                />
              </div>
            </div>

            {filteredIndividuals.length === 0 ? (
              <p className="text-white/60 text-sm">
                {individuals.length === 0 ? "Individual results not posted yet." : "No matches for your search."}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredIndividuals.map((r) => (
                  <AauScholasticIndividualRow
                    key={`${r.wrestler}-${r.weightLabel}`}
                    result={r}
                    bouts={individualBoutsByWrestler[r.wrestler] ?? []}
                    profileHref={aauScholasticProfileHref(r.wrestler, profileIdMap)}
                    school={r.highSchool ?? highSchoolMap[r.wrestler] ?? "—"}
                    qualityWins={qualityWinsByWrestler.get(r.wrestler) ?? null}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Athlete cards */}
        <section id="cards" className={aauPanelClass}>
          <div className={cn(aauPanelHeaderClass, "flex items-center gap-2")}>
            <Users className="w-5 h-5 text-[#FF7070]" aria-hidden />
            <div>
              <h2 className={aauPanelTitleClass}>Athlete cards</h2>
              <p className={aauPanelDescClass}>
                Card art includes weight &amp; record — tap the card for highlights (where available), Profile for their RecruitNC bio
              </p>
            </div>
          </div>
          <AauScholasticDualsWrestlerCards profileIdMap={profileIdMap} />
        </section>

        {/* Footer CTAs */}
        <div className="flex flex-wrap gap-3 justify-center pt-4">
          <HardLink href={meta.newsArticlePath} className={aauSecondaryBtnClass}>
            Read pre-event story
          </HardLink>
          <HardLink href={meta.infoPagePath} className={aauSecondaryBtnClass}>
            Team info page
          </HardLink>
        </div>
      </div>
    </div>
  )
}
