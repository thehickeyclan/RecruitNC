"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Star, Target, Loader2, Users, Calendar } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { HardLink } from "@/components/hard-link"
import { useEffect, useState } from "react"
import { NcUnitedCodeSection } from "@/components/national-team/nc-united-code-section"
import { scrollToPageHash } from "@/lib/scroll-to-page-hash"
import { getTournaments, type Tournament, getTournamentResults } from "@/lib/nc-united-api"
import { NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT } from "@/lib/nhsca-duals-public-hero-stats"
import { NHSCA_DUALS_2026_NATIONAL_JOURNEY_CARD_PHOTO } from "@/lib/nhsca-duals-2026-team-photos"
import { AAU_SCHOLASTIC_DUALS_2026 } from "@/lib/aau-scholastic-duals-2026-content"
import { AAU_SCHOLASTIC_DUALS_2026_RESULTS_META, AAU_SCHOLASTIC_DUALS_2026_RESULTS_PUBLISHED } from "@/lib/aau-scholastic-duals-2026-results"
import {
  computeNationalTeamAggregatePercentages,
  isAauScholasticDuals2026Tournament,
  isNhscaDuals2026Tournament,
  mergeAauScholastic2026IntoAggregate,
  mergeNhsca2026NationalIntoAggregate,
  normalizeNationalTeamAthleteName,
  resolveTournamentCardStats,
  type NationalTeamTournamentCardStats,
} from "@/lib/national-team-tournament-aggregate"

export default function NCUnitedNationalTeam() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [aggregateStats, setAggregateStats] = useState({
    tournamentCount: 0,
    totalAthletes: 0,
    totalTeamWins: 0,
    totalTeamLosses: 0,
    totalIndividualWins: 0,
    totalIndividualLosses: 0,
    overallWinPercentage: 0,
    teamRecordWinPercentage: 0,
  })
  const [nhsca2026Stats, setNhsca2026Stats] = useState<NationalTeamTournamentCardStats | null>(null)
  const [aau2026Stats, setAau2026Stats] = useState<NationalTeamTournamentCardStats | null>(null)

  useEffect(() => {
    async function loadNationalTeamStats() {
      try {
        const [data, dualsRes] = await Promise.all([
          getTournaments(),
          fetch("/api/national-team/duals-results/public", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ])

        setTournaments(data)

        let tournamentCount = data.length
        let totalTeamWins = 0
        let totalTeamLosses = 0
        let totalIndividualWins = 0
        let totalIndividualLosses = 0
        const uniqueAthletes = new Set<string>()
        const hasNhsca2026InDb = data.some(isNhscaDuals2026Tournament)
        const hasAau2026InDb = data.some(isAauScholasticDuals2026Tournament)

        for (const tournament of data) {
          if (tournament.team_record) {
            const recordMatch = tournament.team_record.match(/(\d+)-(\d+)/)
            if (recordMatch) {
              totalTeamWins += parseInt(recordMatch[1], 10)
              totalTeamLosses += parseInt(recordMatch[2], 10)
            }
          }

          if (tournament.individual_wins !== null) {
            totalIndividualWins += tournament.individual_wins
          }
          if (tournament.individual_losses !== null) {
            totalIndividualLosses += tournament.individual_losses
          }

          try {
            const results = await getTournamentResults(tournament.id)
            for (const result of results) {
              const name = normalizeNationalTeamAthleteName(
                `${result.wrestler.first_name} ${result.wrestler.last_name}`
              )
              if (name) uniqueAthletes.add(name)
            }
          } catch (err) {
            console.error(`Error loading results for ${tournament.name} ${tournament.year}:`, err)
          }
        }

        const totals = {
          tournamentCount,
          totalTeamWins,
          totalTeamLosses,
          totalIndividualWins,
          totalIndividualLosses,
          uniqueAthletes,
        }
        const nhsca2026Merged = mergeNhsca2026NationalIntoAggregate(dualsRes, hasNhsca2026InDb, totals)
        const aau2026Merged = mergeAauScholastic2026IntoAggregate(hasAau2026InDb, totals)

        setNhsca2026Stats(
          resolveTournamentCardStats(data.find(isNhscaDuals2026Tournament), nhsca2026Merged)
        )
        setAau2026Stats(resolveTournamentCardStats(data.find(isAauScholasticDuals2026Tournament), aau2026Merged))

        const { overallWinPercentage, teamRecordWinPercentage } = computeNationalTeamAggregatePercentages(totals)

        setAggregateStats({
          tournamentCount: totals.tournamentCount,
          totalAthletes: totals.uniqueAthletes.size,
          totalTeamWins: totals.totalTeamWins,
          totalTeamLosses: totals.totalTeamLosses,
          totalIndividualWins: totals.totalIndividualWins,
          totalIndividualLosses: totals.totalIndividualLosses,
          overallWinPercentage,
          teamRecordWinPercentage,
        })
      } catch (error) {
        console.error("Error loading national team stats:", error)
      } finally {
        setLoading(false)
      }
    }
    loadNationalTeamStats()
  }, [])

  useEffect(() => {
    scrollToPageHash()
    const onHashChange = () => scrollToPageHash()
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  useEffect(() => {
    if (loading) return
    scrollToPageHash("auto")
  }, [loading])

  // Find specific tournaments for stats
  const ucd2024 = tournaments.find((t) => t.name === "Ultimate Club Duals" && t.year === 2024)
  const ucd2025 = tournaments.find((t) => t.name === "Ultimate Club Duals" && t.year === 2025)
  const nhsca2025 = tournaments.find((t) => t.name === "NHSCA Duals" && t.year === 2025)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section id="about" className="relative text-white py-12 md:py-20 bg-[#002147]">
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-5xl mx-auto">
            <div className="mb-4 md:mb-6">
              <span className="text-[#CBAF5D] text-base md:text-lg font-semibold tracking-wide uppercase">
                NC United
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black mb-6 md:mb-8 leading-tight">
              NATIONAL TEAM
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl mb-8 md:mb-10 text-blue-100 font-light max-w-3xl mx-auto px-4">
              Elite wrestlers representing North Carolina on the national stage
            </p>

            {AAU_SCHOLASTIC_DUALS_2026_RESULTS_PUBLISHED ? (
              <div className="mb-8 md:mb-10 px-4">
                <p className="inline-block rounded-full bg-[#B31B1B] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white mb-3">
                  {AAU_SCHOLASTIC_DUALS_2026_RESULTS_META.badge}
                </p>
                <p className="text-base sm:text-lg font-bold text-white max-w-2xl mx-auto leading-snug">
                  {AAU_SCHOLASTIC_DUALS_2026_RESULTS_META.headline}
                </p>
                <p className="mt-2 text-sm sm:text-base text-[#FF7070] font-semibold tabular-nums">
                  {AAU_SCHOLASTIC_DUALS_2026_RESULTS_META.teamRecord} dual ·{" "}
                  {AAU_SCHOLASTIC_DUALS_2026_RESULTS_META.individualRecord} individual ·{" "}
                  {AAU_SCHOLASTIC_DUALS_2026_RESULTS_META.placement}
                </p>
              </div>
            ) : null}

            {/* Hero CTAs */}
            <div className="mb-6 md:mb-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 flex-wrap">
              <HardLink
                href={AAU_SCHOLASTIC_DUALS_2026.resultsPath}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#B31B1B] px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-[#9a1616] transition-colors border-2 border-white/20"
              >
                AAU Scholastic Duals · Results
              </HardLink>
              <Link
                href="#schedule"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-[#CBAF5D] bg-transparent px-6 py-3 text-base font-semibold text-[#CBAF5D] hover:bg-[#CBAF5D]/20 transition-colors"
              >
                View schedule
              </Link>
              <HardLink
                href="/national-team/nhsca-duals-2026-results"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#CBAF5D] px-6 py-3 text-base font-bold text-[#002147] hover:bg-[#d4bc7a] transition-colors"
              >
                NHSCA 2026 Portal →
              </HardLink>
            </div>
            <p className="text-sm text-blue-100/90">
              {AAU_SCHOLASTIC_DUALS_2026_RESULTS_PUBLISHED
                ? "Full tournament recap — dual scores, bout logs, quality wins & athlete cards"
                : "AAU Scholastic Duals tournament recap · Fort Lauderdale, June 2026"}
            </p>

            {/* National team stats — UCD, NHSCA, and AAU through 2026 (National squad only; excludes Select) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mt-12 md:mt-16 px-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-[#CBAF5D] mb-1 md:mb-2">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : aggregateStats.tournamentCount}
                </div>
                <div className="text-xs md:text-sm font-medium text-white">National Tournaments</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-[#CBAF5D] mb-1 md:mb-2">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : aggregateStats.totalAthletes}
                </div>
                <div className="text-xs md:text-sm font-medium text-white">Elite Athletes</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-[#CBAF5D] mb-1 md:mb-2">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  ) : (
                    `${aggregateStats.totalTeamWins}-${aggregateStats.totalTeamLosses}`
                  )}
                </div>
                <div className="text-xs md:text-sm font-medium text-white">National Team Record</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-[#CBAF5D] mb-1 md:mb-2">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  ) : (
                    `${aggregateStats.teamRecordWinPercentage}%`
                  )}
                </div>
                <div className="text-xs md:text-sm font-medium text-white">Team Record Win %</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* National Team Schedule — color tiles: gold (NHSCA), blue (comms/roster), red accent */}
      <section id="schedule" className="py-12 md:py-16 bg-white scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-[#002147] mb-2 text-center">National Team Schedule</h2>
            <p className="text-gray-600 text-center mb-8">Roster, event info &amp; comms (registered families only)</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 rounded-2xl border-2 border-[#B8982E]/60 bg-[#002147]/5 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-[#002147] font-bold">NHSCA Duals 2026</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    National team recap — results, athlete cards, highlights &amp; interviews.
                  </p>
                </div>
                <HardLink
                  href="/national-team/nhsca-duals-2026-results"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#CBAF5D] px-5 py-2.5 text-sm font-semibold text-[#002147] hover:bg-[#d4bc7a] transition-colors shrink-0"
                >
                  NHSCA 2026 Portal →
                </HardLink>
              </div>
              <HardLink
                href={AAU_SCHOLASTIC_DUALS_2026.resultsPath}
                className="flex flex-col rounded-2xl border-2 border-[#B31B1B]/40 bg-[#001428] p-6 text-white hover:border-[#B31B1B]/70 hover:shadow-md transition-all group sm:col-span-2"
              >
                <span className="font-bold text-lg text-white">AAU Scholastic Duals 2026</span>
                <span className="text-sm text-[#FF7070] mt-1 group-hover:underline">Results &amp; tournament recap →</span>
              </HardLink>
            </div>
          </div>
        </div>
      </section>

      {/* Archives — previous national teams */}
      <section id="archives" className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-[#002147] mb-2 text-center">Previous National Teams</h2>
            <p className="text-gray-600 text-center mb-8">Results and highlights from past events</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <HardLink
                href="/national-team/nhsca-duals-2026-results"
                className="rounded-xl border-2 border-[#CBAF5D]/35 bg-[#001428] p-5 text-center hover:border-[#CBAF5D]/55 hover:shadow-md transition-all group"
              >
                <span className="font-bold text-white block">NHSCA Duals 2026</span>
                <span className="text-sm text-white/60 block mt-1">National team · Results &amp; recap</span>
                <span className="mt-3 inline-block text-sm font-semibold text-[#CBAF5D] group-hover:underline">View results →</span>
              </HardLink>
              <HardLink
                href={AAU_SCHOLASTIC_DUALS_2026.resultsPath}
                className="rounded-xl border-2 border-[#B31B1B]/40 bg-[#001428] p-5 text-center hover:border-[#B31B1B]/60 hover:shadow-md transition-all group"
              >
                <span className="font-bold text-white block">AAU Scholastic Duals 2026</span>
                <span className="text-sm text-white/60 block mt-1">National team · Results &amp; recap</span>
                <span className="mt-3 inline-block text-sm font-semibold text-[#FF7070] group-hover:underline">View results →</span>
              </HardLink>
              <Link
                href="/national-team/ucd-2024-results"
                className="rounded-xl border-2 border-[#003366]/20 bg-white p-5 text-center hover:border-[#003366]/40 hover:shadow-md transition-all group"
              >
                <span className="font-bold text-[#002147] block">UCD 2024</span>
                <span className="text-sm text-gray-600 block mt-1">Ultimate Club Duals · Results</span>
                <span className="mt-3 inline-block text-sm font-semibold text-[#003366] group-hover:underline">View results →</span>
              </Link>
              <Link
                href="/national-team/ucd-2025-results"
                className="rounded-xl border-2 border-[#003366]/20 bg-white p-5 text-center hover:border-[#003366]/40 hover:shadow-md transition-all group"
              >
                <span className="font-bold text-[#002147] block">UCD 2025</span>
                <span className="text-sm text-gray-600 block mt-1">Ultimate Club Duals · Results</span>
                <span className="mt-3 inline-block text-sm font-semibold text-[#003366] group-hover:underline">View results →</span>
              </Link>
              <Link
                href="/national-team/nhsca-2025-results"
                className="rounded-xl border-2 border-[#003366]/20 bg-white p-5 text-center hover:border-[#003366]/40 hover:shadow-md transition-all group"
              >
                <span className="font-bold text-[#002147] block">NHSCA 2025</span>
                <span className="text-sm text-gray-600 block mt-1">National Duals · Results</span>
                <span className="mt-3 inline-block text-sm font-semibold text-[#003366] group-hover:underline">View results →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission — short */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-[#002147] mb-4">More than a team. It&apos;s a movement.</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              The NC United National Team unites North Carolina&apos;s top wrestling talent into elite teams that compete at the highest levels of national competition—representing our state with pride.
            </p>
            <p className="text-[#002147] italic font-light">
              &quot;When North Carolina stands together, we can beat anyone in the nation.&quot;
            </p>
          </div>
        </div>
      </section>

      {/* Tournament History */}
      <section id="tournaments" className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[#CBAF5D] text-base md:text-lg font-semibold tracking-wide uppercase mb-4 block">
              Tournament History
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#002147] mb-4 md:mb-6">OUR JOURNEY</h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              Competing at the highest levels of national wrestling competition
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#002147]" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 max-w-7xl mx-auto">
              {/* NHSCA Duals 2026 — National Team */}
              <Card className="overflow-hidden shadow-lg border-0 lg:col-span-2">
                <div className="relative w-full h-72 sm:h-80 md:h-[22rem] lg:h-[24rem] overflow-hidden bg-[#002147]">
                  <Image
                    src={NHSCA_DUALS_2026_NATIONAL_JOURNEY_CARD_PHOTO.src}
                    alt={NHSCA_DUALS_2026_NATIONAL_JOURNEY_CARD_PHOTO.alt}
                    fill
                    className="object-cover"
                    style={{ objectPosition: NHSCA_DUALS_2026_NATIONAL_JOURNEY_CARD_PHOTO.objectPosition }}
                    sizes="(max-width: 768px) 100vw, 1280px"
                  />
                  <div className="absolute inset-0 bg-black/45" />
                  <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-end text-white">
                    <Badge className="w-fit mb-3 md:mb-4 bg-[#CBAF5D] hover:bg-[#CBAF5D] text-[#002147] border-0">
                      2026
                    </Badge>
                    <h3 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3">NHSCA Duals</h3>
                    <p className="text-gray-100 text-base md:text-lg">Virginia Beach, VA · National Team</p>
                  </div>
                </div>
                <CardContent className="p-6 md:p-8">
                  <div className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                      <div className="text-center p-3 md:p-4 bg-[#002147] rounded-lg">
                        <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                          {nhsca2026Stats?.ready ? nhsca2026Stats.dualRecord : "—"}
                        </div>
                        <div className="text-xs md:text-sm text-blue-200">National Dual Record</div>
                      </div>
                      <div className="text-center p-3 md:p-4 bg-gray-100 rounded-lg">
                        <div className="text-2xl md:text-3xl font-bold text-[#002147] mb-1">
                          {nhsca2026Stats?.ready ? nhsca2026Stats.individual : "—"}
                        </div>
                        <div className="text-xs md:text-sm text-gray-600">Individual Matches</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                      <div className="text-center p-3 md:p-4 bg-gray-100 rounded-lg">
                        <div className="text-2xl md:text-3xl font-bold text-[#002147] mb-1">
                          {nhsca2026Stats?.ready && nhsca2026Stats.winPct != null
                            ? `${nhsca2026Stats.winPct}%`
                            : "—"}
                        </div>
                        <div className="text-xs md:text-sm text-gray-600">Win Percentage</div>
                      </div>
                      <div className="text-center p-3 md:p-4 bg-[#CBAF5D]/10 rounded-lg">
                        <div className="text-lg md:text-2xl font-bold text-[#CBAF5D] mb-1">
                          {NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT}
                        </div>
                        <div className="text-xs md:text-sm text-gray-600">Bracket Finish</div>
                      </div>
                    </div>

                    <div className="pt-4 md:pt-6 border-t">
                      <HardLink
                        href="/national-team/nhsca-duals-2026-results"
                        className="flex w-full min-h-[48px] items-center justify-center rounded-md bg-[#B31B1B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9a1616] transition-colors"
                      >
                        NHSCA 2026 Portal — Results &amp; Athlete Cards
                      </HardLink>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AAU Scholastic Duals 2026 — National Team */}
              <Card className="overflow-hidden shadow-lg border-0 lg:col-span-2">
                <div className="relative w-full h-72 sm:h-80 md:h-[22rem] lg:h-[24rem] overflow-hidden bg-[#001428]">
                  <Image
                    src={AAU_SCHOLASTIC_DUALS_2026_RESULTS_META.heroImage}
                    alt={AAU_SCHOLASTIC_DUALS_2026_RESULTS_META.heroImageAlt}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 100vw, 1280px"
                  />
                  <div className="absolute inset-0 bg-black/45" />
                  <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-end text-white">
                    <Badge className="w-fit mb-3 md:mb-4 bg-[#B31B1B] hover:bg-[#B31B1B] text-white border-0">
                      2026
                    </Badge>
                    <h3 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3">AAU Scholastic Duals</h3>
                    <p className="text-gray-100 text-base md:text-lg">Fort Lauderdale, FL · National Team</p>
                  </div>
                </div>
                <CardContent className="p-6 md:p-8">
                  <div className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                      <div className="text-center p-3 md:p-4 bg-[#002147] rounded-lg">
                        <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                          {aau2026Stats?.ready ? aau2026Stats.dualRecord : "—"}
                        </div>
                        <div className="text-xs md:text-sm text-blue-200">National Dual Record</div>
                      </div>
                      <div className="text-center p-3 md:p-4 bg-gray-100 rounded-lg">
                        <div className="text-2xl md:text-3xl font-bold text-[#002147] mb-1">
                          {aau2026Stats?.ready ? aau2026Stats.individual : "—"}
                        </div>
                        <div className="text-xs md:text-sm text-gray-600">Individual Matches</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                      <div className="text-center p-3 md:p-4 bg-gray-100 rounded-lg">
                        <div className="text-2xl md:text-3xl font-bold text-[#002147] mb-1">
                          {aau2026Stats?.ready && aau2026Stats.winPct != null
                            ? `${aau2026Stats.winPct}%`
                            : "—"}
                        </div>
                        <div className="text-xs md:text-sm text-gray-600">Win Percentage</div>
                      </div>
                      <div className="text-center p-3 md:p-4 bg-[#B31B1B]/10 rounded-lg">
                        <div className="text-lg md:text-2xl font-bold text-[#B31B1B] mb-1">
                          {aau2026Stats?.placement ?? AAU_SCHOLASTIC_DUALS_2026_RESULTS_META.placement}
                        </div>
                        <div className="text-xs md:text-sm text-gray-600">Gold Pool Finish</div>
                      </div>
                    </div>

                    <div className="pt-4 md:pt-6 border-t">
                      <HardLink
                        href={AAU_SCHOLASTIC_DUALS_2026.resultsPath}
                        className="flex w-full min-h-[48px] items-center justify-center rounded-md bg-[#B31B1B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9a1616] transition-colors"
                      >
                        AAU 2026 Results — Recap &amp; Athlete Cards
                      </HardLink>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* UCD 2025 */}
              {ucd2025 && (
                <Card className="overflow-hidden shadow-lg border-0">
                  <div
                    className="relative h-64 md:h-80 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/images/ucd-2025-team-photo.png')" }}
                  >
                    <div className="absolute inset-0 bg-black/40"></div>
                    <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-end text-white">
                      <Badge className="w-fit mb-3 md:mb-4 bg-[#B31B1B] hover:bg-[#B31B1B] text-white border-0">
                        {ucd2025.year}
                      </Badge>
                      <h3 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3">{ucd2025.name}</h3>
                      <p className="text-gray-100 text-base md:text-lg">
                        {ucd2025.location || "State College, PA"}
                      </p>
                    </div>
                  </div>
                  <CardContent className="p-6 md:p-8">
                    <div className="space-y-4 md:space-y-6">
                      <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div className="text-center p-3 md:p-4 bg-[#002147] rounded-lg">
                          <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                            {ucd2025.team_record || "—"}
                          </div>
                          <div className="text-xs md:text-sm text-blue-200">Dual Meet Record</div>
                        </div>
                        <div className="text-center p-3 md:p-4 bg-gray-100 rounded-lg">
                          <div className="text-2xl md:text-3xl font-bold text-[#002147] mb-1">
                            {ucd2025.individual_wins && ucd2025.individual_losses
                              ? `${ucd2025.individual_wins}-${ucd2025.individual_losses}`
                              : "—"}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">Individual Matches</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div className="text-center p-3 md:p-4 bg-gray-100 rounded-lg">
                          <div className="text-2xl md:text-3xl font-bold text-[#002147] mb-1">
                            {ucd2025.win_percentage ? `${Math.round(ucd2025.win_percentage)}%` : "—"}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">Win Percentage</div>
                        </div>
                        <div className="text-center p-3 md:p-4 bg-[#CBAF5D]/10 rounded-lg">
                          <div className="text-lg md:text-2xl font-bold text-[#CBAF5D] mb-1">
                            {ucd2025.overall_placement || "—"}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">Placement</div>
                        </div>
                      </div>

                      <div className="pt-4 md:pt-6 border-t">
                        <Link href="/national-team/ucd-2025-results" onClick={() => window.scrollTo(0, 0)}>
                          <Button className="w-full bg-[#B31B1B] hover:bg-[#9a1616] text-white font-semibold">
                            View Full Results & Gallery
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* UCD 2024 */}
              {ucd2024 && (
                <Card className="overflow-hidden shadow-lg border-0">
                  <div
                    className="relative h-64 md:h-80 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/images/ucd-team-singlets.png')" }}
                  >
                    <div className="absolute inset-0 bg-black/40"></div>
                    <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-end text-white">
                      <Badge className="w-fit mb-3 md:mb-4 bg-[#B31B1B] hover:bg-[#B31B1B] text-white border-0">
                        {ucd2024.year}
                      </Badge>
                      <h3 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3">{ucd2024.name}</h3>
                      <p className="text-gray-100 text-base md:text-lg">
                        {ucd2024.location || "Nittany Valley Sports Centre, PA"}
                      </p>
                    </div>
                  </div>
                  <CardContent className="p-6 md:p-8">
                    <div className="space-y-4 md:space-y-6">
                      <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div className="text-center p-3 md:p-4 bg-[#002147] rounded-lg">
                          <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                            {ucd2024.team_record || "—"}
                          </div>
                          <div className="text-xs md:text-sm text-blue-200">Dual Meet Record</div>
                        </div>
                        <div className="text-center p-3 md:p-4 bg-gray-100 rounded-lg">
                          <div className="text-2xl md:text-3xl font-bold text-[#002147] mb-1">
                            {ucd2024.individual_wins && ucd2024.individual_losses
                              ? `${ucd2024.individual_wins}-${ucd2024.individual_losses}`
                              : "—"}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">Individual Matches</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div className="text-center p-3 md:p-4 bg-gray-100 rounded-lg">
                          <div className="text-2xl md:text-3xl font-bold text-[#002147] mb-1">
                            {ucd2024.win_percentage ? `${Math.round(ucd2024.win_percentage)}%` : "—"}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">Win Percentage</div>
                        </div>
                        <div className="text-center p-3 md:p-4 bg-[#CBAF5D]/10 rounded-lg">
                          <div className="text-lg md:text-2xl font-bold text-[#CBAF5D] mb-1">
                            {ucd2024.overall_placement || "—"}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">Placement</div>
                        </div>
                      </div>

                      <div className="pt-4 md:pt-6 border-t">
                        <Link href="/national-team/ucd-2024-results" onClick={() => window.scrollTo(0, 0)}>
                          <Button className="w-full bg-[#B31B1B] hover:bg-[#9a1616] text-white font-semibold">
                            View Full Results & Gallery
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* NHSCA Duals 2025 */}
              {nhsca2025 && (
                <Card className="overflow-hidden shadow-lg border-0">
                  <div
                    className="relative h-64 md:h-80 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/images/nhsca-team-photo-2025.png')" }}
                  >
                    <div className="absolute inset-0 bg-black/40"></div>
                    <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-end text-white">
                      <Badge className="w-fit mb-3 md:mb-4 bg-[#B31B1B] hover:bg-[#B31B1B] text-white border-0">
                        {nhsca2025.year}
                      </Badge>
                      <h3 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3">{nhsca2025.name}</h3>
                      <p className="text-gray-100 text-base md:text-lg">
                        {nhsca2025.location || "Virginia Beach, VA"}
                      </p>
                    </div>
                  </div>
                  <CardContent className="p-6 md:p-8">
                    <div className="space-y-4 md:space-y-6">
                      <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div className="text-center p-3 md:p-4 bg-[#002147] rounded-lg">
                          <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                            {nhsca2025.team_record || "—"}
                          </div>
                          <div className="text-xs md:text-sm text-blue-200">Dual Meet Record</div>
                        </div>
                        <div className="text-center p-3 md:p-4 bg-gray-100 rounded-lg">
                          <div className="text-2xl md:text-3xl font-bold text-[#002147] mb-1">
                            {nhsca2025.individual_wins && nhsca2025.individual_losses
                              ? `${nhsca2025.individual_wins}-${nhsca2025.individual_losses}`
                              : "—"}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">Individual Matches</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div className="text-center p-3 md:p-4 bg-gray-100 rounded-lg">
                          <div className="text-2xl md:text-3xl font-bold text-[#002147] mb-1">
                            {nhsca2025.win_percentage ? `${Math.round(nhsca2025.win_percentage)}%` : "—"}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">Win Percentage</div>
                        </div>
                        <div className="text-center p-3 md:p-4 bg-[#CBAF5D]/10 rounded-lg">
                          <div className="text-lg md:text-2xl font-bold text-[#CBAF5D] mb-1">
                            {nhsca2025.overall_placement || "—"}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">Placement</div>
                        </div>
                      </div>

                      <div className="pt-4 md:pt-6 border-t">
                        <Link href="/national-team/nhsca-2025-results" onClick={() => window.scrollTo(0, 0)}>
                          <Button className="w-full bg-[#B31B1B] hover:bg-[#9a1616] text-white font-semibold">
                            View Full Results & Stats
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </section>

      {/* NC United Timeline */}
      <section id="timeline" className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[#CBAF5D] text-base md:text-lg font-semibold tracking-wide uppercase mb-4 block">
              Our Journey
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#002147] mb-4 md:mb-6">
              NC United Timeline
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              From founding to national competition
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Timeline Line */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-8 md:left-12 top-0 bottom-0 w-0.5 bg-gray-300"></div>

              {/* Event 1: NC United Founded */}
              <div className="relative mb-8 md:mb-12">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-[#002147] rounded-full flex items-center justify-center shadow-lg">
                      <Calendar className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                  </div>
                  <Card className="flex-1 bg-gray-50 border-0 shadow-md">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-4">
                        <Badge className="bg-[#002147] text-white text-xs md:text-sm px-3 py-1 rounded-full">
                          June 2024
                        </Badge>
                        <h3 className="text-lg md:text-xl font-bold text-[#002147]">
                          NC United Founded
                        </h3>
                      </div>
                      <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                        NC United Wrestling was established with the vision of uniting North Carolina&apos;s top wrestling talent under one organization.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Event 2: First National Team - UCD 2024 */}
              <div className="relative mb-8 md:mb-12">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-[#B31B1B] rounded-full flex items-center justify-center shadow-lg">
                      <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                  </div>
                  <Card className="flex-1 bg-gray-50 border-0 shadow-md">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-4">
                        <Badge className="bg-[#B31B1B] text-white text-xs md:text-sm px-3 py-1 rounded-full">
                          September 2024
                        </Badge>
                        <h3 className="text-lg md:text-xl font-bold text-[#002147]">
                          First National Team - UCD 2024
                        </h3>
                      </div>
                      <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                        Our inaugural National Team competed at Ultimate Club Duals 2024, finishing 2nd place with a 5-2 dual meet record.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Event 3: NHSCA Duals 2025 */}
              <div className="relative mb-8 md:mb-12">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-[#CBAF5D] rounded-full flex items-center justify-center shadow-lg">
                      <Users className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                  </div>
                  <Card className="flex-1 bg-gray-50 border-0 shadow-md">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-4">
                        <Badge className="bg-[#CBAF5D] text-[#002147] text-xs md:text-sm px-3 py-1 rounded-full">
                          March 2025
                        </Badge>
                        <h3 className="text-lg md:text-xl font-bold text-[#002147]">
                          NHSCA Duals 2025
                        </h3>
                      </div>
                      <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                        Competed at NHSCA Duals in Virginia Beach, VA, achieving a 7-1 dual meet record and reaching the Gold Pool championship bracket.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Event 4: UCD 2025 - Statement Weekend */}
              <div className="relative">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
                      <Target className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                  </div>
                  <Card className="flex-1 bg-gray-50 border-0 shadow-md">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-4">
                        <Badge className="bg-green-600 text-white text-xs md:text-sm px-3 py-1 rounded-full">
                          September 2025
                        </Badge>
                        <h3 className="text-lg md:text-xl font-bold text-[#002147]">
                          UCD 2025 - Statement Weekend
                        </h3>
                      </div>
                      <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                        Both our men&apos;s (Blue) and inaugural women&apos;s (Gold) teams competed at UCD 2025. The Blue team went 7-2, finishing 3rd overall with three undefeated wrestlers.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Achievements */}
      <section id="achievements" className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[#CBAF5D] text-base md:text-lg font-semibold tracking-wide uppercase mb-4 block">
              Excellence
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#002147] mb-4 md:mb-6">
              BUILDING CHAMPIONS
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">On and off the mat</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <Card className="text-center p-6 md:p-8 border-0 shadow-lg">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-[#CBAF5D]/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Trophy className="w-6 h-6 md:w-8 md:h-8 text-[#CBAF5D]" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#002147] mb-3 md:mb-4">National Exposure</h3>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                Competing against top programs from across the United States
              </p>
            </Card>

            <Card className="text-center p-6 md:p-8 border-0 shadow-lg">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-[#002147]/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Star className="w-6 h-6 md:w-8 md:h-8 text-[#002147]" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#002147] mb-3 md:mb-4">Elite Development</h3>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                Providing high-level competition experience for our athletes
              </p>
            </Card>

            <Card className="text-center p-6 md:p-8 border-0 shadow-lg md:col-span-2 lg:col-span-1 mx-auto max-w-sm lg:max-w-none">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-[#B31B1B]/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Target className="w-6 h-6 md:w-8 md:h-8 text-[#B31B1B]" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#002147] mb-3 md:mb-4">Proven Results</h3>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                Combined winning record across national tournaments
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Elite Coaching Leadership */}
      <section id="coaches" className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[#CBAF5D] text-base md:text-lg font-semibold tracking-wide uppercase mb-4 block">
              Leadership
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#002147] mb-4 md:mb-6">
              ELITE COACHING STAFF
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              World-class coaches with proven track records of success
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <Card className="text-center p-6 md:p-8 border-0 shadow-lg overflow-hidden">
              <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-4 md:mb-6 rounded-full overflow-hidden bg-gray-100">
                <Image
                  src="/images/coach-macchiavello.png"
                  alt="Coach Mike Macchiavello"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#002147] mb-2 md:mb-3">
                Coach Mike Macchiavello
              </h3>
              <p className="text-sm md:text-base font-semibold text-[#002147] mb-3 md:mb-4">
                Blue Team Coach & Founder
              </p>
              <ul className="text-left text-sm md:text-base text-gray-600 space-y-2 mb-4 md:mb-6 max-w-xs mx-auto">
                <li className="flex items-start">
                  <span className="text-[#B31B1B] mr-2">•</span>
                  <span>2018 NCAA Division I Champion</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#B31B1B] mr-2">•</span>
                  <span>5-year Team USA National Team member</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#B31B1B] mr-2">•</span>
                  <span>Founder of NC United Wrestling</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#B31B1B] mr-2">•</span>
                  <span>Multiple-time All-American</span>
                </li>
              </ul>
              <p className="text-sm md:text-base text-gray-600 italic leading-relaxed">
                &quot;Building champions on and off the mat through elite competition and character development.&quot;
              </p>
            </Card>

            <Card className="text-center p-6 md:p-8 border-0 shadow-lg overflow-hidden">
              <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-4 md:mb-6 rounded-full overflow-hidden bg-gray-100">
                <Image
                  src="/images/coach-palmer.png"
                  alt="Coach Colton Palmer"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#002147] mb-2 md:mb-3">
                Coach Colton Palmer
              </h3>
              <p className="text-sm md:text-base font-semibold text-[#002147] mb-3 md:mb-4">
                Blue Team Coach
              </p>
              <ul className="text-left text-sm md:text-base text-gray-600 space-y-2 mb-4 md:mb-6 max-w-xs mx-auto">
                <li className="flex items-start">
                  <span className="text-[#B31B1B] mr-2">•</span>
                  <span>NC State Alumni</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#B31B1B] mr-2">•</span>
                  <span>2x NC State Champion</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#B31B1B] mr-2">•</span>
                  <span>NC all-time wins leader (284 victories)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#B31B1B] mr-2">•</span>
                  <span>Co-founder</span>
                </li>
              </ul>
              <p className="text-sm md:text-base text-gray-600 italic leading-relaxed">
                &quot;Developing wrestlers with the fundamentals, work ethic, and mental toughness to succeed at any level.&quot;
              </p>
            </Card>

            <Card className="text-center p-6 md:p-8 border-0 shadow-lg overflow-hidden">
              <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-4 md:mb-6 rounded-full overflow-hidden bg-gray-100">
                <Image
                  src="/images/coach-veronica-carlson.png"
                  alt="Coach Veronica Carlson"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#002147] mb-2 md:mb-3">
                Coach Veronica Carlson
              </h3>
              <p className="text-sm md:text-base font-semibold text-[#CBAF5D] mb-3 md:mb-4">
                Gold Team Coach
              </p>
              <ul className="text-left text-sm md:text-base text-gray-600 space-y-2 mb-4 md:mb-6 max-w-xs mx-auto">
                <li className="flex items-start">
                  <span className="text-[#B31B1B] mr-2">•</span>
                  <span>5-year Team USA member</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#B31B1B] mr-2">•</span>
                  <span>2014 U.S. World Team Trials Champion</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#B31B1B] mr-2">•</span>
                  <span>2013 U.S. Open Champion</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#B31B1B] mr-2">•</span>
                  <span>Women&apos;s wrestling pioneer</span>
                </li>
              </ul>
              <p className="text-sm md:text-base text-gray-600 italic leading-relaxed">
                &quot;Empowering the next generation of women wrestlers to reach their full potential on the national stage.&quot;
              </p>
            </Card>
          </div>

          <div className="mt-8 md:mt-12 text-center">
            <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
              Special recognition goes to all the club coaches who support the team throughout tournaments, providing valuable technical guidance and corner coaching.
            </p>
          </div>
        </div>
      </section>

      {/* 2026 Competition Schedule */}
      <section id="schedule" className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[#CBAF5D] text-base md:text-lg font-semibold tracking-wide uppercase mb-4 block">
              Upcoming
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#002147] mb-4 md:mb-6">
              2026 National Team Competition Schedule
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Elite competition opportunities for North Carolina&apos;s top wrestlers
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                  <div className="flex-shrink-0">
                    <Badge className="bg-[#002147] text-white text-sm md:text-base px-4 py-2 rounded-full">
                      May 22–25, 2026
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold text-[#002147] mb-2 md:mb-3">
                      27th Annual National Duals
                    </h3>
                    <p className="text-base md:text-lg text-gray-700 mb-2">
                      Fri–Mon · travel & weigh-ins Fri · VBSC
                    </p>
                    <p className="text-sm md:text-base text-gray-600">
                      Join NC United as we compete in this premier national dual team tournament featuring elite teams from across the country.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                  <div className="flex-shrink-0">
                    <Badge className="bg-[#B31B1B] text-white text-sm md:text-base px-4 py-2 rounded-full">
                      {AAU_SCHOLASTIC_DUALS_2026.datesLabel}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold text-[#002147] mb-2 md:mb-3">
                      AAU Scholastic Duals 2026 — NC United National Team
                    </h3>
                    <p className="text-base md:text-lg text-gray-700 mb-2">
                      Broward County Convention Center · Fort Lauderdale, FL
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      {AAU_SCHOLASTIC_DUALS_2026.travelNote}
                    </p>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-4">
                      The 2026 AAU Scholastic Duals (formerly Disney Duals) brings together approximately 40–50 elite teams from across the country to compete in high-level team duals, providing a premier national competition experience for top youth and scholastic wrestlers.
                    </p>
                    <HardLink
                      href={AAU_SCHOLASTIC_DUALS_2026.resultsPath}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#B31B1B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9a1616] transition-colors"
                    >
                      View tournament results →
                    </HardLink>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <NcUnitedCodeSection />

      {/* Call to Action */}
      <section id="upcoming" className="py-12 md:py-16 bg-[#002147] text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Join the National Team</h2>
          <p className="text-lg md:text-xl mb-6 md:mb-8 max-w-2xl mx-auto">
            Ready to be part of North Carolina&apos;s elite wrestling program? The NC United National Team is sourced from our <strong>Blue program</strong>, providing elite wrestlers with opportunities to compete against the best programs in the country while representing North Carolina with pride. Our mission is to unite North Carolina&apos;s top wrestling talent into elite teams that can compete at the highest levels of national competition.
          </p>
        </div>
      </section>
    </div>
  )
}
