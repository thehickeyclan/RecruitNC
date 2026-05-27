"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { ArrowLeft, Calendar, Loader2, MapPin, Shirt, Trophy, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { HardLink } from "@/components/hard-link"
import { NhscaDualsBigWinsSection } from "@/components/national-team/nhsca-duals-big-wins-section"
import { NhscaDualsResultsCommandCenter } from "@/components/national-team/nhsca-duals-results-command-center"
import { NhscaDuals2026RecapSections, NhscaDuals2026ClosingSection } from "@/components/national-team/nhsca-duals-2026-recap-sections"
import { NhscaDuals2026AthleteMediaSection } from "@/components/national-team/nhsca-duals-2026-athlete-media-section"
import { NhscaDualsCollapsibleSection } from "@/components/national-team/nhsca-duals-collapsible-section"
import { NhscaDualsTournamentMomentMedia } from "@/components/national-team/nhsca-duals-tournament-moment-media"
import { NHSCA_DUALS_2026_APPAREL_VIDEO_MOMENT } from "@/lib/nhsca-duals-2026-tournament-moments"
import { NationalTeamWrestlerCards } from "@/components/national-team/national-team-wrestler-cards"
import { SelectTeamWrestlerCards } from "@/components/national-team/select-team-wrestler-cards"
import type { NhscaDualsBigWin } from "@/lib/nhsca-duals-big-wins"
import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import {
  buildHeroStatTiles,
  buildPublicHeroStats,
  scopeAchievementLine,
  scopeHeadline,
  scopePhotoTitle,
  scopeSubheadline,
} from "@/lib/nhsca-duals-public-hero-stats"
import { heroTeamPhotoForScope } from "@/lib/nhsca-duals-2026-team-photos"
import { cn } from "@/lib/utils"

type PublicSnapshot = NhscaDualsResultsSnapshot & {
  tablesReady?: boolean
  bigWins?: NhscaDualsBigWin[]
  message?: string
}

function publicSnapshotReady(json: PublicSnapshot): boolean {
  if (json.tablesReady === true) return true
  return (json.teams?.length ?? 0) > 0 || (json.duals?.length ?? 0) > 0 || (json.matches?.length ?? 0) > 0
}

/** Recap page always shows combined National + Select story. Team filter lives in Results only. */
const PAGE_SCOPE = "all" as const

type HeroStatsScope = Extract<CommandCenterScope, "national" | "select">

const HERO_STATS_TEAM_OPTIONS: { id: HeroStatsScope; label: string }[] = [
  { id: "national", label: "National" },
  { id: "select", label: "Select" },
]

const NAV_LINKS = [
  { href: "#results", label: "Dual results" },
  { href: "#recap", label: "Recap" },
  { href: "#media", label: "Media" },
  { href: "#mow", label: "MOWs" },
  { href: "#moments", label: "Moments" },
  { href: "#apparel", label: "Team gear" },
  { href: "#cards", label: "Athlete cards" },
  { href: "#big-wins", label: "Big wins" },
] as const

/** Public NHSCA Duals 2026 portal */
export function NhscaDuals2026PublicResults() {
  const [snapshot, setSnapshot] = useState<NhscaDualsResultsSnapshot | null>(null)
  const [bigWins, setBigWins] = useState<NhscaDualsBigWin[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [heroStatsScope, setHeroStatsScope] = useState<HeroStatsScope>("national")

  const loadResults = useCallback(async () => {
    const r = await fetch("/api/national-team/duals-results/public", { cache: "no-store" })
    const body = (await r.json().catch(() => ({}))) as PublicSnapshot
    if (!r.ok) {
      throw new Error(body.message ?? "Could not load dual results.")
    }
    return body
  }, [])

  useEffect(() => {
    let cancelled = false

    const refresh = async (initial: boolean) => {
      if (initial) {
        setLoading(true)
        setLoadError(null)
      }
      try {
        const json = await loadResults()
        if (cancelled) return
        if (publicSnapshotReady(json)) {
          setSnapshot(json)
          setLoadError(null)
        } else if (initial) {
          setLoadError(json.message ?? "Dual results are not available yet.")
        }
        setBigWins(json.bigWins ?? [])
      } catch (e) {
        if (!cancelled && initial) {
          setLoadError(e instanceof Error ? e.message : "Results unavailable.")
        }
      } finally {
        if (!cancelled && initial) setLoading(false)
      }
    }

    void refresh(true)
    const id = window.setInterval(() => void refresh(false), 15_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [loadResults])

  const heroStats = useMemo(() => {
    if (!snapshot?.summaries) return null
    return buildPublicHeroStats(snapshot, heroStatsScope)
  }, [snapshot, heroStatsScope])

  const heroStatTiles = useMemo(
    () => (heroStats ? buildHeroStatTiles(heroStats, heroStatsScope) : []),
    [heroStats, heroStatsScope]
  )

  const achievementLine = scopeAchievementLine(PAGE_SCOPE)
  const heroStatsAchievementLine = scopeAchievementLine(heroStatsScope)
  const heroPhoto = useMemo(() => heroTeamPhotoForScope(PAGE_SCOPE), [])

  return (
    <div className="min-h-screen bg-[#001428]">
      {/* Hero — headline, stats, team photo */}
      <section className="bg-[#002147] text-white border-b border-white/10">
        <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10 max-w-5xl">
          <HardLink
            href="/national-team"
            className="inline-flex items-center min-h-[44px] mb-4 sm:mb-5 rounded-lg px-2 sm:px-3 -ml-2 text-white/90 hover:bg-white/10 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2 shrink-0" aria-hidden />
            Back to National Team
          </HardLink>

          <div className="grid gap-8 lg:grid-cols-[1fr_min(300px)] lg:gap-10 xl:grid-cols-[1fr_360px] lg:items-start">
            <div className="min-w-0">
              <Badge className="mb-3 bg-[#B31B1B] text-white border-0 text-xs sm:text-sm rounded-full px-4 py-1">
                Tournament Recap
              </Badge>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-[1.1] mb-2 sm:mb-3">
                {scopeHeadline(PAGE_SCOPE)}
              </h1>
              <p className="text-blue-100/90 text-sm sm:text-base md:text-lg mb-5 max-w-2xl leading-relaxed">
                {scopeSubheadline(PAGE_SCOPE)}
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-blue-100/90 mb-5 sm:mb-6">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 shrink-0" aria-hidden />
                  May 23–26, 2026
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 shrink-0" aria-hidden />
                  Virginia Beach, VA
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 shrink-0" aria-hidden />
                  {achievementLine ?? "NHSCA National Duals"}
                </span>
              </div>

              {heroStatTiles.length > 0 ? (
                <div className="max-w-2xl">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/45">
                      Team stats
                    </p>
                    <div className="flex rounded-lg bg-[#0a2040] border border-white/10 p-0.5 gap-0.5">
                      {HERO_STATS_TEAM_OPTIONS.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setHeroStatsScope(o.id)}
                          className={cn(
                            "min-h-[36px] rounded-md px-3 text-xs font-bold transition-colors",
                            heroStatsScope === o.id ? "bg-[#CBAF5D] text-[#002147]" : "text-white/65 hover:text-white"
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-blue-100/55 mb-2">{heroStatsAchievementLine}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                    {heroStatTiles.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl border border-white/15 bg-[#0a2040]/60 px-2 py-3 sm:px-3 text-center"
                      >
                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-blue-200/80 font-semibold">
                          {stat.label}
                        </p>
                        <p className="text-lg sm:text-xl font-black text-[#CBAF5D] tabular-nums mt-0.5 leading-tight">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <HardLink
                href="/national-team/hub"
                className="inline-flex items-center min-h-[44px] mt-5 sm:mt-6 rounded-xl border border-[#CBAF5D]/40 bg-[#CBAF5D]/15 px-5 py-2.5 text-sm font-bold text-[#CBAF5D] hover:bg-[#CBAF5D]/25 transition-colors"
              >
                NC United team hub →
              </HardLink>
            </div>

            <div className="relative w-full aspect-[4/3] lg:aspect-[5/4] rounded-xl overflow-hidden border border-white/15 shadow-xl">
              <Image
                src={heroPhoto.src}
                alt={heroPhoto.alt}
                fill
                className="object-cover"
                style={{ objectPosition: heroPhoto.objectPosition }}
                priority
                sizes="(max-width: 1024px) 100vw, 360px"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 py-3 sm:py-4">
                <p className="text-sm sm:text-base font-bold text-white leading-tight">
                  {scopePhotoTitle(PAGE_SCOPE)}
                </p>
                <p className="text-xs text-white/85 mt-0.5">
                  Virginia Beach, VA · {achievementLine ?? "NHSCA Duals 2026"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky jump nav */}
      <nav
        aria-label="Page sections"
        className="sticky top-0 z-30 border-b border-white/10 bg-[#001428]/95 backdrop-blur-md"
      >
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex gap-2 overflow-x-auto py-2.5 snap-x snap-mandatory scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <HardLink
              href="/national-team/hub"
              className="snap-start shrink-0 min-h-[40px] inline-flex items-center rounded-full border border-[#CBAF5D]/35 bg-[#CBAF5D]/10 px-3.5 sm:px-4 text-xs sm:text-sm font-bold text-[#CBAF5D] hover:bg-[#CBAF5D]/20 transition-colors"
            >
              Team hub
            </HardLink>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="snap-start shrink-0 min-h-[40px] inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-[#CBAF5D] hover:bg-white/10 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        {/* 1. Dual results */}
        <section id="results" className="scroll-mt-28 mb-10 sm:mb-14">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 sm:py-16 text-white/60">
              <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
              <span className="text-sm">Loading dual results…</span>
            </div>
          ) : snapshot ? (
            <NhscaDualsResultsCommandCenter snapshot={snapshot} archiveMode initialScope="national" />
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-5 py-6 sm:p-8 text-center">
              <p className="text-amber-100 text-sm leading-relaxed">
                {loadError ?? "Dual results could not be loaded right now."}
              </p>
              <button
                type="button"
                className="mt-4 min-h-[44px] rounded-xl bg-[#CBAF5D] px-5 py-2.5 text-sm font-bold text-[#002147] hover:bg-[#d4bc6a] transition-colors"
                onClick={() => {
                  setLoading(true)
                  setLoadError(null)
                  void loadResults()
                    .then((json) => {
                      if (publicSnapshotReady(json)) {
                        setSnapshot(json)
                        setLoadError(null)
                      } else {
                        setLoadError(json.message ?? "Dual results are not available yet.")
                      }
                      setBigWins(json.bigWins ?? [])
                    })
                    .catch((e) => setLoadError(e instanceof Error ? e.message : "Results unavailable."))
                    .finally(() => setLoading(false))
                }}
              >
                Retry
              </button>
            </div>
          )}
        </section>

        {/* 2. Tournament recap (MOW, moments, coaching) */}
        <NhscaDuals2026RecapSections scope={PAGE_SCOPE} snapshot={snapshot} />

        {/* 3. Media — interviews, highlights, portraits, in-action photos */}
        <NhscaDuals2026AthleteMediaSection scope={PAGE_SCOPE} snapshot={snapshot} />

        {/* 4. Team gear */}
        <NhscaDualsCollapsibleSection
          id="apparel"
          title="Team gear"
          subtitle='Official NC United "Pepsi" and "Pinstripes" singlets plus apparel.'
          defaultOpen={false}
          icon={<Shirt className="h-5 w-5" aria-hidden />}
          className="mb-8 sm:mb-10"
        >
          <figure className="max-w-2xl mx-auto">
            <NhscaDualsTournamentMomentMedia moment={NHSCA_DUALS_2026_APPAREL_VIDEO_MOMENT} />
            <figcaption className="text-center text-sm text-white/55 italic mt-4 leading-relaxed px-2">
              {NHSCA_DUALS_2026_APPAREL_VIDEO_MOMENT.caption}
            </figcaption>
          </figure>
        </NhscaDualsCollapsibleSection>

        {/* 5. Athlete cards */}
        <NhscaDualsCollapsibleSection
          id="cards"
          title="Athlete cards"
          subtitle="National and Select — official card art with duals record and highlighted wins."
          defaultOpen={false}
          icon={<Users className="h-5 w-5" aria-hidden />}
          className="mb-10 sm:mb-14"
        >
          <div className="rounded-xl border border-white/10 bg-[#002147]/35 overflow-hidden -mx-1 sm:-mx-0">
            <NationalTeamWrestlerCards resultsSnapshot={snapshot} variant="archive" bigWins={bigWins} />
            <SelectTeamWrestlerCards resultsSnapshot={snapshot} variant="archive" bigWins={bigWins} />
          </div>
        </NhscaDualsCollapsibleSection>

        {/* 6. Big wins */}
        <section id="big-wins" className="scroll-mt-28 mb-10 sm:mb-14">
          <NhscaDualsBigWinsSection bigWins={bigWins} scope={PAGE_SCOPE} />
        </section>

        <NhscaDuals2026ClosingSection />
      </div>
    </div>
  )
}
