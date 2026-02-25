"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Archive, BarChart3, ChevronDown, ChevronUp, Filter, LineChartIcon, Search, Star, Table, TrendingUp } from "lucide-react"
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

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

interface MostOutstandingWrestler {
  id: string
  name: string
  year: number
  school: string
  division: string
}

type ViewMode = "chart" | "table" | "trends"

type ActiveTab = "Overall" | "Freshman" | "Sophomore" | "Junior" | "Senior"

type TimeRange = "all" | "last10"

type ChartRow = {
  year: number
  Total: number
  Freshman: number
  Sophomore: number
  Junior: number
  Senior: number
}

export default function NHSCAArchive() {
  const [wrestlers, setWrestlers] = useState<Wrestler[]>([])
  const [filteredWrestlers, setFilteredWrestlers] = useState<Wrestler[]>([])
  const [mostOutstandingWrestlers, setMostOutstandingWrestlers] = useState<MostOutstandingWrestler[]>([])
  const [chartData, setChartData] = useState<ChartRow[]>([])
  const [yearStats, setYearStats] = useState<
    {
      year: number
      total: number
      champions: number
      allAmericans: number
      divisions: string[]
      Freshman: number
      Sophomore: number
      Junior: number
      Senior: number
    }[]
  >([])

  const [loading, setLoading] = useState(true)
  const [wrestlerSearch, setWrestlerSearch] = useState("")
  const [selectedHighSchool, setSelectedHighSchool] = useState("all")
  const [selectedYear, setSelectedYear] = useState("all")
  const [selectedDivision, setSelectedDivision] = useState("all")
  const [selectedWeight, setSelectedWeight] = useState("all")
  const [timeRange, setTimeRange] = useState<TimeRange>("all")
  const [activeTab, setActiveTab] = useState<ActiveTab>("Overall")
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({})

  const toggleYearExpanded = (year: number) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }))
  }

  const isMostOutstandingWrestler = (wrestlerName: string, year: number): boolean => {
    return mostOutstandingWrestlers.some((mow) => {
      const nameMatch = mow.name.toLowerCase().trim() === wrestlerName.toLowerCase().trim()
      const yearMatch = mow.year === year
      return nameMatch && yearMatch
    })
  }

  // Male divisions only (align with 2025 page: 24 All-Americans)
  const MALE_DIVISIONS = ["Freshman", "Sophomore", "Junior", "Senior"]

  // Load data via RecruitNC Supabase client
  useEffect(() => {
    const load = async () => {
      try {
        const [nhscaResponse, mowResponse] = await Promise.all([
          supabase
            .from("wrestling_nhsca_results")
            .select("*")
            .in("division", MALE_DIVISIONS)
            .gte("placement", 1)
            .lte("placement", 8)
            .order("year", { ascending: false })
            .order("division")
            .order("weight")
            .order("placement"),
          supabase.from("most_outstanding_wrestlers").select("*").order("year", { ascending: false }),
        ])

        if (nhscaResponse.error) throw nhscaResponse.error
        if (mowResponse.error) throw mowResponse.error

        const rows = (nhscaResponse.data || []) as Wrestler[]
        const mowData = (mowResponse.data || []) as MostOutstandingWrestler[]

        setWrestlers(rows)
        setFilteredWrestlers(rows)
        setMostOutstandingWrestlers(mowData)

        // Aggregate by year for Total and each division (All-Americans only: placement <= 8)
        const byYear = rows.reduce((acc: Record<number, ChartRow & { champions: number; divisions: string[] }>, w) => {
          const y = w.year
          if (!acc[y]) {
            acc[y] = {
              year: y,
              Total: 0,
              Freshman: 0,
              Sophomore: 0,
              Junior: 0,
              Senior: 0,
              champions: 0,
              divisions: [],
            }
          }
          if (!acc[y].divisions.includes(w.division)) acc[y].divisions.push(w.division)

          if (w.placement === 1) acc[y].champions += 1
          if (w.placement <= 8) {
            acc[y].Total += 1
            const d = (w.division || "").trim()
            if (d === "Freshman") acc[y].Freshman += 1
            else if (d === "Sophomore") acc[y].Sophomore += 1
            else if (d === "Junior") acc[y].Junior += 1
            else if (d === "Senior") acc[y].Senior += 1
          }
          return acc
        }, {})

        const stats = Object.values(byYear)
          .map((r) => ({
            year: r.year,
            total: r.Total,
            champions: r.champions,
            allAmericans: r.Total,
            divisions: r.divisions,
            Freshman: r.Freshman,
            Sophomore: r.Sophomore,
            Junior: r.Junior,
            Senior: r.Senior,
          }))
          .sort((a, b) => b.year - a.year)

        const chart = Object.values(byYear)
          .map((r) => ({
            year: r.year,
            Total: r.Total,
            Freshman: r.Freshman,
            Sophomore: r.Sophomore,
            Junior: r.Junior,
            Senior: r.Senior,
          }))
          .sort((a, b) => a.year - b.year)

        setYearStats(stats)
        setChartData(chart)
      } catch (err) {
        console.error("Error loading archive data:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    let filtered = wrestlers
    if (wrestlerSearch) {
      const q = wrestlerSearch.toLowerCase()
      filtered = filtered.filter(
        (w) => (w.athlete_name || "").toLowerCase().includes(q) || (w.club || "").toLowerCase().includes(q),
      )
    }
    if (selectedHighSchool !== "all") {
      filtered = filtered.filter((w) => w.high_school === selectedHighSchool)
    }
    if (selectedYear !== "all") filtered = filtered.filter((w) => w.year.toString() === selectedYear)
    if (selectedDivision !== "all") filtered = filtered.filter((w) => w.division === selectedDivision)
    if (selectedWeight !== "all") filtered = filtered.filter((w) => w.weight === selectedWeight)
    setFilteredWrestlers(filtered)
  }, [wrestlers, wrestlerSearch, selectedHighSchool, selectedYear, selectedDivision, selectedWeight])

  // Unique filter options
  const years = useMemo(() => [...new Set(wrestlers.map((w) => w.year))].sort((a, b) => b - a), [wrestlers])
  const divisions = useMemo(() => [...new Set(wrestlers.map((w) => w.division))].sort(), [wrestlers])
  const weights = useMemo(
    () =>
      [...new Set(wrestlers.map((w) => w.weight))].sort((a, b) => {
        const aNum = Number.parseInt(a.replace("lbs", ""))
        const bNum = Number.parseInt(b.replace("lbs", ""))
        return aNum - bNum
      }),
    [wrestlers],
  )
  const highSchools = useMemo(
    () => [...new Set(wrestlers.map((w) => w.high_school).filter(Boolean))].sort(),
    [wrestlers],
  )

  // Chart data based on time range
  const visibleChartData = useMemo(() => {
    if (timeRange === "last10") {
      const currentYear = new Date().getFullYear()
      return chartData.filter((d) => d.year >= currentYear - 9)
    }
    return chartData
  }, [chartData, timeRange])

  const getPlacementBadge = (placement: number) => {
    if (placement === 1) return { bg: NC_GOLD, text: NC_NAVY }
    if (placement === 2) return { bg: "rgb(156 163 175)", text: "white" }
    if (placement === 3) return { bg: NC_RED, text: "white" }
    if (placement <= 8) return { bg: NC_NAVY, text: "white" }
    return { bg: "rgb(148 163 184)", text: "white" }
  }

  const getOrdinal = (n: number) => {
    if (!n || n < 1) return "-"
    const s = ["th", "st", "nd", "rd"]
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  const totalWrestlers = wrestlers.length
  const yearsActive = years.length

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] mx-auto mb-4" />
          <p className="text-[#003366]/70">Loading NHSCA Archive...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-xl p-8 mb-8 text-center" style={{ backgroundColor: NC_NAVY }}>
          <div className="flex flex-col items-center gap-4">
            <Image
              src="/images/nhsca-logo.png"
              alt="NHSCA Logo"
              width={120}
              height={120}
              className="rounded-lg bg-white p-2"
            />
            <h1 className="text-3xl md:text-4xl font-bold text-white">Browse Archive</h1>
            <p className="text-white/80 max-w-2xl">
              Explore historical NHSCA National Championship results for North Carolina wrestlers
            </p>
            <div className="flex gap-4 mt-4">
              <Link href="/nhsca/2025">
                <Button className="bg-[#CBAF5D] hover:bg-[#CBAF5D]/90 text-[#003366] font-semibold">
                  2025 Results
                </Button>
              </Link>
              <Link href="/nhsca">
                <Button
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-[#003366] bg-transparent"
                >
                  Back to NHSCA
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <Card className="mb-8 border-2 border-[#003366] bg-[#003366] text-white">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl font-bold mb-2">Historical Performance Analysis</CardTitle>
                <CardDescription className="text-white/80">
                  Long-term trends and analysis of North Carolina&apos;s performance at NHSCA Nationals
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={timeRange === "last10" ? "secondary" : "outline"}
                  onClick={() => setTimeRange("last10")}
                  className={
                    timeRange === "last10"
                      ? "bg-[#CBAF5D] text-[#003366] font-semibold"
                      : "border-white bg-white text-[#003366] font-semibold hover:bg-[#CBAF5D]"
                  }
                >
                  Last 10 Years
                </Button>
                <Button
                  variant={timeRange === "all" ? "secondary" : "outline"}
                  onClick={() => setTimeRange("all")}
                  className={
                    timeRange === "all"
                      ? "bg-[#CBAF5D] text-[#003366] font-semibold"
                      : "border-white bg-white text-[#003366] font-semibold hover:bg-[#CBAF5D]"
                  }
                >
                  All Time
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Analysis Dashboard */}
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl" style={{ color: NC_NAVY }}>
              North Carolina Wrestling Historical Analysis (1990-2025)
            </CardTitle>
            <CardDescription className="mt-1">
              Boys divisions only (Freshman, Sophomore, Junior, Senior). Totals align with 24 All-Americans in 2025.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)} className="mb-6">
              <TabsList className="grid w-full grid-cols-5 bg-slate-100">
                <TabsTrigger value="Overall" className="data-[state=active]:bg-[#003366] data-[state=active]:text-white">
                  Overall
                </TabsTrigger>
                <TabsTrigger value="Freshman" className="data-[state=active]:bg-[#CBAF5D] data-[state=active]:text-[#003366]">
                  Freshman
                </TabsTrigger>
                <TabsTrigger value="Sophomore" className="data-[state=active]:bg-[#B31B1B] data-[state=active]:text-white">
                  Sophomore
                </TabsTrigger>
                <TabsTrigger value="Junior" className="data-[state=active]:bg-[#003366]/80 data-[state=active]:text-white">
                  Junior
                </TabsTrigger>
                <TabsTrigger value="Senior" className="data-[state=active]:bg-[#003366] data-[state=active]:text-white">
                  Senior
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="mb-6">
              <TabsList className="bg-white border border-slate-200">
                <TabsTrigger value="chart" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Chart View
                </TabsTrigger>
                <TabsTrigger value="table" className="flex items-center gap-2">
                  <Table className="w-4 h-4" />
                  Table View
                </TabsTrigger>
                <TabsTrigger value="trends" className="flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4" />
                  Trend Analysis
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {viewMode === "chart" && (
              <div className="h-96 w-full bg-white border rounded-lg p-4">
                <ChartContainer
                  className="h-full"
                  config={{
                    Total: { label: "Total All-Americans", color: NC_NAVY },
                    Freshman: { label: "Freshman", color: NC_GOLD },
                    Sophomore: { label: "Sophomore", color: NC_RED },
                    Junior: { label: "Junior", color: "#4A7C59" },
                    Senior: { label: "Senior", color: NC_NAVY },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={visibleChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="year"
                        stroke={NC_NAVY}
                        fontSize={12}
                        type="number"
                        scale="linear"
                        domain={["dataMin", "dataMax"]}
                      />
                      <YAxis stroke={NC_NAVY} fontSize={12} domain={[0, "dataMax + 2"]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />

                      <Line
                        type="monotone"
                        dataKey="Total"
                        stroke="var(--color-Total)"
                        strokeWidth={4}
                        dot={{ fill: "var(--color-Total)", strokeWidth: 2, r: 5 }}
                        name="Total All-Americans"
                        connectNulls={false}
                      />

                      {(activeTab === "Overall" || activeTab === "Freshman") && (
                        <Line
                          type="monotone"
                          dataKey="Freshman"
                          stroke="var(--color-Freshman)"
                          strokeWidth={activeTab === "Freshman" ? 3 : 2}
                          dot={{ fill: "var(--color-Freshman)", strokeWidth: 1, r: activeTab === "Freshman" ? 4 : 3 }}
                          name="Freshman"
                          connectNulls={false}
                        />
                      )}
                      {(activeTab === "Overall" || activeTab === "Sophomore") && (
                        <Line
                          type="monotone"
                          dataKey="Sophomore"
                          stroke="var(--color-Sophomore)"
                          strokeWidth={activeTab === "Sophomore" ? 3 : 2}
                          dot={{ fill: "var(--color-Sophomore)", strokeWidth: 1, r: activeTab === "Sophomore" ? 4 : 3 }}
                          name="Sophomore"
                          connectNulls={false}
                        />
                      )}
                      {(activeTab === "Overall" || activeTab === "Junior") && (
                        <Line
                          type="monotone"
                          dataKey="Junior"
                          stroke="var(--color-Junior)"
                          strokeWidth={activeTab === "Junior" ? 3 : 2}
                          dot={{ fill: "var(--color-Junior)", strokeWidth: 1, r: activeTab === "Junior" ? 4 : 3 }}
                          name="Junior"
                          connectNulls={false}
                        />
                      )}
                      {(activeTab === "Overall" || activeTab === "Senior") && (
                        <Line
                          type="monotone"
                          dataKey="Senior"
                          stroke="var(--color-Senior)"
                          strokeWidth={activeTab === "Senior" ? 3 : 2}
                          dot={{ fill: "var(--color-Senior)", strokeWidth: 1, r: activeTab === "Senior" ? 4 : 3 }}
                          name="Senior"
                          connectNulls={false}
                        />
                      )}
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}

            {viewMode === "table" && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-200 p-3 text-left font-semibold text-[#003366]">Year</th>
                      <th className="border border-slate-200 p-3 text-center font-semibold text-[#003366]">Total</th>
                      <th className="border border-slate-200 p-3 text-center font-semibold text-[#CBAF5D]">Freshman</th>
                      <th className="border border-slate-200 p-3 text-center font-semibold text-[#B31B1B]">Sophomore</th>
                      <th className="border border-slate-200 p-3 text-center font-semibold text-[#003366]/80">Junior</th>
                      <th className="border border-slate-200 p-3 text-center font-semibold text-[#003366]">Senior</th>
                      <th className="border border-slate-200 p-3 text-center font-semibold text-[#003366]">Champions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleChartData
                      .slice()
                      .reverse()
                      .map((row) => (
                        <tr key={row.year} className="hover:bg-slate-50">
                          <td className="border border-slate-200 p-3 font-medium">{row.year}</td>
                          <td className="border border-slate-200 p-3 text-center font-bold text-[#003366]">{row.Total}</td>
                          <td className="border border-slate-200 p-3 text-center text-[#CBAF5D]">{row.Freshman}</td>
                          <td className="border border-slate-200 p-3 text-center text-[#B31B1B]">{row.Sophomore}</td>
                          <td className="border border-slate-200 p-3 text-center text-[#003366]/80">{row.Junior}</td>
                          <td className="border border-slate-200 p-3 text-center text-[#003366]">{row.Senior}</td>
                          <td className="border border-slate-200 p-3 text-center">
                            <Badge className="bg-[#CBAF5D] text-[#003366]">
                              {yearStats.find((s) => s.year === row.year)?.champions || 0}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {viewMode === "trends" && (
              <div className="space-y-6">
                {chartData.length > 0 ? (
                  <>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="border-2 border-[#CBAF5D]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-[#CBAF5D]">Peak Performance Year</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-2xl font-bold text-[#003366]">
                            {chartData.reduce((max, d) => (d.Total > max.Total ? d : max), chartData[0])?.year ?? "N/A"}
                          </div>
                          <div className="text-sm text-[#003366]/70">
                            {chartData.reduce((max, d) => (d.Total > max.Total ? d : max), chartData[0])?.Total ?? 0}{" "}
                            All-Americans
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-[#003366]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-[#003366]">Average Per Year</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-2xl font-bold text-[#003366]">
                            {chartData.length > 0
                              ? Math.round(chartData.reduce((s, d) => s + d.Total, 0) / chartData.length)
                              : 0}
                          </div>
                          <div className="text-sm text-[#003366]/70">All-Americans annually</div>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-[#B31B1B]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-[#B31B1B]">Growth Trend</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-2xl font-bold text-[#003366]">
                            {chartData.length > 1
                              ? `+${
                                  Math.round(
                                    (((chartData[chartData.length - 1]?.Total || 0) - (chartData[0]?.Total || 0)) /
                                      chartData.length) *
                                      100,
                                  ) / 100
                                }`
                              : "N/A"}
                          </div>
                          <div className="text-sm text-[#003366]/70">Per year average</div>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-[#003366]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-[#003366]">Strongest Division</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-2xl font-bold text-[#003366]">
                            {chartData.length > 0
                              ? (["Freshman", "Sophomore", "Junior", "Senior"] as const).reduce(
                                  (max, div) => {
                                    const total = chartData.reduce((s, d) => s + (d[div] as number), 0)
                                    const maxTotal = chartData.reduce((s, d) => s + (d[max] as number), 0)
                                    return total > maxTotal ? div : max
                                  },
                                  "Freshman",
                                )
                              : "N/A"}
                          </div>
                          <div className="text-sm text-[#003366]/70">Most All-Americans</div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-[#003366]/60">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No data available for trend analysis</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#003366]">
              <Filter className="w-5 h-5" />
              Search Archive
            </CardTitle>
            <CardDescription>
              Search through {totalWrestlers} wrestlers across {yearsActive} years of competition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search wrestlers, clubs..."
                  value={wrestlerSearch}
                  onChange={(e) => setWrestlerSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedHighSchool} onValueChange={setSelectedHighSchool}>
                <SelectTrigger>
                  <SelectValue placeholder="All High Schools" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All High Schools</SelectItem>
                  {highSchools.map((school) => (
                    <SelectItem key={school} value={school}>
                      {school}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
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
              <Select value={selectedWeight} onValueChange={setSelectedWeight}>
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
                  setWrestlerSearch("")
                  setSelectedHighSchool("all")
                  setSelectedYear("all")
                  setSelectedDivision("all")
                  setSelectedWeight("all")
                }}
                className="border-[#B31B1B] text-[#B31B1B] hover:bg-[#B31B1B] hover:text-white"
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Tabs defaultValue="results" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="results">Search Results</TabsTrigger>
            <TabsTrigger value="timeline">Year by Year</TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#003366]">Archive Results ({filteredWrestlers.length})</CardTitle>
                <CardDescription>
                  {selectedYear !== "all" && `${selectedYear} • `}
                  {selectedDivision !== "all" && `${selectedDivision} • `}
                  {selectedWeight !== "all" && `${selectedWeight} • `}
                  {selectedHighSchool !== "all" && `${selectedHighSchool} • `}
                  {wrestlerSearch && `"${wrestlerSearch}" • `}
                  Historical NHSCA results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredWrestlers.map((w) => {
                    const badge = getPlacementBadge(w.placement)
                    return (
                      <div
                        key={w.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-4">
                          <Badge
                            style={{ backgroundColor: badge.bg, color: badge.text }}
                            className="border-0"
                          >
                            {getOrdinal(w.placement)}
                          </Badge>
                          <div>
                            <div className="font-semibold text-[#003366]">{w.athlete_name}</div>
                            <div className="text-sm text-[#003366]/70">
                              {w.high_school} • {w.club}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <div className="font-medium">
                              {w.year} • {w.division}
                            </div>
                            <div className="text-[#003366]/70">
                              {w.weight} • {w.state}
                            </div>
                          </div>
                          {isMostOutstandingWrestler(w.athlete_name, w.year) && (
                            <Badge className="bg-[#CBAF5D] hover:bg-[#CBAF5D]/90 text-[#003366] text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              MOW
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {filteredWrestlers.length === 0 && (
                    <div className="text-center py-8 text-[#003366]/60">
                      <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No wrestlers found matching your search criteria</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <div className="space-y-4">
              {yearStats.map((ys) => (
                <Card key={ys.year} className="border-l-4 border-l-[#003366]">
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-[#003366]">{ys.year}</CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className="bg-[#CBAF5D] text-[#003366]">{ys.champions} Champions</Badge>
                        <Badge className="bg-[#003366] text-white">{ys.allAmericans} All-Americans</Badge>
                        <Badge variant="outline">{ys.total ?? ys.allAmericans} Total</Badge>
                      </div>
                    </div>
                    <CardDescription>Divisions: {ys.divisions.join(", ")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {wrestlers
                          .filter((w) => w.year === ys.year)
                          .slice(0, expandedYears[ys.year] ? undefined : 6)
                          .map((w) => {
                            const badge = getPlacementBadge(w.placement)
                            return (
                              <div key={w.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                                <Badge
                                  style={{ backgroundColor: badge.bg, color: badge.text }}
                                  className="border-0"
                                >
                                  {getOrdinal(w.placement)}
                                </Badge>
                                <div className="text-sm flex-1">
                                  <div className="font-medium">{w.athlete_name}</div>
                                  <div className="text-[#003366]/70">
                                    {w.division} • {w.weight}
                                  </div>
                                </div>
                                {isMostOutstandingWrestler(w.athlete_name, w.year) && (
                                  <Badge className="bg-[#CBAF5D] hover:bg-[#CBAF5D]/90 text-[#003366] text-xs">
                                    <Star className="w-3 h-3 mr-1" />
                                    MOW
                                  </Badge>
                                )}
                              </div>
                            )
                          })}
                      </div>
                      {wrestlers.filter((w) => w.year === ys.year).length > 6 && (
                        <button
                          key={`expand-${ys.year}`}
                          type="button"
                          aria-expanded={!!expandedYears[ys.year]}
                          aria-label={expandedYears[ys.year] ? `Collapse ${ys.year}` : `Show all ${wrestlers.filter((w) => w.year === ys.year).length} wrestlers for ${ys.year}`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleYearExpanded(ys.year)
                          }}
                          className="flex items-center justify-center gap-2 min-h-[44px] w-full rounded-md border border-[#003366]/40 bg-transparent px-4 py-2 text-sm font-medium text-[#003366] hover:bg-[#003366]/10 cursor-pointer transition-colors"
                        >
                          {expandedYears[ys.year] ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              +{wrestlers.filter((w) => w.year === ys.year).length - 6} more
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
