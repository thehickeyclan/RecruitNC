"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { ArrowLeft, Calendar, Loader2, MapPin, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { HardLink } from "@/components/hard-link"
import { NhscaDualsBigWinsSection } from "@/components/national-team/nhsca-duals-big-wins-section"
import { NhscaDualsResultsCommandCenter } from "@/components/national-team/nhsca-duals-results-command-center"
import { NhscaDuals2026RecapSections, NhscaDuals2026ClosingSection } from "@/components/national-team/nhsca-duals-2026-recap-sections"
import { NhscaDuals2026TournamentGallery } from "@/components/national-team/nhsca-duals-2026-tournament-gallery"
import { NationalTeamWrestlerCards } from "@/components/national-team/national-team-wrestler-cards"
import { SelectTeamWrestlerCards } from "@/components/national-team/select-team-wrestler-cards"
import type { NhscaDualsBigWin } from "@/lib/nhsca-duals-big-wins"
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

type PublicSnapshot = NhscaDualsResultsSnapshot & {
  tablesReady?: boolean
  bigWins?: NhscaDualsBigWin[]
  message?: string
}

/** Recap page always shows combined National + Select story. Team filter lives in Results only. */
const PAGE_SCOPE = "all" as const

const NAV_LINKS = [
  { href: "#recap", label: "Recap" },
  { href: "#mow", label: "MOWs" },
  { href: "#results", label: "Results" },
  { href: "#cards", label: "Athlete cards" },
  { href: "#big-wins", label: "Big wins" },
  { href: "#gallery", label: "Gallery" },
] as const

/** Public NHSCA Duals 2026 portal */
export function NhscaDuals2026PublicResults() {
  const [snapshot, setSnapshot] = useState<NhscaDualsResultsSnapshot | null>(null)
  const [bigWins, setBigWins] = useState<NhscaDualsBigWin[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadResults = useCallback(async () => {
    const r = await fetch("/api/national-team/duals-results/public", { cache: "no-store" })
    if (!r.ok) {
      const body = (await r.json().catch(() => ({}))) as { message?: string }
      throw new Error(body.message ?? "Could not load dual results.")
    }
    return r.json() as Promise<PublicSnapshot>
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    loadResults()
      .then((json) => {
        if (cancelled) return
        if (json.teams?.length) setSnapshot(json)
        setBigWins(json.bigWins ?? [])
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Results unavailable.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadResults])

  /** Same hub snapshot — refresh while page is open */
  useEffect(() => {
    if (!snapshot?.teams?.length) return
    const id = window.setInterval(() => {
      void loadResults()
        .then((json) => {
          if (json.teams?.length) setSnapshot(json)
          setBigWins(json.bigWins ?? [])
        })
        .catch(() => {})
    }, 30_000)
    return () => window.clearInterval(id)
  }, [snapshot?.teams?.length, loadResults])

  const heroStats = useMemo(() => {
    if (!snapshot?.summaries) return null
    return buildPublicHeroStats(snapshot, PAGE_SCOPE)
  }, [snapshot])

  const heroStatTiles = useMemo(
    () => (heroStats ? buildHeroStatTiles(heroStats, PAGE_SCOPE) : []),
    [heroStats]
  )

  const achievementLine = scopeAchievementLine(PAGE_SCOPE)
  const heroPhoto = useMemo(() => heroTeamPhotoForScope(PAGE_SCOPE), [])

  return (
    <div className="min-h-screen bg-[#001428]">
      {/* Hero — tournament story only; no team toggle */}
      <section className="bg-[#002147] text-white border-b border-white/10">
        <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10 max-w-5xl">
          <HardLink
            href="/national-team"
            className="inline-flex items-center min-h-[44px] mb-4 sm:mb-5 rounded-lg px-2 sm:px-3 -ml-2 text-white/90 hover:bg-white/10 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2 shrink-0" aria-hidden />
            Back to National Team
          </HardLink>

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 max-w-2xl">
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
          ) : null}
        </div>
      </section>

      {/* Sticky jump nav */}
      <nav
        aria-label="Page sections"
        className="sticky top-0 z-30 border-b border-white/10 bg-[#001428]/95 backdrop-blur-md"
      >
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex gap-2 overflow-x-auto py-2.5 snap-x snap-mandatory scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] max-h-[280px] sm:max-h-[360px] rounded-xl overflow-hidden border border-white/10 mb-8 sm:mb-10">
          <Image
            src={heroPhoto.src}
            alt={heroPhoto.alt}
            fill
            className="object-cover"
            style={{ objectPosition: heroPhoto.objectPosition }}
            priority
            sizes="(max-width: 768px) 100vw, 1024px"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 sm:px-6 py-4 sm:py-5">
            <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight">
              {scopePhotoTitle(PAGE_SCOPE)}
            </h2>
            <p className="text-sm text-white/90 mt-1">
              Virginia Beach, VA · {achievementLine ?? "NHSCA Duals 2026"}
            </p>
          </div>
        </div>

        <NhscaDuals2026RecapSections scope={PAGE_SCOPE} snapshot={snapshot} />

        {/* Results — hub data, team filter lives here only */}
        <section id="results" className="scroll-mt-28 mb-10 sm:mb-14">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 sm:py-16 text-white/60">
              <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
              <span className="text-sm">Loading results from hub…</span>
            </div>
          ) : snapshot ? (
            <NhscaDualsResultsCommandCenter snapshot={snapshot} archiveMode />
          ) : (
            <Card className="border-amber-500/30 bg-amber-950/20">
              <CardContent className="p-5 sm:p-6 text-center text-amber-100 text-sm leading-relaxed">
                {loadError ??
                  "Dual results are syncing from the team hub. Athlete cards and gallery below are still available."}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Athlete cards — both teams always */}
        <section id="cards" className="scroll-mt-28 mb-10 sm:mb-14 rounded-2xl border border-white/10 bg-[#0a2040]/50 overflow-hidden">
          <header className="px-4 sm:px-5 py-4 border-b border-white/10 bg-[#002147]/35">
            <h2 className="text-xl sm:text-2xl font-black text-white">Athlete cards</h2>
            <p className="text-xs sm:text-sm text-white/55 mt-1 leading-relaxed">
              National and Select — official card art with duals record and highlighted wins.
            </p>
          </header>
          <NationalTeamWrestlerCards resultsSnapshot={snapshot} variant="archive" bigWins={bigWins} />
          <SelectTeamWrestlerCards resultsSnapshot={snapshot} variant="archive" bigWins={bigWins} />
        </section>

        <section id="big-wins" className="scroll-mt-28 mb-10 sm:mb-14">
          <NhscaDualsBigWinsSection bigWins={bigWins} scope={PAGE_SCOPE} />
        </section>

        <NhscaDuals2026ClosingSection />
      </div>

      <NhscaDuals2026TournamentGallery scope={PAGE_SCOPE} snapshot={snapshot} />
    </div>
  )
}
