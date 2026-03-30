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
import { NHSCAChampionsTabs } from "@/components/nhsca-champions-tabs"
import NHSCAPerformanceCharts from "@/components/nhsca-performance-charts"
import type { NhscaPerformanceChartRow } from "@/components/nhsca-performance-charts"
import { supabase } from "@/lib/supabase"
import nhsca2026 from "@/lib/data/nhsca-2026-replica-page.json"
import {
  mergeNhsca2026WrestlersIntoRows,
  getNhsca2026CanonicalWrestlers,
  computeMultiTimeAAsFor2026Roster,
  getNhsca2026CanonicalAthleteNames,
  mergeMultiTimeAALists,
  getNhsca2026StateStackedComparison,
  type MultiTimeAAEntry,
} from "@/lib/nhsca-2026-archive"

// NC United Brand Colors
const NC_NAVY = "#003366"
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

const DIVISION_ORDER = ["Senior", "Sophomore", "Junior", "Freshman"] as const

/** Stacked by division — matches 2025 National Comparison chart (sections 10–14 joined). */
const STATE_STACKED_2026 = getNhsca2026StateStackedComparison()

const DIVISION_STANDINGS = DIVISION_ORDER.map((division) => {
  const d = nhsca2026.section4_division_standings[division]
  return {
    division,
    rank: d.nc_national_rank as number | null,
    allAmericans: d.nc_count,
    color:
      division === "Senior"
        ? "#2563eb"
        : division === "Sophomore"
          ? NC_RED
          : division === "Junior"
            ? NC_GOLD
            : NC_NAVY,
    highlights: d.highlights,
  }
})

const PLACE_KEY_ORDER = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"] as const

function formatPlaceLabel(key: string) {
  const m: Record<string, string> = {
    "1st": "1st Place",
    "2nd": "2nd Place",
    "3rd": "3rd Place",
    "4th": "4th Place",
    "5th": "5th Place",
    "6th": "6th Place",
    "7th": "7th Place",
    "8th": "8th Place",
  }
  return m[key] ?? key
}

function placementRowsForDivision(div: "Freshman" | "Sophomore" | "Junior" | "Senior") {
  const raw = nhsca2026.section8_placement_breakdown[div]
  return PLACE_KEY_ORDER.filter((k) => k in raw && (raw as Record<string, number>)[k] > 0).map((k) => ({
    label: formatPlaceLabel(k),
    count: (raw as Record<string, number>)[k],
  }))
}

interface CollegeCommit {
  id: string
  name: string
  firstName: string
  lastName: string
  college: string
  collegeLogoUrl: string | null
  recruiting_status: string
}

function normMultiName(s: string) {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ")
}

export default function NHSCA2026Page() {
  const [wrestlers, setWrestlers] = useState<Wrestler[]>([])
  const [filteredWrestlers, setFilteredWrestlers] = useState<Wrestler[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [collegeCommitments, setCollegeCommitments] = useState<CollegeCommit[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [divisionFilter, setDivisionFilter] = useState("all")
  const [weightFilter, setWeightFilter] = useState("all")
  const [showAllStates, setShowAllStates] = useState(false)
  const [chartViewMode, setChartViewMode] = useState<"chart" | "table" | "summary">("chart")
  const [multiTimeAAs, setMultiTimeAAs] = useState<MultiTimeAAEntry[]>([])

  // Load data via RecruitNC Supabase client (male divisions only: Freshman, Sophomore, Junior, Senior)
  const MALE_DIVISIONS = ["Freshman", "Sophomore", "Junior", "Senior"]

  useEffect(() => {
    const load = async () => {
      try {
        const canonicalNames = getNhsca2026CanonicalAthleteNames()
        const manualMulti = nhsca2026.section5_multi_time_aas as MultiTimeAAEntry[]

        const [resultsResponse, commitsResponse, wrHistRes, plHistRes] = await Promise.all([
          supabase
            .from("wrestling_nhsca_results")
            .select("*")
            .eq("year", 2026)
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
          canonicalNames.length > 0
            ? supabase
                .from("wrestling_nhsca_results")
                .select("athlete_name, year")
                .in("athlete_name", canonicalNames)
                .in("division", MALE_DIVISIONS)
                .gte("placement", 1)
                .lte("placement", 8)
            : Promise.resolve({ data: [] as { athlete_name: string; year: number }[], error: null }),
          canonicalNames.length > 0
            ? supabase
                .from("nhsca_placements")
                .select("athlete_name, year")
                .in("athlete_name", canonicalNames)
                .in("division", MALE_DIVISIONS)
                .gte("placement", 1)
                .lte("placement", 8)
            : Promise.resolve({ data: [] as { athlete_name: string; year: number }[], error: null }),
        ])

        if (resultsResponse.error) throw resultsResponse.error
        if (commitsResponse.error) throw commitsResponse.error
        if (wrHistRes.error) console.error("[RecruitNC] NHSCA multi-AA wrestling_nhsca_results:", wrHistRes.error)
        if (plHistRes.error) console.error("[RecruitNC] NHSCA multi-AA nhsca_placements:", plHistRes.error)

        const raw = (resultsResponse.data as Wrestler[]) || []
        let merged: Wrestler[]
        try {
          merged = mergeNhsca2026WrestlersIntoRows(raw) as Wrestler[]
        } catch (mergeErr) {
          console.error("[RecruitNC] NHSCA 2026 roster merge failed; using canonical JSON roster.", mergeErr)
          merged = getNhsca2026CanonicalWrestlers() as Wrestler[]
        }
        setWrestlers(merged)
        setFilteredWrestlers(merged)
        setCollegeCommitments((commitsResponse.data as CollegeCommit[]) || [])

        const histRows = [
          ...((wrHistRes.data || []) as { athlete_name: string; year: number }[]),
          ...((plHistRes.data || []) as { athlete_name: string; year: number }[]),
        ]
        const computedMulti = computeMultiTimeAAsFor2026Roster(histRows, canonicalNames)
        setMultiTimeAAs(mergeMultiTimeAALists(computedMulti, manualMulti))
      } catch (error) {
        console.error("Error loading 2026 results:", error)
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

  /** Same layout as 2025 `NHSCAPerformanceCharts`: all schools + clubs including No Club. */
  const performanceChartSchoolRows = useMemo((): NhscaPerformanceChartRow[] => {
    const schoolCounts: Record<string, number> = {}
    wrestlers.forEach((w) => {
      if (w.high_school && w.high_school.trim() !== "") {
        schoolCounts[w.high_school] = (schoolCounts[w.high_school] || 0) + 1
      }
    })
    return Object.entries(schoolCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))
  }, [wrestlers])

  const performanceChartClubRows = useMemo((): NhscaPerformanceChartRow[] => {
    const clubCounts: Record<string, number> = {}
    let noClub = 0
    wrestlers.forEach((w) => {
      const c = (w.club || "").trim()
      if (!c || c === "No Club") noClub += 1
      else clubCounts[c] = (clubCounts[c] || 0) + 1
    })
    const rows: NhscaPerformanceChartRow[] = Object.entries(clubCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))
    if (noClub > 0) rows.push({ name: "No Club", value: noClub })
    return rows.sort((a, b) => b.value - a.value)
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
    return { bg: "bg-[#003366]", text: `${placement}th` }
  }

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"]
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  const multiTimeByNormName = useMemo(() => {
    const m = new Map<string, MultiTimeAAEntry>()
    for (const aa of multiTimeAAs) {
      const k = normMultiName(aa.name)
      if (k) m.set(k, aa)
    }
    return m
  }, [multiTimeAAs])

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading 2026 NHSCA Results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#003366] text-white">
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
              <p className="text-white/70 text-sm">2026 NHSCA National Championships</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/nhsca" className="inline-flex items-center gap-2 text-[#003366] hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to NHSCA
        </Link>

        {/* Performance Analysis Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#003366] mb-2">NHSCA Performance Analysis</h2>
          <p className="text-gray-600">North Carolina&apos;s male All-Americans (Freshman, Sophomore, Junior, Senior divisions) at the 2026 NHSCA Nationals.</p>
        </div>

        {/* Key Stats Cards */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#003366]">North Carolina NHSCA Performance 2026 (Boys)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-[#003366] text-white rounded-xl p-6 text-center">
                <div className="text-5xl font-bold">{stats.totalAA}</div>
                <div className="text-white/80 mt-1">Total All-Americans</div>
              </div>
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <div className="text-5xl font-bold text-[#003366]">
                  {nhsca2026.section2_national_story.nc_rank_among_states != null
                    ? `#${nhsca2026.section2_national_story.nc_rank_among_states}`
                    : "—"}
                </div>
                <div className="text-gray-600 mt-1">National Ranking</div>
                <div className="text-sm text-gray-500">
                  {nhsca2026.section2_national_story.total_states_ranked != null
                    ? `Out of ${nhsca2026.section2_national_story.total_states_ranked} states`
                    : "Full national comparison pending"}
                </div>
              </div>
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <div className="text-5xl font-bold text-[#003366]">—</div>
                <div className="text-gray-600 mt-1">Growth from 2025</div>
                <div className="text-sm text-gray-500">{nhsca2026.section2_national_story.yoy_growth_note}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* National Standing Section */}
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="bg-[#003366] text-white">
            <CardTitle>North Carolina&apos;s National Standing</CardTitle>
            <p className="text-white/70 text-sm">2026 NHSCA Nationals Team Performance</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              {DIVISION_STANDINGS.map((div) => (
                <div key={div.division} className="rounded-xl p-6 text-white" style={{ backgroundColor: div.color }}>
                  <div className="text-sm opacity-80">{div.division} Division</div>
                  <div className="text-3xl font-bold mt-1">
                    {div.rank != null ? `${getOrdinal(div.rank)} Place Nationally` : "National rank — TBD"}
                  </div>
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

        {/* Freshman division — state stack (All-Americans by state) */}
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="bg-[#003366] text-white">
            <CardTitle>Freshman division — All-Americans by state</CardTitle>
            <p className="text-white/70 text-sm font-normal mt-1">
              2026 NHSCA Nationals · state stack ranking (Freshman boys only)
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-[#003366]">Rank</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#003366]">State</th>
                    <th className="text-right py-3 px-4 font-semibold text-[#003366]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {nhsca2026.section10_freshman_aa_state_ranking.map((row, idx) => (
                    <tr
                      key={`${row.state}-${row.rank}`}
                      className={`border-b ${row.state === "NC" ? "bg-[#CBAF5D]/15" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/80"}`}
                    >
                      <td className="py-2.5 px-4 font-medium text-[#003366]">{row.rank}</td>
                      <td className="py-2.5 px-4">
                        {row.state}
                        {row.state === "NC" && <span className="ml-1 text-[#CBAF5D]">★</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Sophomore division — state stack */}
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="bg-[#B31B1B] text-white">
            <CardTitle>Sophomore division — All-Americans by state</CardTitle>
            <p className="text-white/80 text-sm font-normal mt-1">
              2026 NHSCA Nationals · state stack ranking (Sophomore boys only)
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-[#B31B1B]">Rank</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#B31B1B]">State</th>
                    <th className="text-right py-3 px-4 font-semibold text-[#B31B1B]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {nhsca2026.section11_sophomore_aa_state_ranking.map((row, idx) => (
                    <tr
                      key={`${row.state}-${row.rank}`}
                      className={`border-b ${row.state === "NC" ? "bg-[#CBAF5D]/15" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/80"}`}
                    >
                      <td className="py-2.5 px-4 font-medium text-[#003366]">{row.rank}</td>
                      <td className="py-2.5 px-4">
                        {row.state}
                        {row.state === "NC" && <span className="ml-1 text-[#CBAF5D]">★</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Junior division — state stack */}
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="bg-[#CBAF5D] text-[#003366]">
            <CardTitle>Junior division — All-Americans by state</CardTitle>
            <p className="text-[#003366]/80 text-sm font-normal mt-1">
              2026 NHSCA Nationals · state stack ranking (Junior boys only)
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-[#003366]">Rank</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#003366]">State</th>
                    <th className="text-right py-3 px-4 font-semibold text-[#003366]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {nhsca2026.section12_junior_aa_state_ranking.map((row, idx) => (
                    <tr
                      key={`${row.state}-${row.rank}`}
                      className={`border-b ${row.state === "NC" ? "bg-[#CBAF5D]/15" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/80"}`}
                    >
                      <td className="py-2.5 px-4 font-medium text-[#003366]">{row.rank}</td>
                      <td className="py-2.5 px-4">
                        {row.state}
                        {row.state === "NC" && <span className="ml-1 text-[#CBAF5D]">★</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Senior division — state stack */}
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="bg-[#2563eb] text-white">
            <CardTitle>Senior division — All-Americans by state</CardTitle>
            <p className="text-white/80 text-sm font-normal mt-1">
              2026 NHSCA Nationals · state stack ranking (Senior boys only)
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-[#2563eb]">Rank</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#2563eb]">State</th>
                    <th className="text-right py-3 px-4 font-semibold text-[#2563eb]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {nhsca2026.section13_senior_aa_state_ranking.map((row, idx) => (
                    <tr
                      key={`${row.state}-${row.rank}`}
                      className={`border-b ${row.state === "NC" ? "bg-[#CBAF5D]/15" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/80"}`}
                    >
                      <td className="py-2.5 px-4 font-medium text-[#003366]">{row.rank}</td>
                      <td className="py-2.5 px-4">
                        {row.state}
                        {row.state === "NC" && <span className="ml-1 text-[#CBAF5D]">★</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Historic Achievement Banner */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-[#003366]">Historic Achievement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-4xl font-bold text-[#003366]">{stats.totalAA} Total All-Americans</div>
                <div className="text-gray-600">
                  {nhsca2026.section2_national_story.historic_headline ?? "North Carolina boys NHSCA All-Americans"}
                </div>
                <div className="text-gray-500 text-sm">{nhsca2026.section2_national_story.yoy_growth_note}</div>
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
          <NHSCAPerformanceCharts clubRows={performanceChartClubRows} schoolRows={performanceChartSchoolRows} />
        </div>

        {/* National Comparison */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#003366]">National Comparison</CardTitle>
                <p className="text-[#003366]/70 text-sm mt-1">
                  How North Carolina compares to other states at the 2026 NHSCA Nationals
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Card className="overflow-hidden">
              <CardHeader className="bg-[#003366] text-white flex flex-row items-center justify-between">
                <CardTitle className="text-[#CBAF5D]">2026 NHSCA All-Americans by State (All Divisions)</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={!showAllStates ? "secondary" : "ghost"}
                    onClick={() => setShowAllStates(false)}
                    className={!showAllStates ? "bg-white text-[#003366]" : "text-white hover:bg-white/20"}
                  >
                    Top 15 States
                  </Button>
                  <Button
                    size="sm"
                    variant={showAllStates ? "secondary" : "ghost"}
                    onClick={() => setShowAllStates(true)}
                    className={showAllStates ? "bg-white text-[#003366]" : "text-white hover:bg-white/20"}
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
                    className={`pb-2 px-1 text-sm font-medium ${chartViewMode === "chart" ? "border-b-2 border-[#003366] text-[#003366]" : "text-gray-500"}`}
                  >
                    Chart View
                  </button>
                  <button
                    onClick={() => setChartViewMode("table")}
                    className={`pb-2 px-1 text-sm font-medium ${chartViewMode === "table" ? "border-b-2 border-[#003366] text-[#003366]" : "text-gray-500"}`}
                  >
                    Table View
                  </button>
                  <button
                    onClick={() => setChartViewMode("summary")}
                    className={`pb-2 px-1 text-sm font-medium ${chartViewMode === "summary" ? "border-b-2 border-[#003366] text-[#003366]" : "text-gray-500"}`}
                  >
                    Summary
                  </button>
                </div>

                {chartViewMode === "chart" && (
                  <div className="space-y-3">
                    {(showAllStates ? STATE_STACKED_2026 : STATE_STACKED_2026.slice(0, 15)).map((item) => {
                      const maxTotal = Math.max(...STATE_STACKED_2026.map((d) => d.total), 1)
                      const barWidthPercent = item.total > 0 ? (item.total / maxTotal) * 100 : 0

                      return (
                        <div key={item.state} className="flex items-center gap-3">
                          <div className="w-16 text-right text-sm font-medium text-[#003366]">
                            {item.state}
                            {item.isNC && <span className="ml-1 text-[#CBAF5D]">★</span>}
                          </div>
                          <div className="flex-1">
                            {item.total > 0 ? (
                              <div className="h-8 flex rounded overflow-hidden" style={{ width: `${barWidthPercent}%` }}>
                                {item.Freshman > 0 && (
                                  <div
                                    className="h-full"
                                    style={{
                                      width: `${(item.Freshman / item.total) * 100}%`,
                                      backgroundColor: "#003366",
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
                            ) : (
                              <div className="h-8 rounded bg-gray-100 w-8" title="No All-Americans" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <div className="flex justify-center gap-6 mt-6 pt-4 border-t flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: "#003366" }} />
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
                  <div className="overflow-x-auto max-h-[min(70vh,560px)] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-[#003366]">State</th>
                          <th className="text-center py-2 px-3 font-medium text-[#003366]">Freshman</th>
                          <th className="text-center py-2 px-3 font-medium text-[#003366]">Sophomore</th>
                          <th className="text-center py-2 px-3 font-medium text-[#003366]">Junior</th>
                          <th className="text-center py-2 px-3 font-medium text-[#003366]">Senior</th>
                          <th className="text-center py-2 px-3 font-medium text-[#003366]">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAllStates ? STATE_STACKED_2026 : STATE_STACKED_2026.slice(0, 15)).map((item, idx) => (
                          <tr
                            key={item.state}
                            className={`border-b ${item.isNC ? "bg-[#CBAF5D]/10" : idx % 2 === 0 ? "bg-gray-50" : ""}`}
                          >
                            <td className="py-2 px-3 font-medium text-[#003366]">
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
                        <div className="text-3xl font-bold text-[#003366]">
                          {STATE_STACKED_2026[0]?.state ?? "—"}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Leads with {STATE_STACKED_2026[0]?.total ?? "—"} All-Americans (all divisions)
                        </div>
                      </div>
                      <div className="bg-[#CBAF5D]/20 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-[#003366]">NC ★</div>
                        <div className="text-sm text-gray-600">
                          {nhsca2026.section7_summary_mini_cards.nc_rank != null
                            ? `Ranks #${nhsca2026.section7_summary_mini_cards.nc_rank} with ${nhsca2026.section7_summary_mini_cards.nc_total} All-Americans`
                            : `${nhsca2026.section7_summary_mini_cards.nc_total} All-Americans`}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-xl font-bold text-[#B31B1B]">
                          {nhsca2026.section7_summary_mini_cards.highlight_number ?? nhsca2026.section7_summary_mini_cards.highlight_note}
                        </div>
                        {nhsca2026.section7_summary_mini_cards.highlight_number != null && (
                          <div className="text-sm text-gray-600">{nhsca2026.section7_summary_mini_cards.highlight_note}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* 2026 Summary Section */}
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="bg-[#003366] text-white border-l-4 border-l-green-500">
            <CardTitle>2026 NHSCA Nationals Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Top Stats */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-[#003366]">{stats.totalAA} AA</div>
                <div className="text-gray-600">Total All-Americans</div>
                <div className="text-sm text-gray-500">{nhsca2026.section2_national_story.yoy_growth_note}</div>
              </div>
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-[#003366]">{nhsca2026.section6_summary_strip.national_finalist.count}</div>
                <div className="text-gray-600">
                  {nhsca2026.section6_summary_strip.national_finalist.placement === 1
                    ? "National Champion"
                    : "National Finalist"}
                </div>
                <div className="text-sm text-gray-500">
                  {nhsca2026.section6_summary_strip.national_finalist.name} — {nhsca2026.section6_summary_strip.national_finalist.division}
                </div>
              </div>
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-[#003366]">
                  {nhsca2026.section6_summary_strip.bonus_point_win_pct != null
                    ? `${nhsca2026.section6_summary_strip.bonus_point_win_pct}%`
                    : "—"}
                </div>
                <div className="text-gray-600">Bonus Point Wins</div>
                <div className="text-sm text-gray-500">Pins, tech falls, and major decisions</div>
              </div>
            </div>

            {/* Multi-Time AA and College Commits */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#003366]">Multi-Time All-Americans</CardTitle>
                  <p className="text-sm text-gray-500 font-normal pt-1">
                    From NHSCA history (database + 2026 roster). Same wrestlers show a badge in the table below.
                  </p>
                </CardHeader>
                <CardContent>
                  {multiTimeAAs.length > 0 ? (
                    <ul className="space-y-2">
                      {multiTimeAAs.map((aa) => (
                        <li key={aa.name} className="flex items-center gap-2">
                          <span>•</span>
                          <span className="font-medium">{aa.name}</span>
                          <span className="text-gray-500">
                            - {aa.times}x All-American ({aa.years})
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No multi-time All-Americans found from history (or still loading). Add names to
                      section5_multi_time_aas in the replica JSON as a fallback.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#003366]">College Commitments</CardTitle>
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
              <div className="bg-[#003366] text-white rounded-xl p-4">
                <div className="font-semibold">Freshman</div>
                <div className="text-4xl font-bold my-2">{stats.byDivision.Freshman}</div>
                <div className="text-sm opacity-80">All-Americans</div>
                <div className="mt-3 text-xs space-y-1 opacity-70">
                  {placementRowsForDivision("Freshman").map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span>{row.label}:</span>
                      <span>{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#B31B1B] text-white rounded-xl p-4">
                <div className="font-semibold">Sophomore</div>
                <div className="text-4xl font-bold my-2">{stats.byDivision.Sophomore}</div>
                <div className="text-sm opacity-80">All-Americans</div>
                <div className="mt-3 text-xs space-y-1 opacity-70">
                  {placementRowsForDivision("Sophomore").map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span>{row.label}:</span>
                      <span>{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#CBAF5D] text-white rounded-xl p-4">
                <div className="font-semibold">Junior</div>
                <div className="text-4xl font-bold my-2">{stats.byDivision.Junior}</div>
                <div className="text-sm opacity-80">All-Americans</div>
                <div className="mt-3 text-xs space-y-1 opacity-70">
                  {placementRowsForDivision("Junior").map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span>{row.label}:</span>
                      <span>{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#4169E1] text-white rounded-xl p-4">
                <div className="font-semibold">Senior</div>
                <div className="text-4xl font-bold my-2">{stats.byDivision.Senior}</div>
                <div className="text-sm opacity-80">All-Americans</div>
                <div className="mt-3 text-xs space-y-1 opacity-70">
                  {placementRowsForDivision("Senior").map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span>{row.label}:</span>
                      <span>{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All-Americans Table Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#003366]">
              <Trophy className="w-5 h-5" />
              2026 NC All-Americans
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
                <TabsTrigger value="all" className="data-[state=active]:bg-[#003366] data-[state=active]:text-white">
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="Freshman"
                  className="data-[state=active]:bg-[#003366] data-[state=active]:text-white"
                >
                  Freshman
                </TabsTrigger>
                <TabsTrigger
                  value="Sophomore"
                  className="data-[state=active]:bg-[#003366] data-[state=active]:text-white"
                >
                  Sophomore
                </TabsTrigger>
                <TabsTrigger value="Junior" className="data-[state=active]:bg-[#003366] data-[state=active]:text-white">
                  Junior
                </TabsTrigger>
                <TabsTrigger value="Senior" className="data-[state=active]:bg-[#003366] data-[state=active]:text-white">
                  Senior
                </TabsTrigger>
              </TabsList>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#003366] text-white">
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
                      const mt = multiTimeByNormName.get(normMultiName(wrestler.athlete_name))
                      return (
                        <tr key={wrestler.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-4 py-3">
                            <Badge className={`${badge.bg} text-white`}>{badge.text}</Badge>
                          </td>
                          <td className="px-4 py-3 font-medium text-[#003366]">
                            <span className="inline-flex items-center gap-2 flex-wrap">
                              {wrestler.athlete_name}
                              {mt ? (
                                <Badge
                                  variant="outline"
                                  className="border-[#CBAF5D] bg-[#CBAF5D]/10 text-[#003366] text-xs font-semibold"
                                  title={`NHSCA All-American years: ${mt.years}`}
                                >
                                  {mt.times}× AA
                                </Badge>
                              ) : null}
                            </span>
                          </td>
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
