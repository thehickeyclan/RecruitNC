"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Star, Target, Loader2, Users, Calendar } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { getTournaments, type Tournament, getTournamentResults } from "@/lib/nc-united-api"

export default function NCUnitedNationalTeam() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [aggregateStats, setAggregateStats] = useState({
    totalAthletes: 0,
    totalTeamWins: 0,
    totalTeamLosses: 0,
    totalIndividualWins: 0,
    totalIndividualLosses: 0,
    overallWinPercentage: 0,
    teamRecordWinPercentage: 0,
  })

  useEffect(() => {
    async function loadTournaments() {
      try {
        const data = await getTournaments()
        setTournaments(data)

        // Calculate aggregate stats
        let totalTeamWins = 0
        let totalTeamLosses = 0
        let totalIndividualWins = 0
        let totalIndividualLosses = 0
        const uniqueWrestlerIds = new Set<string>()

        // Fetch results for each tournament to count unique athletes
        for (const tournament of data) {
          // Parse team record (format: "7-2" or "7-1")
          if (tournament.team_record) {
            const recordMatch = tournament.team_record.match(/(\d+)-(\d+)/)
            if (recordMatch) {
              totalTeamWins += parseInt(recordMatch[1], 10)
              totalTeamLosses += parseInt(recordMatch[2], 10)
            }
          }

          // Sum individual match stats
          if (tournament.individual_wins !== null) {
            totalIndividualWins += tournament.individual_wins
          }
          if (tournament.individual_losses !== null) {
            totalIndividualLosses += tournament.individual_losses
          }

          // Fetch results to count unique wrestlers
          try {
            const results = await getTournamentResults(tournament.id)
            results.forEach((result) => {
              uniqueWrestlerIds.add(result.wrestler_id)
            })
          } catch (err) {
            console.error(`Error loading results for ${tournament.name} ${tournament.year}:`, err)
          }
        }

        // Calculate team record win percentage (dual meets)
        const totalTeamMatches = totalTeamWins + totalTeamLosses
        const teamRecordWinPercentage = totalTeamMatches > 0
          ? Math.round((totalTeamWins / totalTeamMatches) * 100)
          : 0

        // Calculate overall win percentage (individual matches)
        const totalMatches = totalIndividualWins + totalIndividualLosses
        const overallWinPercentage = totalMatches > 0
          ? Math.round((totalIndividualWins / totalMatches) * 100)
          : 0

        setAggregateStats({
          totalAthletes: uniqueWrestlerIds.size,
          totalTeamWins,
          totalTeamLosses,
          totalIndividualWins,
          totalIndividualLosses,
          overallWinPercentage,
          teamRecordWinPercentage,
        })
      } catch (error) {
        console.error("Error loading tournaments:", error)
      } finally {
        setLoading(false)
      }
    }
    loadTournaments()
  }, [])

  // Find specific tournaments for stats
  const ucd2024 = tournaments.find((t) => t.name === "Ultimate Club Duals" && t.year === 2024)
  const ucd2025 = tournaments.find((t) => t.name === "Ultimate Club Duals" && t.year === 2025)
  const nhsca2025 = tournaments.find((t) => t.name === "NHSCA Duals" && t.year === 2025)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section id="about" className="relative text-white py-16 md:py-24 bg-[#002147]">
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
            <p className="text-lg md:text-xl lg:text-2xl mb-12 md:mb-16 text-blue-100 font-light max-w-3xl mx-auto px-4">
              Elite wrestlers representing North Carolina on the national stage
            </p>

            {/* Stats Grid - Aggregate Stats Across All Tournaments */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mt-12 md:mt-16 px-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-[#CBAF5D] mb-1 md:mb-2">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : tournaments.length}
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
                <div className="text-xs md:text-sm font-medium text-white">Combined Team Record</div>
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

      {/* Our Mission Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[#CBAF5D] text-base md:text-lg font-semibold tracking-wide uppercase mb-4 block">
              Our Mission
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#002147] mb-6 md:mb-8">
              MORE THAN A TEAM.
              <br />
              IT&apos;S A MOVEMENT.
            </h2>
            <div className="text-left max-w-3xl mx-auto space-y-6">
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                The NC United National Team was created to unite North Carolina&apos;s top wrestling talent into elite
                teams that can compete at the highest levels of national competition.
              </p>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                As part of the broader NC United organization, our National Team provides elite wrestlers with
                opportunities to compete against the best programs in the country while representing North Carolina with
                pride.
              </p>
            </div>
            <div className="bg-[#002147] text-white p-6 md:p-8 rounded-lg mb-6 md:mb-8 mt-8 max-w-3xl mx-auto">
              <p className="text-base md:text-lg italic font-light leading-relaxed">
                &quot;North Carolina has the talent. North Carolina has the heart. What we needed was unity. NC United brings together our state&apos;s elite wrestlers to compete as one—proving that when North Carolina stands together, we can beat anyone in the nation.&quot;
              </p>
            </div>
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
                      May 23-25, 2026
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold text-[#002147] mb-2 md:mb-3">
                      27th Annual National Duals
                    </h3>
                    <p className="text-base md:text-lg text-gray-700 mb-2">
                      Memorial Day Weekend
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
                      June 23-26, 2026
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold text-[#002147] mb-2 md:mb-3">
                      2026 AAU Scholastic Duals – All-Star Boys
                    </h3>
                    <p className="text-base md:text-lg text-gray-700 mb-2">
                      Fort Lauderdale, Florida
                    </p>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                      The 2026 AAU Scholastic Duals (formerly Disney Duals) brings together approximately 40–50 elite teams from across the country to compete in high-level team duals, providing a premier national competition experience for top youth and scholastic wrestlers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                  <div className="flex-shrink-0">
                    <Badge className="bg-[#CBAF5D] text-[#002147] text-sm md:text-base px-4 py-2 rounded-full">
                      Late July / Early August 2026
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold text-[#002147] mb-2 md:mb-3">
                      Deep South Summer Duals – All-Star Boys
                    </h3>
                    <p className="text-base md:text-lg text-gray-700 mb-2">
                      Birmingham, Alabama (BJCC)
                    </p>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                      The Deep South Summer Duals features elite All-Star Boys teams competing in high-level national dual competition. While official 2026 event details have not yet been released, we intend to participate pending final dates and confirmation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

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
