"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useState, useEffect } from "react"
import "./athletes/flip-card.css"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthleteList } from "@/lib/professional-athlete"

type YearFilter = "All" | "2025" | "2026"

interface Athlete {
  id: string
  name: string
  highschool: string
  college: string
  division: string
  graduationyear: number
  photourl: string
  commitmentPhotoUrl?: string
  weightclass: string
  college_weight_class?: string
  wrestlingclub: string
  achievements: string[]
  team?: string
  wrestlingClub?: string
  club?: string
  gender?: string
  prospect_ranking?: number | string | null
}

export default function HomePage() {
  const [yearFilter, setYearFilter] = useState<YearFilter>("2026")
  const [featuredAthletes, setFeaturedAthletes] = useState<Athlete[]>([])
  const [stats, setStats] = useState({
    total: 0,
    male: 0,
    female: 0,
    divisions: {
      D1: 0,
      D2: 0,
      D3: 0,
      NAIA: 0,
      NJCAA: 0,
    },
  })
  const [loading, setLoading] = useState(true)
  const [athletesLoading, setAthletesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [featuredRankings, setFeaturedRankings] = useState<Athlete[]>([])
  const [rankingsLoading, setRankingsLoading] = useState(true)
  const [latestCommits, setLatestCommits] = useState<Athlete[]>([])
  const [commitsLoading, setCommitsLoading] = useState(true)

  useEffect(() => {
    const fetchFeaturedAthletes = async () => {
      try {
        setError(null)
        setAthletesLoading(true)

        const url = yearFilter === "All" ? "/api/featured-athletes" : `/api/featured-athletes?year=${yearFilter}`

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        console.log("[v0] Featured athletes API response:", data)
        console.log("[v0] First athlete college_weight_class:", data.athletes?.[0]?.college_weight_class)

        if (!data.success) {
          throw new Error(data.error || "API returned unsuccessful response")
        }

        const athletes = Array.isArray(data.athletes) ? data.athletes : []

        console.log("[v0] Normalized athletes:", normalizeAthleteList(athletes))

        setFeaturedAthletes(normalizeAthleteList(athletes))
        setError(null)
      } catch (err) {
        console.error("Error fetching featured athletes:", err)
        setError(`Featured athletes error: ${err instanceof Error ? err.message : String(err)}`)
        setFeaturedAthletes([]) // FIX: Always set to empty array on error
      } finally {
        setAthletesLoading(false)
      }
    }

    fetchFeaturedAthletes()
  }, [yearFilter])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        const url = yearFilter === "All" ? "/api/stats" : `/api/stats?year=${yearFilter}`

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "API returned unsuccessful response")
        }

        const apiStats = data.stats

        const newStats = {
          total: apiStats.totalAthletes || 0,
          male: apiStats.genderBreakdown?.male || 0,
          female: apiStats.genderBreakdown?.female || 0,
          divisions: {
            D1: apiStats.divisionBreakdown?.D1 || 0,
            D2: apiStats.divisionBreakdown?.D2 || 0,
            D3: apiStats.divisionBreakdown?.D3 || 0,
            NAIA: apiStats.divisionBreakdown?.NAIA || 0,
            NJCAA: apiStats.divisionBreakdown?.NJCAA || 0,
          },
        }

        setStats(newStats)
        setError(null)
      } catch (err) {
        console.error("Error fetching stats:", err)
        setError(`Stats fetch error: ${err instanceof Error ? err.message : String(err)}`)

        setStats({
          total: 0,
          male: 0,
          female: 0,
          divisions: {
            D1: 0,
            D2: 0,
            D3: 0,
            NAIA: 0,
            NJCAA: 0,
          },
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [yearFilter])

  useEffect(() => {
    const fetchFeaturedRankings = async () => {
      try {
        setRankingsLoading(true)
        setError(null)

        // Fetch from both 2026 and 2027, get top 3 from each
        const [response2026, response2027] = await Promise.all([
          fetch(`/api/prospects?graduationYear=2026&limit=50`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          }),
          fetch(`/api/prospects?graduationYear=2027&limit=50`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          }),
        ])

        const data2026 = response2026.ok ? await response2026.json() : { prospects: [] }
        const data2027 = response2027.ok ? await response2027.json() : { prospects: [] }

        const prospects2026 = Array.isArray(data2026.prospects) ? data2026.prospects : []
        const prospects2027 = Array.isArray(data2027.prospects) ? data2027.prospects : []
        
        // Get top 3 from each year, sorted by ranking
        const top2026 = prospects2026
          .filter((p: Athlete) => p.prospect_ranking != null)
          .sort((a: Athlete, b: Athlete) => {
            const rankA = typeof a.prospect_ranking === 'string' ? parseInt(a.prospect_ranking) : (a.prospect_ranking || 999)
            const rankB = typeof b.prospect_ranking === 'string' ? parseInt(b.prospect_ranking) : (b.prospect_ranking || 999)
            return rankA - rankB
          })
          .slice(0, 3)

        const top2027 = prospects2027
          .filter((p: Athlete) => p.prospect_ranking != null)
          .sort((a: Athlete, b: Athlete) => {
            const rankA = typeof a.prospect_ranking === 'string' ? parseInt(a.prospect_ranking) : (a.prospect_ranking || 999)
            const rankB = typeof b.prospect_ranking === 'string' ? parseInt(b.prospect_ranking) : (b.prospect_ranking || 999)
            return rankA - rankB
          })
          .slice(0, 3)

        // Combine: 2026 first, then 2027
        setFeaturedRankings([...top2026, ...top2027])
        setError(null)
      } catch (err) {
        console.error("Error fetching featured rankings:", err)
        setError(`Rankings error: ${err instanceof Error ? err.message : String(err)}`)
        setFeaturedRankings([])
      } finally {
        setRankingsLoading(false)
      }
    }

    fetchFeaturedRankings()
  }, [])

  useEffect(() => {
    const fetchLatestCommits = async () => {
      try {
        setCommitsLoading(true)
        setError(null)

        const response = await fetch(`/api/featured-athletes?limit=10`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "API returned unsuccessful response")
        }

        const athletes = Array.isArray(data.athletes) ? data.athletes : []
        
        // API already returns top 3 most recent commits, sorted
        const recentCommits = athletes.slice(0, 3)

        setLatestCommits(normalizeAthleteList(recentCommits))
        setError(null)
      } catch (err) {
        console.error("Error fetching latest commits:", err)
        setError(`Latest commits error: ${err instanceof Error ? err.message : String(err)}`)
        setLatestCommits([])
      } finally {
        setCommitsLoading(false)
      }
    }

    fetchLatestCommits()
  }, [])

  const getDisplayAthletes = () => {
    if (!Array.isArray(featuredAthletes)) return []
    return featuredAthletes.slice(0, 3)
  }

  return (
    <main className="container mx-auto px-4 py-8 bg-white">

      {/* Hero Section - Modern Two-Column Layout */}
      <section className="relative mb-16 overflow-hidden rounded-xl shadow-2xl">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-banner-nc-wrestling-arena.png"
            alt="NC Wrestling Arena with State Flag"
            fill
            className="object-cover object-center"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
          />
          {/* Brand-aligned navy + gold overlay - balanced for image visibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#002147]/60 via-[#002147]/70 to-[#002147]/60 transition-opacity duration-300" />
          <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-tr from-[#D3B574]/20 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Content Layer - Two Column Layout on Desktop */}
        <div className="relative z-10 min-h-[400px] md:min-h-[500px] flex flex-col md:flex-row">
          {/* Left Column: Text Content */}
          <div className="flex-1 flex flex-col justify-center p-8 md:p-12 lg:p-16">
            <div className="max-w-2xl">
              <h1 className="mb-6 text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                Recruit
                <span className="block md:inline">
                  <span className="underline decoration-4 underline-offset-4" style={{ color: "#D3B574" }}>
                    NC
                  </span>{" "}
                  Portal
                </span>
              </h1>
              <p className="mb-8 text-lg md:text-xl text-white/95 leading-relaxed max-w-xl">
                Tracking North Carolina's top wrestling prospects and their college commitments. Stay updated with the
                latest prospect rankings and explore where NC wrestlers are heading for their collegiate careers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Commitments Button */}
                <Link href="/athletes">
                  <Button 
                    className="min-h-[52px] px-6 md:px-8 text-base md:text-lg font-semibold text-white hover:opacity-95 transition-all hover:scale-105 shadow-lg" 
                    style={{ backgroundColor: "#BC0B03" }}
                  >
                    Commitments
                  </Button>
                </Link>
                {/* Rankings Button */}
                <Link href="/public-rankings">
                  <Button
                    variant="outline"
                    className="min-h-[52px] px-6 md:px-8 text-base md:text-lg font-semibold bg-transparent border-2 border-white text-white hover:bg-white/15 hover:text-white hover:border-white/80 transition-all hover:scale-105"
                  >
                    Rankings
                  </Button>
                </Link>
                {/* Prospects Button */}
                <Link href="/prospects/all">
                  <Button
                    className="min-h-[52px] px-6 md:px-8 text-base md:text-lg font-semibold text-white hover:opacity-95 transition-all hover:scale-105 shadow-lg"
                    style={{ backgroundColor: "#002147" }}
                  >
                    Prospects
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Image Showcase (Desktop Only) */}
          <div className="hidden lg:block flex-1 relative">
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="relative w-full h-full max-w-md">
                {/* Subtle decorative element or additional visual */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#D3B574]/10 to-transparent rounded-2xl"></div>
              </div>
            </div>
          </div>

          {/* Mobile Scroll Indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:hidden animate-bounce">
            <div className="flex flex-col items-center text-white/80">
              <span className="text-xs mb-1">Scroll for more</span>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold" style={{ color: "#002147" }}>
          Features
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="overflow-hidden border-t-4 transition-all hover:shadow-lg hover:-translate-y-1" style={{ borderTopColor: "#BC0B03" }}>
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold" style={{ color: "#BC0B03" }}>
                Athlete Profiles
              </h3>
              <p className="text-gray-600">
                Detailed profiles of NC wrestlers including their high school, graduation year, college commitment, and
                achievements.
              </p>
            </CardContent>
          </Card>

          <Link href="/colleges" className="block">
            <Card className="overflow-hidden border-t-4 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer" style={{ borderTopColor: "#002147" }}>
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-semibold" style={{ color: "#002147" }}>
                  College Insights
                </h3>
                <p className="text-gray-600">
                  Explore which colleges are recruiting NC wrestlers and see the breakdown by division and conference.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/public-rankings" className="block">
            <Card className="overflow-hidden border-t-4 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer" style={{ borderTopColor: "#D3B574" }}>
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-50">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-semibold" style={{ color: "#D3B574" }}>
                  Prospect Rankings
                </h3>
                <p className="text-gray-600">
                  View comprehensive rankings of top wrestling prospects by graduation year, weight class, and style.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Featured Rankings Section */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold" style={{ color: "#002147" }}>
            Featured Rankings
          </h2>
          <Link href="/public-rankings">
            <Button
              variant="outline"
              size="sm"
              className="hover:opacity-80 bg-transparent"
              style={{ borderColor: "#002147", color: "#002147" }}
            >
              View All Rankings
            </Button>
          </Link>
        </div>

        {rankingsLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading featured rankings...</p>
          </div>
        ) : featuredRankings.length > 0 ? (
          <div className="space-y-8">
            {/* Class of 2026 Section */}
            {featuredRankings.filter((a) => a.graduationyear === 2026).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: "#002147" }}>
                  Class of 2026
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {featuredRankings
                    .filter((athlete) => athlete.graduationyear === 2026)
                    .map((athlete) => (
                      <Link key={athlete.id} href={`/athletes/${athlete.id}`}>
                        <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              {athlete.photourl && (
                                <div className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden">
                                  <Image
                                    src={athlete.photourl}
                                    alt={athlete.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-bold text-lg" style={{ color: "#002147" }}>
                                    {athlete.name}
                                  </h3>
                                  {athlete.prospect_ranking && (
                                    <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: "#D3B574" }}>
                                      #{athlete.prospect_ranking}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-1">{athlete.highschool}</p>
                                <p className="text-xs text-gray-500">
                                  {athlete.weightclass} lbs
                                </p>
                                {athlete.achievements && athlete.achievements.length > 0 && (
                                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                                    {Array.isArray(athlete.achievements) 
                                      ? athlete.achievements.slice(0, 2).join(", ")
                                      : athlete.achievements}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {/* Class of 2027 Section */}
            {featuredRankings.filter((a) => a.graduationyear === 2027).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: "#002147" }}>
                  Class of 2027
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {featuredRankings
                    .filter((athlete) => athlete.graduationyear === 2027)
                    .map((athlete) => (
                      <Link key={athlete.id} href={`/athletes/${athlete.id}`}>
                        <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              {athlete.photourl && (
                                <div className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden">
                                  <Image
                                    src={athlete.photourl}
                                    alt={athlete.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-bold text-lg" style={{ color: "#002147" }}>
                                    {athlete.name}
                                  </h3>
                                  {athlete.prospect_ranking && (
                                    <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: "#D3B574" }}>
                                      #{athlete.prospect_ranking}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-1">{athlete.highschool}</p>
                                <p className="text-xs text-gray-500">
                                  {athlete.weightclass} lbs
                                </p>
                                {athlete.achievements && athlete.achievements.length > 0 && (
                                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                                    {Array.isArray(athlete.achievements) 
                                      ? athlete.achievements.slice(0, 2).join(", ")
                                      : athlete.achievements}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No ranked prospects available for Class of 2026 or 2027.</p>
          </div>
        )}
      </section>

      {/* Latest Commits Section */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold" style={{ color: "#002147" }}>
            Latest Commits
          </h2>
          <Link href="/athletes">
            <Button
              variant="outline"
              size="sm"
              className="hover:opacity-80 bg-transparent"
              style={{ borderColor: "#002147", color: "#002147" }}
            >
              View All Athletes
            </Button>
          </Link>
        </div>

        {commitsLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading latest commits...</p>
          </div>
        ) : latestCommits.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {latestCommits.map((athlete) => (
              <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No recent commits available at this time.</p>
            {error && (
              <p className="text-sm mt-2" style={{ color: "#BC0B03" }}>
                {error}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <Link href="/athletes">
            <Button className="text-white hover:opacity-90" style={{ backgroundColor: "#002147" }}>
              View All Commitments
            </Button>
          </Link>
        </div>
      </section>

      {/* Commitment Statistics - moved below Latest Commits */}
      <section className="mb-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold" style={{ color: "#002147" }}>
            Commitment Statistics
          </h2>

          <div className="flex flex-wrap gap-2">
            {(["All", "2025", "2026"] as YearFilter[]).map((year) => (
              <Button
                key={year}
                variant={yearFilter === year ? "default" : "outline"}
                size="sm"
                onClick={() => setYearFilter(year)}
                className="text-xs sm:text-sm"
                style={{
                  backgroundColor: yearFilter === year ? "#002147" : "transparent",
                  borderColor: "#002147",
                  color: yearFilter === year ? "white" : "#002147",
                }}
              >
                {year === "All" ? "All Years" : `Class of ${year}`}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading statistics...</p>
          </div>
        ) : (
          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-7 lg:gap-6">
            {/* Total Commitments Card */}
            <Card className="border overflow-hidden lg:col-span-2 border-blue-200" style={{ borderColor: "#002147", borderOpacity: 0.3 }}>
              <div className="h-2" style={{ backgroundColor: "#002147" }}></div>
              <CardContent className="p-4">
                <h3 className="text-lg font-medium mb-1" style={{ color: "#002147" }}>
                  Total Commitments
                </h3>
                <p className="text-xs mb-2" style={{ color: "#002147", opacity: 0.7 }}>
                  Tracking Class of 2025 and beyond
                </p>
                <div className="flex justify-between items-center py-2">
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-semibold" style={{ color: "#002147" }}>
                      {stats.male}
                    </span>
                    <span className="text-xs" style={{ color: "#002147", opacity: 0.7 }}>
                      Male
                    </span>
                  </div>

                  <span className="text-4xl lg:text-5xl font-bold text-center" style={{ color: "#002147" }}>
                    {stats.total}
                  </span>

                  <div className="flex flex-col items-center">
                    <span className="text-xl font-semibold" style={{ color: "#BC0B03" }}>
                      {stats.female}
                    </span>
                    <span className="text-xs" style={{ color: "#BC0B03", opacity: 0.7 }}>
                      Female
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Division Breakdown Card */}
            <Card className="border overflow-hidden lg:col-span-5 border-yellow-200" style={{ borderColor: "#D3B574", borderOpacity: 0.3 }}>
              <div className="h-2" style={{ backgroundColor: "#D3B574" }}></div>
              <CardContent className="p-4">
                <h3 className="text-lg font-medium mb-2" style={{ color: "#D3B574" }}>
                  Division Breakdown
                </h3>
                <div className="grid grid-cols-5 gap-2 lg:gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-full h-16 rounded-t-md flex items-end justify-center overflow-hidden bg-gray-100">
                      <div
                        className="w-full transition-all duration-300"
                        style={{
                          backgroundColor: "#002147",
                          height: `${stats.total ? Math.max((stats.divisions.D1 / stats.total) * 100, 8) : 0}%`,
                        }}
                      ></div>
                    </div>
                    <div
                      className="text-white font-bold py-1 px-1 lg:px-2 rounded-b-md text-center w-full text-sm lg:text-base"
                      style={{ backgroundColor: "#002147" }}
                    >
                      {stats.divisions.D1}
                    </div>
                    <span className="text-xs font-medium mt-1" style={{ color: "#002147" }}>
                      D1
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-full h-16 rounded-t-md flex items-end justify-center overflow-hidden bg-gray-100">
                      <div
                        className="w-full transition-all duration-300"
                        style={{
                          backgroundColor: "#012ECD",
                          height: `${stats.total ? Math.max((stats.divisions.D2 / stats.total) * 100, 8) : 0}%`,
                        }}
                      ></div>
                    </div>
                    <div
                      className="text-white font-bold py-1 px-1 lg:px-2 rounded-b-md text-center w-full text-sm lg:text-base"
                      style={{ backgroundColor: "#012ECD" }}
                    >
                      {stats.divisions.D2}
                    </div>
                    <span className="text-xs font-medium mt-1" style={{ color: "#012ECD" }}>
                      D2
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-full h-16 rounded-t-md flex items-end justify-center overflow-hidden bg-gray-100">
                      <div
                        className="w-full transition-all duration-300"
                        style={{
                          backgroundColor: "#002147",
                          height: `${stats.total ? Math.max((stats.divisions.D3 / stats.total) * 100, 8) : 0}%`,
                        }}
                      ></div>
                    </div>
                    <div
                      className="text-white font-bold py-1 px-1 lg:px-2 rounded-b-md text-center w-full text-sm lg:text-base"
                      style={{ backgroundColor: "#002147" }}
                    >
                      {stats.divisions.D3}
                    </div>
                    <span className="text-xs font-medium mt-1" style={{ color: "#002147" }}>
                      D3
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-full h-16 rounded-t-md flex items-end justify-center overflow-hidden bg-gray-100">
                      <div
                        className="w-full transition-all duration-300"
                        style={{
                          backgroundColor: "#D3B574",
                          height: `${stats.total ? Math.max((stats.divisions.NAIA / stats.total) * 100, 8) : 0}%`,
                        }}
                      ></div>
                    </div>
                    <div
                      className="font-bold py-1 px-1 lg:px-2 rounded-b-md text-center w-full text-sm lg:text-base"
                      style={{ backgroundColor: "#D3B574", color: "#002147" }}
                    >
                      {stats.divisions.NAIA}
                    </div>
                    <span className="text-xs font-medium mt-1" style={{ color: "#D3B574" }}>
                      NAIA
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-full h-16 rounded-t-md flex items-end justify-center overflow-hidden bg-gray-100">
                      <div
                        className="w-full transition-all duration-300"
                        style={{
                          backgroundColor: "#BC0B03",
                          height: `${stats.total ? Math.max((stats.divisions.NJCAA / stats.total) * 100, 8) : 0}%`,
                        }}
                      ></div>
                    </div>
                    <div
                      className="text-white font-bold py-1 px-1 lg:px-2 rounded-b-md text-center w-full text-sm lg:text-base"
                      style={{ backgroundColor: "#BC0B03" }}
                    >
                      {stats.divisions.NJCAA}
                    </div>
                    <span className="text-xs font-medium mt-1" style={{ color: "#BC0B03" }}>
                      NJCAA
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Information Banner */}
      <div className="mb-12 rounded-lg p-4 text-white" style={{ backgroundColor: "#002147" }}>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold">Submit or Update Wrestling Information</h2>
            <p>
              Help us keep our database current by submitting new commitments or requesting updates to existing
              profiles.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/submit-commitment">
              <Button
                className="flex items-center gap-2 text-white hover:opacity-90"
                style={{ backgroundColor: "#BC0B03" }}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Submit New Commitment
              </Button>
            </Link>
            <Link href="/request-edit">
              <Button variant="outline" className="border-white bg-transparent text-white hover:bg-white/10">
                Request Profile Edit
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
