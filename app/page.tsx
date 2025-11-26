"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useState, useEffect } from "react"
import "./athletes/flip-card.css"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthleteList } from "@/lib/professional-athlete"

type YearFilter = "All" | "2025" | "2026" | "2027"

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

  const getDisplayAthletes = () => {
    if (!Array.isArray(featuredAthletes)) return []
    return featuredAthletes.slice(0, 3)
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="relative mb-12 overflow-hidden rounded-lg">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-banner-nc-wrestling-arena.png"
            alt="NC Wrestling Arena with State Flag"
            fill
            className="object-cover object-center"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
          />
          {/* Brand-aligned navy + gold overlay to improve readability - lighter so image shows through */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1e50]/50 via-[#03154C]/60 to-[#03154C]/50" />
          <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-tr from-[#D3B574]/15 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="relative z-10 p-6 md:p-12 min-h-[320px] md:min-h-[420px] flex flex-col justify-center">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-4 text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              Recruit
              <span className="underline decoration-4 underline-offset-4" style={{ color: "#D3B574" }}>
                NC
              </span>{" "}
              Portal
            </h1>
            <p className="mb-6 text-base md:text-lg text-white/90">
              Tracking North Carolina's top wrestling prospects and their college commitments. Stay updated with the
              latest rankings and explore where NC wrestlers are heading for their collegiate careers.
            </p>
            <div className="flex flex-wrap gap-4">
              {/* Primary CTA: commitments */}
              <Link href="/athletes">
                <Button className="min-h-[44px] px-6 text-white hover:opacity-90" style={{ backgroundColor: "#BC0B03" }}>
                  View Commitments
                </Button>
              </Link>
              {/* Secondary CTA: rankings */}
              <Link href="/public-rankings">
                <Button
                  variant="outline"
                  className="min-h-[44px] px-6 bg-transparent border-white text-white hover:bg-white/10 hover:text-white"
                >
                  View Top Prospects
                </Button>
              </Link>
            </div>
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:hidden animate-bounce">
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
        <h2 className="mb-6 text-2xl font-bold" style={{ color: "#03154C" }}>
          Features
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card
            className="overflow-hidden border-t-4 transition-all hover:shadow-md"
            style={{ borderTopColor: "#BC0B03" }}
          >
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

          <Card
            className="overflow-hidden border-t-4 transition-all hover:shadow-md"
            style={{ borderTopColor: "#13294B" }}
          >
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
              <h3 className="mb-2 text-xl font-semibold" style={{ color: "#13294B" }}>
                College Insights
              </h3>
              <p className="text-gray-600">
                Explore which colleges are recruiting NC wrestlers and see the breakdown by division and conference.
              </p>
            </CardContent>
          </Card>

          <Link href="/public-rankings" className="block">
            <Card
              className="overflow-hidden border-t-4 transition-all hover:shadow-md cursor-pointer"
              style={{ borderTopColor: "#D3B574" }}
            >
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

      {/* Stats Overview */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: "#03154C" }}>
            Commitment Statistics
          </h2>

          <div className="flex gap-2">
            {(["All", "2025", "2026", "2027"] as YearFilter[]).map((year) => (
              <Button
                key={year}
                variant={yearFilter === year ? "default" : "outline"}
                size="sm"
                onClick={() => setYearFilter(year)}
                style={{
                  backgroundColor: yearFilter === year ? "#13294B" : "transparent",
                  borderColor: "#13294B",
                  color: yearFilter === year ? "white" : "#13294B",
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
            <Card
              className="border-blue-200 overflow-hidden lg:col-span-2"
              style={{ borderColor: "#13294B", borderOpacity: 0.3 }}
            >
              <div className="h-2" style={{ backgroundColor: "#13294B" }}></div>
              <CardContent className="p-4">
                <h3 className="text-lg font-medium mb-1" style={{ color: "#13294B" }}>
                  Total Commitments
                </h3>
                <p className="text-xs mb-2" style={{ color: "#13294B", opacity: 0.7 }}>
                  Tracking Class of 2025 and beyond
                </p>
                <div className="flex justify-between items-center py-2">
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-semibold" style={{ color: "#13294B" }}>
                      {stats.male}
                    </span>
                    <span className="text-xs" style={{ color: "#13294B", opacity: 0.7 }}>
                      Male
                    </span>
                  </div>

                  <span className="text-4xl lg:text-5xl font-bold text-center" style={{ color: "#03154C" }}>
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
            <Card
              className="border-yellow-200 overflow-hidden lg:col-span-5"
              style={{ borderColor: "#D3B574", borderOpacity: 0.3 }}
            >
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
                          backgroundColor: "#03154C",
                          height: `${stats.total ? Math.max((stats.divisions.D1 / stats.total) * 100, 8) : 0}%`,
                        }}
                      ></div>
                    </div>
                    <div
                      className="text-white font-bold py-1 px-1 lg:px-2 rounded-b-md text-center w-full text-sm lg:text-base"
                      style={{ backgroundColor: "#03154C" }}
                    >
                      {stats.divisions.D1}
                    </div>
                    <span className="text-xs font-medium mt-1" style={{ color: "#03154C" }}>
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
                          backgroundColor: "#13294B",
                          height: `${stats.total ? Math.max((stats.divisions.D3 / stats.total) * 100, 8) : 0}%`,
                        }}
                      ></div>
                    </div>
                    <div
                      className="text-white font-bold py-1 px-1 lg:px-2 rounded-b-md text-center w-full text-sm lg:text-base"
                      style={{ backgroundColor: "#13294B" }}
                    >
                      {stats.divisions.D3}
                    </div>
                    <span className="text-xs font-medium mt-1" style={{ color: "#13294B" }}>
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
                      style={{ backgroundColor: "#D3B574", color: "#03154C" }}
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

      {/* Featured Athletes Section */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold" style={{ color: "#03154C" }}>
            Featured Commitments
          </h2>
          <Link href="/athletes">
            <Button
              variant="outline"
              size="sm"
              className="hover:opacity-80 bg-transparent"
              style={{ borderColor: "#03154C", color: "#03154C" }}
            >
              View All Athletes
            </Button>
          </Link>
        </div>

        {athletesLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading featured athletes...</p>
          </div>
        ) : featuredAthletes.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {getDisplayAthletes().map((athlete) => (
              <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No featured athletes available at this time.</p>
            {error && (
              <p className="text-sm mt-2" style={{ color: "#BC0B03" }}>
                {error}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <Link href="/athletes">
            <Button className="text-white hover:opacity-90" style={{ backgroundColor: "#03154C" }}>
              View All Commitments
            </Button>
          </Link>
        </div>
      </section>

      {/* Information Banner */}
      <div className="mb-12 rounded-lg p-4 text-white" style={{ backgroundColor: "#13294B" }}>
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
