"use client"

import { useEffect, useMemo, useState } from "react"
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
import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import {
  NHSCA_DUALS_2026_BOTH_TEAMS_PHOTO,
  NHSCA_DUALS_2026_NATIONAL_TEAM_PHOTO,
  NHSCA_DUALS_2026_SELECT_TEAM_PHOTO,
} from "@/lib/nhsca-duals-2026-team-photos"
import { cn } from "@/lib/utils"
import {
  buildHeroStatTiles,
  buildPublicHeroStats,
  scopeAchievementLine,
  scopeHeadline,
  scopePhotoTitle,
  scopeSubheadline,
} from "@/lib/nhsca-duals-public-hero-stats"

type PublicSnapshot = NhscaDualsResultsSnapshot & {
  tablesReady?: boolean
  bigWins?: NhscaDualsBigWin[]
  message?: string
}

const NAV_LINKS = [
  { href: "#recap", label: "Recap" },
  { href: "#mow", label: "MOWs" },
  { href: "#duals", label: "Dual results" },
  { href: "#leaderboard", label: "Leaderboard" },
  { href: "#cards", label: "Athlete cards" },
  { href: "#big-wins", label: "Big wins" },
  { href: "#gallery", label: "Gallery" },
] as const

function parseTeamScope(raw: string | null): CommandCenterScope {
  if (raw === "national" || raw === "select") return raw
  return "all"
}

function teamPhotoForScope(scope: CommandCenterScope) {
  if (scope === "national") return NHSCA_DUALS_2026_NATIONAL_TEAM_PHOTO
  if (scope === "select") return NHSCA_DUALS_2026_SELECT_TEAM_PHOTO
  return NHSCA_DUALS_2026_BOTH_TEAMS_PHOTO
}

function SectionHeading({
  title,
  description,
  id,
}: {
  id?: string
  title: string
  description?: string
}) {
  return (
    <header id={id} className={cn("scroll-mt-24 mb-4 md:mb-5", id && "scroll-mt-28")}>
      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{title}</h2>
      {description ? <p className="text-sm text-white/55 mt-1 max-w-2xl">{description}</p> : null}
    </header>
  )
}

/** Public NHSCA Duals 2026 portal */
export function NhscaDuals2026PublicResults() {
  const [scope, setScope] = useState<CommandCenterScope>("all")
  const [snapshot, setSnapshot] = useState<NhscaDualsResultsSnapshot | null>(null)
  const [bigWins, setBigWins] = useState<NhscaDualsBigWin[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    setScope(parseTeamScope(params.get("team")))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    fetch("/api/national-team/duals-results/public", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          const body = (await r.json().catch(() => ({}))) as { message?: string }
          throw new Error(body.message ?? "Could not load dual results.")
        }
        return r.json() as Promise<PublicSnapshot>
      })
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
  }, [])

  const heroStats = useMemo(() => {
    if (!snapshot?.summaries) return null
    return buildPublicHeroStats(snapshot, scope)
  }, [snapshot, scope])

  const heroStatTiles = useMemo(
    () => (heroStats ? buildHeroStatTiles(heroStats, scope) : []),
    [heroStats, scope]
  )

  const achievementLine = scopeAchievementLine(scope)

  return (
    <div className="min-h-screen bg-[#001428]">
      {/* Hero */}
      <section className="bg-[#002147] text-white border-b border-white/10">
        <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12 max-w-5xl">
          <HardLink
            href="/national-team"
            className="inline-flex items-center min-h-[44px] mb-4 sm:mb-6 rounded-lg px-2 sm:px-3 -ml-2 text-white/90 hover:bg-white/10 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2 shrink-0" aria-hidden />
            Back to National Team
          </HardLink>

          <Badge className="mb-3 sm:mb-4 bg-[#B31B1B] text-white border-0 text-xs sm:text-sm rounded-full px-4 py-1">
            Tournament Recap
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black leading-[1.1] mb-2 sm:mb-3">
            {scopeHeadline(scope)}
          </h1>
          <p className="text-blue-100/90 text-sm sm:text-base md:text-lg mb-5 sm:mb-6 max-w-2xl leading-relaxed">
            {scopeSubheadline(scope)}
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-blue-100/90 mb-6 sm:mb-8">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 max-w-2xl mb-6 sm:mb-8">
              {heroStatTiles.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/15 bg-[#0a2040]/60 px-2 py-3 sm:px-3 sm:py-3.5 text-center shadow-sm"
                >
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-blue-200/80 font-semibold">
                    {stat.label}
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-[#CBAF5D] tabular-nums mt-0.5 leading-tight">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/45 mb-2">
            Filter by team
          </p>
          <div className="flex rounded-xl bg-[#0a2040] border border-white/10 p-1 gap-1 w-full max-w-md">
            {(
              [
                { id: "all", label: "Both" },
                { id: "national", label: "National" },
                { id: "select", label: "Select" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setScope(o.id)}
                className={cn(
                  "flex-1 min-h-[44px] rounded-lg text-xs sm:text-sm font-bold transition-colors px-1",
                  scope === o.id ? "bg-[#CBAF5D] text-[#002147]" : "text-white/65 hover:text-white"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky jump nav — horizontal scroll on mobile */}
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
        <div className="relative w-full aspect-[4/3] sm:aspect-[2/1] md:aspect-[21/9] max-h-[240px] sm:max-h-[320px] rounded-xl overflow-hidden border border-white/10 mb-8 sm:mb-10">
          <Image
            src={teamPhotoForScope(scope)}
            alt="NC United NHSCA Duals 2026 team photo"
            fill
            className="object-cover object-[center_20%]"
            priority
            sizes="(max-width: 768px) 100vw, 1024px"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 sm:px-6 py-4 sm:py-6">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-white leading-tight">
              {scopePhotoTitle(scope)}
            </h2>
            <p className="text-sm sm:text-base text-white/90 mt-1">
              Virginia Beach, VA
              {achievementLine
                ? ` · ${achievementLine}`
                : heroStats && heroStats.dualRecord !== "0-0"
                  ? ` · ${heroStats.dualRecord} dual record`
                  : " · NHSCA Duals 2026"}
            </p>
          </div>
        </div>

        <NhscaDuals2026RecapSections scope={scope} snapshot={snapshot} heroStats={heroStats} />

        {/* Duals + leaderboard */}
        <section className="mb-10 sm:mb-14">
          <SectionHeading
            id="duals"
            title="Dual meet results"
            description="Tap a dual to expand every bout — weight, wrestler, and team points."
          />
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 sm:py-16 text-white/60">
              <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
              <span className="text-sm">Loading results…</span>
            </div>
          ) : snapshot ? (
            <NhscaDualsResultsCommandCenter
              snapshot={snapshot}
              initialScope={scope}
              onScopeChange={setScope}
              archiveMode
            />
          ) : (
            <Card className="border-amber-500/30 bg-amber-950/20">
              <CardContent className="p-5 sm:p-6 text-center text-amber-100 text-sm leading-relaxed">
                {loadError ??
                  "Dual results are syncing. Athlete cards and the tournament gallery below are still available."}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Athlete cards */}
        <section id="cards" className="scroll-mt-28 mb-10 sm:mb-14 rounded-2xl border border-white/10 bg-[#0a2040]/50 overflow-hidden">
          <header className="px-4 sm:px-5 py-4 border-b border-white/10 bg-[#002147]/35">
            <h2 className="text-xl sm:text-2xl font-black text-white">Athlete cards</h2>
            <p className="text-xs sm:text-sm text-white/55 mt-1 leading-relaxed">
              Official card art with duals record, net team points, and highlighted wins.
            </p>
          </header>
          {(scope === "all" || scope === "national") && (
            <NationalTeamWrestlerCards resultsSnapshot={snapshot} variant="archive" bigWins={bigWins} />
          )}
          {(scope === "all" || scope === "select") && (
            <SelectTeamWrestlerCards resultsSnapshot={snapshot} variant="archive" bigWins={bigWins} />
          )}
        </section>

        {/* Big wins */}
        <section id="big-wins" className="scroll-mt-28 mb-10 sm:mb-14">
          <NhscaDualsBigWinsSection bigWins={bigWins} scope={scope} />
        </section>

        <NhscaDuals2026ClosingSection />
      </div>

      {/* Tournament action photos — light section at bottom */}
      <NhscaDuals2026TournamentGallery scope={scope} snapshot={snapshot} />
    </div>
  )
}
