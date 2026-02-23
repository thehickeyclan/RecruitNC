"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Search, Users, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import NHSCAPerformanceCharts from "@/components/nhsca-performance-charts"
import { NHSCAChampionsTabs } from "@/components/nhsca-champions-tabs"
import { supabase } from "@/lib/supabase"

// NC United Brand Colors
const NC_NAVY = "#002147"
const NC_RED = "#B31B1B"
const NC_GOLD = "#CBAF5D"

interface Wrestler {
  id: string
  athlete_name: string
  year: number
  weight: string
  placement: number
  division: string
  state: string
  high_school: string
  club: string
}

// Multi-Time All-Americans data (static - historical)
const MULTI_TIME_AAS = [
  { name: "Lorenzo Alston", times: 3, years: "2023, 2024, 2025" },
  { name: "Keyshon Morrison", times: 2, years: "2024, 2025" },
  { name: "Jack Harty", times: 2, years: "2024, 2025" },
  { name: "Cooper Foster", times: 2, years: "2024, 2025" },
  { name: "Liam Hickey", times: 2, years: "2024, 2025" },
  { name: "Hayden Haynes", times: 2, years: "2024, 2025" },
  { name: "Bentley Sly", times: 2, years: "2024, 2025" },
]

// State comparison data for National Comparison chart
const STATE_DATA_2025 = [
  { state: "PA", Freshman: 17, Sophomore: 13, Junior: 13, Senior: 3, total: 46, isNC: false },
  { state: "NY", Freshman: 8, Sophomore: 9, Junior: 6, Senior: 6, total: 29, isNC: false },
  { state: "NJ", Freshman: 0, Sophomore: 10, Junior: 6, Senior: 10, total: 26, isNC: false },
  { state: "VA", Freshman: 8, Sophomore: 10, Junior: 4, Senior: 4, total: 26, isNC: false },
  { state: "NC", Freshman: 7, Sophomore: 6, Junior: 2, Senior: 9, total: 24, isNC: true },
  { state: "GA", Freshman: 5, Sophomore: 8, Junior: 4, Senior: 5, total: 22, isNC: false },
  { state: "OH", Freshman: 3, Sophomore: 5, Junior: 6, Senior: 6, total: 20, isNC: false },
  { state: "FL", Freshman: 4, Sophomore: 5, Junior: 5, Senior: 6, total: 20, isNC: false },
  { state: "CA", Freshman: 3, Sophomore: 6, Junior: 6, Senior: 4, total: 19, isNC: false },
  { state: "KS", Freshman: 5, Sophomore: 4, Junior: 3, Senior: 3, total: 15, isNC: false },
  { state: "AZ", Freshman: 4, Sophomore: 5, Junior: 2, Senior: 3, total: 14, isNC: false },
  { state: "MO", Freshman: 1, Sophomore: 6, Junior: 3, Senior: 3, total: 13, isNC: false },
  { state: "UT", Freshman: 5, Sophomore: 3, Junior: 1, Senior: 2, total: 11, isNC: false },
  { state: "MA", Freshman: 4, Sophomore: 1, Junior: 2, Senior: 3, total: 10, isNC: false },
  { state: "AL", Freshman: 4, Sophomore: 2, Junior: 2, Senior: 1, total: 9, isNC: false },
]

// Division national standings
const DIVISION_STANDINGS = [
  {
    division: "Senior",
    rank: 1,
    allAmericans: 9,
    color: "#2563eb", // Blue
    highlights: ["3 third-place finishers", "2 fourth-place finishers", "4 additional All-Americans"],
  },
  {
    division: "Sophomore",
    rank: 3,
    allAmericans: 6,
    color: NC_RED,
    highlights: [
      "1 sixth-place finisher",
      "3 seventh-place finishers",
      "2 eighth-place finishers",
      "3 returning All-Americans from 2024",
    ],
  },
  {
    division: "Junior",
    rank: 13,
    allAmericans: 2,
    color: NC_GOLD,
    highlights: [
      "1 national finalist (2nd place)",
      "1 third-place finisher",
      "Multiple wins over nationally ranked opponents",
    ],
  },
  {
    division: "Freshman",
    rank: 5,
    allAmericans: 7,
    color: NC_NAVY,
    highlights: [
      "1 fourth-place finisher",
      "1 fifth-place finisher",
      "1 sixth-place finisher",
      "1 seventh-place finisher",
      "3 eighth-place finishers",
    ],
  },
]

interface CollegeCommit {
  id: string
  name: string
  firstName: string
  lastName: string
  college: string
  collegeLogoUrl: string | null
  recruiting_status: string
}

export default function NHSCA2025Page() {
  const [wrestlers, setWrestlers] = useState<Wrestler[]>([])
  const [filteredWrestlers, setFilteredWrestlers] = useState<Wrestler[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [collegeCommitments, setCollegeCommitments] = useState<CollegeCommit[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [divisionFilter, setDivisionFilter] = useState("all")
  const [weightFilter, setWeightFilter] = useState("all")
  const [showAllStates, setShowAllStates] = useState(false)
  const [chartViewMode, setChartViewMode] = useState<"chart" | "table" | "summary">("chart")

  // Load data via RecruitNC Supabase client (male divisions only: Freshman, Sophomore, Junior, Senior)
  const MALE_DIVISIONS = ["Freshman", "Sophomore", "Junior", "Senior"]

  useEffect(() => {
    const load = async () => {
      try {
        const [resultsResponse, commitsResponse] = await Promise.all([
          supabase
            .from("wrestling_nhsca_results")
            .select("*")
            .eq("year", 2025)
            .in("division", MALE_DIVISIONS)
            .gte("placement", 1)
            .lte("placement", 8)
            .order("division")
            .order("weight")
            .order("placement"),
          supabase
            .from("athletes")
            .select("id, name, firstName, lastName, college, collegeLogoUrl, recruiting_status")
            .in("recruiting_status", ["Committed", "College Athlete", "committed", "college athlete"])
            .not("college", "is", null),
        ])

        if (resultsResponse.error) throw resultsResponse.error
        if (commitsResponse.error) throw commitsResponse.error

        setWrestlers((resultsResponse.data as Wrestler[]) || [])
        setFilteredWrestlers((resultsResponse.data as Wrestler[]) || [])
        setCollegeCommitments((commitsResponse.data as CollegeCommit[]) || [])
      } catch (error) {
        console.error("Error loading 2025 results:", error)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  // Filter wrestlers
  useEffect(() => {
    let filtered = wrestlers

    if (searchTerm) {
      filtered = filtered.filter(
        (wrestler) =>
          (wrestler.athlete_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (wrestler.high_school || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (wrestler.club || "").toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (divisionFilter !== "all") {
      filtered = filtered.filter((wrestler) => wrestler.division === divisionFilter)
    }

    if (weightFilter !== "all") {
      filtered = filtered.filter((wrestler) => wrestler.weight === weightFilter)
    }

    setFilteredWrestlers(filtered)
  }, [wrestlers, searchTerm, divisionFilter, weightFilter])

  // Compute stats
  const stats = useMemo(() => {
    const totalAA = wrestlers.length
    const byDivision = {
      Freshman: wrestlers.filter((w) => w.division === "Freshman").length,
      Sophomore: wrestlers.filter((w) => w.division === "Sophomore").length,
      Junior: wrestlers.filter((w) => w.division === "Junior").length,
      Senior: wrestlers.filter((w) => w.division === "Senior").length,
    }
    return { totalAA, byDivision }
  }, [wrestlers])

  // Top performing clubs
  const topClubs = useMemo(() => {
    const clubCounts: Record<string, number> = {}
    wrestlers.forEach((w) => {
      if (w.club && w.club !== "No Club" && w.club.trim() !== "") {
        clubCounts[w.club] = (clubCounts[w.club] || 0) + 1
      }
    })
    return Object.entries(clubCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))
  }, [wrestlers])

  // Top performing high schools
  const topSchools = useMemo(() => {
    const schoolCounts: Record<string, number> = {}
    wrestlers.forEach((w) => {
      if (w.high_school && w.high_school.trim() !== "") {
        schoolCounts[w.high_school] = (schoolCounts[w.high_school] || 0) + 1
      }
    })
    return Object.entries(schoolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))
  }, [wrestlers])

  const divisions = [...new Set(wrestlers.map((w) => w.division))].sort()
  const weights = [...new Set(wrestlers.map((w) => w.weight))].sort((a, b) => {
    const aNum = Number.parseInt(a.replace("lbs", ""))
    const bNum = Number.parseInt(b.replace("lbs", ""))
    return aNum - bNum
  })

  const getPlacementBadge = (placement: number) => {
    if (placement === 1) return { bg: "bg-yellow-500", text: "1st" }
    if (placement === 2) return { bg: "bg-gray-400", text: "2nd" }
    if (placement === 3) return { bg: "bg-amber-600", text: "3rd" }
    return { bg: "bg-[#002147]", text: `${placement}th` }
  }

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"]
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  const groupedCollegeCommits = useMemo(() => {
    const allAmericanNames = new Set(wrestlers.map((w) => w.athlete_name.toLowerCase()))

    const relevantCommits = collegeCommitments.filter((commit) => {
      const fullName = commit.name || `${commit.firstName} ${commit.lastName}`
      return allAmericanNames.has(fullName.toLowerCase())
    })

    const grouped: Record<string, { wrestlers: string[]; logoUrl: string | null }> = {}
    relevantCommits.forEach((commit) => {
      const fullName = commit.name || `${commit.firstName} ${commit.lastName}`
      if (!grouped[commit.college]) {
        grouped[commit.college] = { wrestlers: [], logoUrl: commit.collegeLogoUrl }
      }
      grouped[commit.college].wrestlers.push(fullName)
    })

    return Object.entries(grouped).map(([college, data]) => ({
      college,
      wrestlers: data.wrestlers,
      logoUrl: data.logoUrl,
    }))
  }, [collegeCommitments, wrestlers])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002147] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading 2025 NHSCA Results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#002147] text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Image
              src="/images/nc-united-logo.png"
              alt="NC Wrestling United"
              width={60}
              height={60}
              className="rounded-full bg-white p-1"
            />
            <div>
              <h1 className="text-2xl font-bold">NC Wrestling United</h1>
              <p className="text-white/70 text-sm">2025 NHSCA National Championships</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/nhsca" className="inline-flex items-center gap-2 text-[#002147] hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to NHSCA
        </Link>

        {/* Performance Analysis Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#002147] mb-2">NHSCA Performance Analysis</h2>
          <p className="text-gray-600">North Carolina&apos;s male All-Americans (Freshman, Sophomore, Junior, Senior divisions) at the 2025 NHSCA Nationals.</p>
        </div>

        {/* Key Stats Cards */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#002147]">North Carolina NHSCA Performance 2025 (Boys)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-[#002147] text-white rounded-xl p-6 text-center">
                <div className="text-5xl font-bold">{stats.totalAA}</div>
                <div className="text-white/80 mt-1">Total All-Americans</div>
              </div>
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <div className="text-5xl font-bold text-[#002147]">#5</div>
                <div className="text-gray-600 mt-1">National Ranking</div>
                <div className="text-sm text-gray-500">Out of 46 states</div>
              </div>
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <div className="text-5xl font-bold text-[#002147]">60%</div>
                <div className="text-gray-600 mt-1">Growth from 2024</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* National Standing Section */}
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="bg-[#002147] text-white">
            <CardTitle>North Carolina&apos;s National Standing</CardTitle>
            <p className="text-white/70 text-sm">2025 NHSCA Nationals Team Performance</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              {DIVISION_STANDINGS.map((div) => (
                <div key={div.division} className="rounded-xl p-6 text-white" style={{ backgroundColor: div.color }}>
                  <div className="text-sm opacity-80">{div.division} Division</div>
                  <div className="text-3xl font-bold mt-1">{getOrdinal(div.rank)} Place Nationally</div>
                  <div className="mt-2">{div.allAmericans} All-Americans</div>
                  <ul className="mt-4 space-y-1 text-sm opacity-90">
                    {div.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span>•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Historic Achievement Banner */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-[#002147]">Historic Achievement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-4xl font-bold text-[#002147]">{stats.totalAA} Total All-Americans</div>
                <div className="text-gray-600">Highest combined total in state history</div>
                <div className="text-gray-500 text-sm">60% increase from 2024 performance</div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#B31B1B]">{stats.byDivision.Freshman}</div>
                  <div className="text-sm text-gray-600">Freshman</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#CBAF5D]">{stats.byDivision.Sophomore}</div>
                  <div className="text-sm text-gray-600">Sophomore</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#2563eb]">{stats.byDivision.Junior}</div>
                  <div className="text-sm text-gray-600">Junior</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#f59e0b]">{stats.byDivision.Senior}</div>
                  <div className="text-sm text-gray-600">Senior</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8">
          <NHSCAPerformanceCharts />
        </div>

        {/* National Comparison */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#002147]">National Comparison</CardTitle>
                <p className="text-[#002147]/70 text-sm mt-1">
                  How North Carolina compares to other states at the 2025 NHSCA Nationals
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Card className="overflow-hidden">
              <CardHeader className="bg-[#002147] text-white flex flex-row items-center justify-between">
                <CardTitle className="text-[#CBAF5D]">2025 NHSCA All-Americans by State (All Divisions)</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={!showAllStates ? "secondary" : "ghost"}
                    onClick={() => setShowAllStates(false)}
                    className={!showAllStates ? "bg-white text-[#002147]" : "text-white hover:bg-white/20"}
                  >
                    Top 15 States
                  </Button>
                  <Button
                    size="sm"
                    variant={showAllStates ? "secondary" : "ghost"}
                    onClick={() => setShowAllStates(true)}
                    className={showAllStates ? "bg-white text-[#002147]" : "text-white hover:bg-white/20"}
                  >
                    All States
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* View Mode Tabs */}
                <div className="flex gap-4 mb-6 border-b">
                  <button
                    onClick={() => setChartViewMode("chart")}
                    className={`pb-2 px-1 text-sm font-medium ${chartViewMode === "chart" ? "border-b-2 border-[#002147] text-[#002147]" : "text-gray-500"}`}
                  >
                    Chart View
                  </button>
                  <button
                    onClick={() => setChartViewMode("table")}
                    className={`pb-2 px-1 text-sm font-medium ${chartViewMode === "table" ? "border-b-2 border-[#002147] text-[#002147]" : "text-gray-500"}`}
                  >
                    Table View
                  </button>
                  <button
                    onClick={() => setChartViewMode("summary")}
                    className={`pb-2 px-1 text-sm font-medium ${chartViewMode === "summary" ? "border-b-2 border-[#002147] text-[#002147]" : "text-gray-500"}`}
                  >
                    Summary
                  </button>
                </div>

                {chartViewMode === "chart" && (
                  <div className="space-y-3">
                    {(showAllStates ? STATE_DATA_2025 : STATE_DATA_2025.slice(0, 15)).map((item) => {
                      const maxTotal = Math.max(...STATE_DATA_2025.map((d) => d.total))
                      const barWidthPercent = (item.total / maxTotal) * 100

                      return (
                        <div key={item.state} className="flex items-center gap-3">
                          <div className="w-16 text-right text-sm font-medium text-[#002147]">
                            {item.state}
                            {item.isNC && <span className="ml-1 text-[#CBAF5D]">★</span>}
                          </div>
                          <div className="flex-1">
                            <div className="h-8 flex rounded overflow-hidden" style={{ width: `${barWidthPercent}%` }}>
                              {item.Freshman > 0 && (
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${(item.Freshman / item.total) * 100}%`,
                                    backgroundColor: "#002147",
                                  }}
                                />
                              )}
                              {item.Sophomore > 0 && (
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${(item.Sophomore / item.total) * 100}%`,
                                    backgroundColor: "#B31B1B",
                                  }}
                                />
                              )}
                              {item.Junior > 0 && (
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${(item.Junior / item.total) * 100}%`,
                                    backgroundColor: "#CBAF5D",
                                  }}
                                />
                              )}
                              {item.Senior > 0 && (
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${(item.Senior / item.total) * 100}%`,
                                    backgroundColor: "#3b82f6",
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {/* Legend */}
                    <div className="flex justify-center gap-6 mt-6 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: "#002147" }} />
                        <span className="text-sm text-gray-600">Freshman</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: "#B31B1B" }} />
                        <span className="text-sm text-gray-600">Sophomore</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: "#CBAF5D" }} />
                        <span className="text-sm text-gray-600">Junior</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: "#3b82f6" }} />
                        <span className="text-sm text-gray-600">Senior</span>
                      </div>
                    </div>
                  </div>
                )}

                {chartViewMode === "table" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-[#002147]">State</th>
                          <th className="text-center py-2 px-3 font-medium text-[#002147]">Freshman</th>
                          <th className="text-center py-2 px-3 font-medium text-[#002147]">Sophomore</th>
                          <th className="text-center py-2 px-3 font-medium text-[#002147]">Junior</th>
                          <th className="text-center py-2 px-3 font-medium text-[#002147]">Senior</th>
                          <th className="text-center py-2 px-3 font-medium text-[#002147]">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAllStates ? STATE_DATA_2025 : STATE_DATA_2025.slice(0, 15)).map((item, idx) => (
                          <tr
                            key={item.state}
                            className={`border-b ${item.isNC ? "bg-[#CBAF5D]/10" : idx % 2 === 0 ? "bg-gray-50" : ""}`}
                          >
                            <td className="py-2 px-3 font-medium text-[#002147]">
                              {item.state} {item.isNC && <span className="text-[#CBAF5D]">★</span>}
                            </td>
                            <td className="text-center py-2 px-3">{item.Freshman}</td>
                            <td className="text-center py-2 px-3">{item.Sophomore}</td>
                            <td className="text-center py-2 px-3">{item.Junior}</td>
                            <td className="text-center py-2 px-3">{item.Senior}</td>
                            <td className="text-center py-2 px-3 font-bold">{item.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {chartViewMode === "summary" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-[#002147]">PA</div>
                        <div className="text-sm text-gray-600">Leads with 46 All-Americans</div>
                      </div>
                      <div className="bg-[#CBAF5D]/20 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-[#002147]">NC ★</div>
                        <div className="text-sm text-gray-600">Ranks #5 with 24 All-Americans</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-[#B31B1B]">9</div>
                        <div className="text-sm text-gray-600">NC led nation in Senior division</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* 2025 Summary Section */}
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="bg-[#002147] text-white border-l-4 border-l-green-500">
            <CardTitle>2025 NHSCA Nationals Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Top Stats */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-[#002147]">{stats.totalAA} AA</div>
                <div className="text-gray-600">Total All-Americans</div>
                <div className="text-sm text-gray-500">60% increase from 2024 performance</div>
              </div>
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-[#002147]">1</div>
                <div className="text-gray-600">National Finalist</div>
                <div className="text-sm text-gray-500">Lorenzo Alston in Junior Division</div>
              </div>
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-[#002147]">73%</div>
                <div className="text-gray-600">Bonus Point Wins</div>
                <div className="text-sm text-gray-500">Pins, tech falls, and major decisions</div>
              </div>
            </div>

            {/* Multi-Time AA and College Commits */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#002147]">Multi-Time All-Americans</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {MULTI_TIME_AAS.map((aa) => (
                      <li key={aa.name} className="flex items-center gap-2">
                        <span>•</span>
                        <span className="font-medium">{aa.name}</span>
                        <span className="text-gray-500">
                          - {aa.times}x All-American ({aa.years})
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#002147]">College Commitments</CardTitle>
                </CardHeader>
                <CardContent>
                  {groupedCollegeCommits.length > 0 ? (
                    <ul className="space-y-3">
                      {groupedCollegeCommits.map((commit) => (
                        <li key={commit.college} className="flex items-center gap-3">
                          {commit.logoUrl && (
                            <Image
                              src={commit.logoUrl || "/placeholder.svg"}
                              alt={`${commit.college} logo`}
                              width={32}
                              height={32}
                              className="object-contain"
                            />
                          )}
                          <span>
                            <span className="font-medium">{commit.college}</span>
                            <span className="text-gray-500"> - {commit.wrestlers.join(", ")}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No college commitments data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Division Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#002147] text-white rounded-xl p-4">
                <div className="font-semibold">Freshman</div>
                <div className="text-4xl font-bold my-2">{stats.byDivision.Freshman}</div>
                <div className="text-sm opacity-80">All-Americans</div>
                <div className="mt-3 text-xs space-y-1 opacity-70">
                  <div className="flex justify-between">
                    <span>4th Place:</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>5th Place:</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>6th Place:</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>7th Place:</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>8th Place:</span>
                    <span>3</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#B31B1B] text-white rounded-xl p-4">
                <div className="font-semibold">Sophomore</div>
                <div className="text-4xl font-bold my-2">{stats.byDivision.Sophomore}</div>
                <div className="text-sm opacity-80">All-Americans</div>
                <div className="mt-3 text-xs space-y-1 opacity-70">
                  <div className="flex justify-between">
                    <span>6th Place:</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>7th Place:</span>
                    <span>3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>8th Place:</span>
                    <span>2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Returning AAs:</span>
                    <span>3</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#CBAF5D] text-white rounded-xl p-4">
                <div className="font-semibold">Junior</div>
                <div className="text-4xl font-bold my-2">{stats.byDivision.Junior}</div>
                <div className="text-sm opacity-80">All-Americans</div>
                <div className="mt-3 text-xs space-y-1 opacity-70">
                  <div className="flex justify-between">
                    <span>2nd Place:</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3rd Place:</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nationally Ranked Wins:</span>
                    <span>3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Returning AAs:</span>
                    <span>2</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#4169E1] text-white rounded-xl p-4">
                <div className="font-semibold">Senior</div>
                <div className="text-4xl font-bold my-2">{stats.byDivision.Senior}</div>
                <div className="text-sm opacity-80">All-Americans</div>
                <div className="mt-3 text-xs space-y-1 opacity-70">
                  <div className="flex justify-between">
                    <span>3rd Place:</span>
                    <span>3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>4th Place:</span>
                    <span>2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>5th Place:</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>6th Place:</span>
                    <span>2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>8th Place:</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>College Commits:</span>
                    <span>6</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All-Americans Table Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <Trophy className="w-5 h-5" />
              2025 NC All-Americans
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search wrestlers, schools, clubs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map((division) => (
                    <SelectItem key={division} value={division}>
                      {division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={weightFilter} onValueChange={setWeightFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Weights" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Weights</SelectItem>
                  {weights.map((weight) => (
                    <SelectItem key={weight} value={weight}>
                      {weight}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setDivisionFilter("all")
                  setWeightFilter("all")
                }}
              >
                Clear Filters
              </Button>
            </div>

            {/* Results Table */}
            <Tabs value={divisionFilter === "all" ? "all" : divisionFilter} onValueChange={setDivisionFilter}>
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="all" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white">
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="Freshman"
                  className="data-[state=active]:bg-[#002147] data-[state=active]:text-white"
                >
                  Freshman
                </TabsTrigger>
                <TabsTrigger
                  value="Sophomore"
                  className="data-[state=active]:bg-[#002147] data-[state=active]:text-white"
                >
                  Sophomore
                </TabsTrigger>
                <TabsTrigger value="Junior" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white">
                  Junior
                </TabsTrigger>
                <TabsTrigger value="Senior" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white">
                  Senior
                </TabsTrigger>
              </TabsList>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#002147] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Place</th>
                      <th className="px-4 py-3 text-left">Wrestler</th>
                      <th className="px-4 py-3 text-left">High School</th>
                      <th className="px-4 py-3 text-left">Club</th>
                      <th className="px-4 py-3 text-left">Weight</th>
                      <th className="px-4 py-3 text-left">Division</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWrestlers.map((wrestler, idx) => {
                      const badge = getPlacementBadge(wrestler.placement)
                      return (
                        <tr key={wrestler.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-4 py-3">
                            <Badge className={`${badge.bg} text-white`}>{badge.text}</Badge>
                          </td>
                          <td className="px-4 py-3 font-medium text-[#002147]">{wrestler.athlete_name}</td>
                          <td className="px-4 py-3 text-gray-600">{wrestler.high_school || "-"}</td>
                          <td className="px-4 py-3 text-gray-600">{wrestler.club || "-"}</td>
                          <td className="px-4 py-3">{wrestler.weight}</td>
                          <td className="px-4 py-3">{wrestler.division}</td>
                        </tr>
                      )
                    })}
                    {filteredWrestlers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No wrestlers found matching your criteria</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Multiple-Time NHSCA Champions & All-Americans */}
        <NHSCAChampionsTabs />
      </div>
    </div>
  )
}
