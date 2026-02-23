"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth-guard"
import { Search, Users, Trophy, FileSearch } from "lucide-react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthleteList } from "@/lib/professional-athlete"
import { supabase } from "@/lib/supabase"

const NC_NAVY = "#002147"
const LEGACY_SEARCH_DEBOUNCE_MS = 300
const profileHref = (id: string) => `/unified-profile/${id}`

/** Build name variations for Legacy search .or(ilike) — comma-free so Supabase .or() parsing is safe. */
function getLegacySearchNameVariations(q: string): string[] {
  const t = (q || "").trim()
  if (!t) return []
  const out: string[] = []
  if (t.includes(",")) {
    const [last, first] = t.split(",").map((s) => s.trim())
    if (first && last) {
      out.push(`${first} ${last}`, `${last} ${first}`)
    } else {
      out.push(t.replace(/,/g, " "))
    }
  } else {
    out.push(t)
    const parts = t.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const first = parts[0]!
      const last = parts.slice(1).join(" ")
      out.push(`${last} ${first}`)
    }
  }
  return [...new Set(out)]
}

/** Build .or(column.ilike.pattern1,column.ilike.pattern2) string; patterns are comma-free. */
function buildOrIlike(column: string, q: string): string {
  const variations = getLegacySearchNameVariations(q)
  const patterns = variations.map((v) => `%${v}%`)
  return patterns.map((p) => `${column}.ilike.${p}`).join(",")
}

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
  gender: string
  commitmentdate?: string
}

interface StatsData {
  total: number
  male: number
  female: number
  divisions: {
    D1: number
    D2: number
    D3: number
    NAIA: number
    NJCAA: number
  }
}

/** Legacy Search: one row per source (NHSCA, NCHSAA, etc.) with display name and optional athlete id for profile link. */
interface LegacyMatch {
  name: string
  athleteId?: string
  detail?: string
  year?: number
}

interface LegacyCommit {
  name: string
  athleteId?: string
  college?: string
  graduationyear?: number
  detail?: string
}

interface LegacyResultsState {
  athletes: LegacyMatch[]
  commits: LegacyCommit[]
  nhsca: LegacyMatch[]
  nhscaPlacements: LegacyMatch[]
  nchsaa: LegacyMatch[]
  mow: LegacyMatch[]
  daveSchultz: LegacyMatch[]
  triciaSaunders: LegacyMatch[]
  super32: LegacyMatch[]
  winningest: LegacyMatch[]
  careerWinningest: LegacyMatch[]
}

const emptyLegacyResults: LegacyResultsState = {
  athletes: [],
  commits: [],
  nhsca: [],
  nhscaPlacements: [],
  nchsaa: [],
  mow: [],
  daveSchultz: [],
  triciaSaunders: [],
  super32: [],
  winningest: [],
  careerWinningest: [],
}

type AthletesTab = "commitments" | "legacy"

export default function AthletesPage() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<AthletesTab>("commitments")
  const [athletes, setAthletes] = useState<Athlete[]>([])

  // Sync tab from URL: Legacy NC → "Wrestlers" uses /athletes?tab=legacy so we open Legacy Search
  useEffect(() => {
    if (searchParams.get("tab") === "legacy") setTab("legacy")
    else if (searchParams.get("tab") === "commitments" || !searchParams.get("tab")) setTab("commitments")
  }, [searchParams])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGender, setSelectedGender] = useState<"all" | "male" | "female">("all")
  const [selectedYear, setSelectedYear] = useState<"all" | "2024" | "2025" | "2026" | "2027">("2026")
  const [selectedDivision, setSelectedDivision] = useState<string>("all")
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    male: 0,
    female: 0,
    divisions: { D1: 0, D2: 0, D3: 0, NAIA: 0, NJCAA: 0 },
  })
  const [statsLoading, setStatsLoading] = useState(true)
  // Legacy Search
  const [legacyQuery, setLegacyQuery] = useState("")
  const [legacySearchTerm, setLegacySearchTerm] = useState("")
  const [legacyLoading, setLegacyLoading] = useState(false)
  const [legacyResults, setLegacyResults] = useState<LegacyResultsState>(emptyLegacyResults)
  const legacyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runLegacySearch = useCallback(async () => {
    const q = (legacySearchTerm || legacyQuery || "").trim()
    if (q.length < 2) {
      setLegacyResults(emptyLegacyResults)
      return
    }
    setLegacyLoading(true)
    setLegacyQuery(q)
    const nameToId = new Map<string, string>()
    const orName = () => buildOrIlike("name", q)
    const orAthleteName = () => buildOrIlike("athlete_name", q)
    const orWrestlerName = () => buildOrIlike("wrestler_name", q)

    try {
      const [
        athletesRes,
        commitsRes,
        nhscaRes,
        nhscaPlacementsRes,
        nchsaaRes,
        mowRes,
        daveRes,
        triciaRes,
        super32Res,
        winningestRes,
        careerRes,
      ] = await Promise.all([
        supabase.from("athletes").select("id, name").or(orName()).limit(200),
        supabase.from("athletes").select("id, name, college, graduationyear").in("recruiting_status", ["Committed", "Signed", "College Athlete", "committed", "signed"]).or(orName()).limit(200),
        supabase.from("wrestling_nhsca_results").select("athlete_name, year, placement, weight_class").or(orAthleteName()).order("year", { ascending: false }).limit(500),
        supabase.from("nhsca_placements").select("athlete_name, year, placement, weight_class").in("match_status", ["auto_matched", "manually_matched", "merged"]).or(orAthleteName()).order("year", { ascending: false }).limit(300).catch(() => ({ data: null, error: null })),
        supabase.from("wrestling_nchsaa_results").select("wrestler_name, year, place, school, weight_class").or(orWrestlerName()).order("year", { ascending: false }).limit(1000),
        supabase.from("most_outstanding_wrestlers").select("name, year").or(orName()).order("year", { ascending: false }).limit(200),
        supabase.from("dave_schultz_award").select("name, year, high_school").or(orName()).order("year", { ascending: false }).limit(100),
        supabase.from("tricia_saunders_award").select("name, year, high_school").or(orName()).order("year", { ascending: false }).limit(100),
        supabase.from("super32_results").select("athlete_name, year, weight_class, record").or(orAthleteName()).order("year", { ascending: false }).limit(300),
        supabase.from("winningest_wrestlers").select("wrestler_name, year, wins").or(orWrestlerName()).order("wins", { ascending: false }).limit(100).catch(() => ({ data: null, error: null })),
        supabase.from("career_winningest_wrestlers").select("wrestler_name, wins").or(orWrestlerName()).order("wins", { ascending: false }).limit(100).catch(() => ({ data: null, error: null })),
      ])

      const athleteRows = (athletesRes.data || []) as { id: string; name: string }[]
      athleteRows.forEach((a) => {
        if (a.name) nameToId.set(a.name.trim().toLowerCase(), a.id)
      })
      const getId = (name: string) => name ? nameToId.get(name.trim().toLowerCase()) : undefined

      const toMatch = (name: string, athleteId?: string, detail?: string, year?: number): LegacyMatch =>
        ({ name, athleteId, detail, year })

      const commitRows = (commitsRes.data || []) as { id: string; name: string; college?: string; graduationyear?: number }[]
      commitRows.forEach((a) => {
        if (a.name) nameToId.set(a.name.trim().toLowerCase(), a.id)
      })

      setLegacyResults({
        athletes: athleteRows.map((a) => toMatch(a.name, a.id)),
        commits: commitRows.map((c) => ({
          name: c.name,
          athleteId: c.id,
          college: c.college,
          graduationyear: c.graduationyear,
          detail: [c.college, c.graduationyear ? `Class of ${c.graduationyear}` : ""].filter(Boolean).join(" · "),
        })),
        nhsca: ((nhscaRes.data || []) as { athlete_name?: string; year?: number; placement?: number; weight_class?: string }[]).map((r) => {
          const n = (r.athlete_name ?? "").toString()
          return toMatch(n, getId(n), [r.year, r.weight_class, r.placement != null ? `Place ${r.placement}` : ""].filter(Boolean).join(" · "), r.year)
        }),
        nhscaPlacements: ((nhscaPlacementsRes.data || []) as { athlete_name?: string; year?: number; placement?: number; weight_class?: string }[]).map((r) => {
          const n = (r.athlete_name ?? "").toString()
          return toMatch(n, getId(n), [r.year, r.weight_class, r.placement != null ? `Place ${r.placement}` : ""].filter(Boolean).join(" · "), r.year)
        }),
        nchsaa: ((nchsaaRes.data || []) as { wrestler_name?: string; year?: number; place?: number; school?: string; weight_class?: string }[]).map((r) => {
          const n = (r.wrestler_name ?? "").toString()
          const detail = [r.year, r.school, r.weight_class, r.place != null ? (r.place === 1 ? "Champ" : `Place ${r.place}`) : ""].filter(Boolean).join(" · ")
          return toMatch(n, getId(n), detail, r.year)
        }),
        mow: ((mowRes.data || []) as { name?: string; year?: number }[]).map((r) => {
          const n = (r.name ?? "").toString()
          return toMatch(n, getId(n), r.year != null ? `MOW ${r.year}` : "", r.year)
        }),
        daveSchultz: ((daveRes.data || []) as { name?: string; year?: number; high_school?: string }[]).map((r) => {
          const n = (r.name ?? "").toString()
          return toMatch(n, getId(n), [r.year, r.high_school].filter(Boolean).join(" · "), r.year)
        }),
        triciaSaunders: ((triciaRes.data || []) as { name?: string; year?: number; high_school?: string }[]).map((r) => {
          const n = (r.name ?? "").toString()
          return toMatch(n, getId(n), [r.year, r.high_school].filter(Boolean).join(" · "), r.year)
        }),
        super32: ((super32Res.data || []) as { athlete_name?: string; year?: number; weight_class?: string; record?: string }[]).map((r) => {
          const n = (r.athlete_name ?? "").toString()
          return toMatch(n, getId(n), [r.year, r.weight_class, r.record].filter(Boolean).join(" · "), r.year)
        }),
        winningest: ((winningestRes.data || []) as { wrestler_name?: string; year?: number; wins?: number }[]).map((r) => {
          const n = (r.wrestler_name ?? "").toString()
          return toMatch(n, getId(n), r.year != null && r.wins != null ? `${r.wins} wins (${r.year})` : "", r.year)
        }),
        careerWinningest: ((careerRes.data || []) as { wrestler_name?: string; wins?: number }[]).map((r) => {
          const n = (r.wrestler_name ?? "").toString()
          return toMatch(n, getId(n), r.wins != null ? `${r.wins} career wins` : "")
        }),
      })
    } catch (e) {
      console.error("Legacy search error:", e)
      setLegacyResults(emptyLegacyResults)
    } finally {
      setLegacyLoading(false)
    }
  }, [legacySearchTerm, legacyQuery])

  // 300ms debounce for Legacy search (per detailed migration plan)
  useEffect(() => {
    const term = (legacySearchTerm || "").trim()
    if (term.length < 2) {
      setLegacyResults(emptyLegacyResults)
      setLegacyQuery("")
      return
    }
    if (legacyDebounceRef.current) clearTimeout(legacyDebounceRef.current)
    legacyDebounceRef.current = setTimeout(() => {
      legacyDebounceRef.current = null
      runLegacySearch()
    }, LEGACY_SEARCH_DEBOUNCE_MS)
    return () => {
      if (legacyDebounceRef.current) clearTimeout(legacyDebounceRef.current)
    }
  }, [legacySearchTerm, runLegacySearch])

  useEffect(() => {
    async function fetchAthletes() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (selectedGender !== "all") params.set("gender", selectedGender)
        if (selectedYear !== "all") params.set("year", selectedYear)
        if (selectedDivision !== "all") params.set("division", selectedDivision)

        const response = await fetch(`/api/athletes?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setAthletes(data.athletes || [])
        }
      } catch (error) {
        console.error("Failed to fetch athletes:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchAthletes()
  }, [selectedGender, selectedYear, selectedDivision])

  // Fetch stats from commitment-stats (division from colleges table); supports year filter
  useEffect(() => {
    async function fetchStats() {
      try {
        setStatsLoading(true)
        const yearParam = selectedYear !== "all" ? `?year=${selectedYear}` : ""
        const response = await fetch(`/api/commitment-stats${yearParam}`, { cache: "no-store" })
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.stats) {
            const s = data.stats
            setStats({
              total: s.totalCommitments || 0,
              male: s.byGender?.male || 0,
              female: s.byGender?.female || 0,
              divisions: {
                D1: s.byDivision?.D1 || 0,
                D2: s.byDivision?.D2 || 0,
                D3: s.byDivision?.D3 || 0,
                NAIA: s.byDivision?.NAIA || 0,
                NJCAA: s.byDivision?.NJCAA || 0,
              },
            })
          }
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [selectedYear])

  const filteredAthletes = athletes.filter((athlete) => {
    const matchesSearch =
      searchTerm === "" ||
      athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.college.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.highschool.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const clearFilters = () => {
    setSelectedGender("all")
    setSelectedYear("all")
    setSelectedDivision("all")
    setSearchTerm("")
  }

  const hasActiveFilters =
    selectedGender !== "all" || selectedYear !== "all" || selectedDivision !== "all" || searchTerm !== ""

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-8 w-8" style={{ color: NC_NAVY }} />
                <h1 className="text-2xl font-bold" style={{ color: NC_NAVY }}>Athletes</h1>
              </div>
              <p className="text-gray-600 mb-4">
                {tab === "commitments"
                  ? "Browse North Carolina wrestlers who have committed to college programs."
                  : "Legacy NC: search by name across NHSCA, NCHSAA, awards, Super32, and more."}
              </p>
              <div className="flex gap-2">
                <Button
                  variant={tab === "commitments" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTab("commitments")}
                  style={tab === "commitments" ? { backgroundColor: NC_NAVY } : {}}
                >
                  <Trophy className="h-4 w-4 mr-1" />
                  College Commitments
                </Button>
                <Button
                  variant={tab === "legacy" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTab("legacy")}
                  style={tab === "legacy" ? { backgroundColor: NC_NAVY } : {}}
                >
                  <FileSearch className="h-4 w-4 mr-1" />
                  Wrestlers (Legacy NC)
                </Button>
              </div>
            </div>
          </div>
        </div>

        {tab === "legacy" ? (
          /* Legacy Search: name search across Legacy NC tables */
          <div className="bg-white border-b">
            <div className="container mx-auto px-4 py-6">
              <div className="max-w-2xl mx-auto flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search by athlete name..."
                    value={legacySearchTerm}
                    onChange={(e) => setLegacySearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runLegacySearch()}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (legacyDebounceRef.current) clearTimeout(legacyDebounceRef.current)
                    legacyDebounceRef.current = null
                    runLegacySearch()
                  }}
                  disabled={legacyLoading || (legacySearchTerm || "").trim().length < 2}
                  style={{ backgroundColor: NC_NAVY }}
                >
                  {legacyLoading ? "Searching…" : "Search"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "legacy" && legacyQuery ? (
          <LegacySearchResults results={legacyResults} loading={legacyLoading} query={legacyQuery} />
        ) : tab === "legacy" ? (
          <div className="container mx-auto px-4 py-8 text-center text-gray-500">
            Enter at least 2 characters and click Search to find athletes across Legacy NC data.
          </div>
        ) : null}

        {tab !== "legacy" ? (
          <>
        {/* Stats Overview Section - Matches Home Page Style */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            {statsLoading ? (
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
                      {selectedYear !== "all" ? `Class of ${selectedYear}` : "All Classes"}
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
          </div>
        </div>

        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search athletes, colleges, or high schools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 text-lg border-2 border-gray-200 rounded-lg focus:ring-2"
                  style={{ focusBorderColor: "#002147" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" style={{ color: "#002147" }} />
                <span className="font-medium" style={{ color: "#002147" }}>Filter Athletes</span>
              </div>

              <div className="flex flex-wrap gap-4 flex-1">
                <Select value={selectedGender} onValueChange={setSelectedGender}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Men's Wrestling</SelectItem>
                    <SelectItem value="female">Women's Wrestling</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Class Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="2024">Class of 2024</SelectItem>
                    <SelectItem value="2025">Class of 2025</SelectItem>
                    <SelectItem value="2026">Class of 2026</SelectItem>
                    <SelectItem value="2027">Class of 2027</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    <SelectItem value="NCAA Division I">Division I</SelectItem>
                    <SelectItem value="NCAA Division II">Division II</SelectItem>
                    <SelectItem value="NCAA Division III">Division III</SelectItem>
                    <SelectItem value="NAIA">NAIA</SelectItem>
                    <SelectItem value="NJCAA">NJCAA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} size="sm">
                  Clear All Filters
                </Button>
              )}
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedGender !== "all" && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {selectedGender === "male" ? "Men's Wrestling" : "Women's Wrestling"}
                  </Badge>
                )}
                {selectedYear !== "all" && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Class of {selectedYear}
                  </Badge>
                )}
                {selectedDivision !== "all" && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    {selectedDivision}
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    Search: "{searchTerm}"
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading athletes...</p>
            </div>
          ) : filteredAthletes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No athletes found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {normalizeAthleteList(filteredAthletes).map((athlete) => (
                <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} />
              ))}
            </div>
          )}
        </div>
          </>
        ) : null}
      </div>
    </AuthGuard>
  )
}

function LegacySearchResults({
  results,
  loading,
  query,
}: {
  results: LegacyResultsState
  loading: boolean
  query: string
}) {
  const sections: { title: string; items: LegacyMatch[]; empty: string }[] = [
    { title: "Profiles", items: results.athletes, empty: "No matching athlete profiles." },
    { title: "College commits", items: results.commits as LegacyMatch[], empty: "No college commits." },
    { title: "NHSCA", items: results.nhsca, empty: "No NHSCA results." },
    { title: "NHSCA Placements (match-level)", items: results.nhscaPlacements, empty: "No NHSCA placements." },
    { title: "NCHSAA (State)", items: results.nchsaa, empty: "No NCHSAA results." },
    { title: "Most Outstanding Wrestler", items: results.mow, empty: "No MOW matches." },
    { title: "Dave Schultz Award", items: results.daveSchultz, empty: "No Dave Schultz matches." },
    { title: "Tricia Saunders Award", items: results.triciaSaunders, empty: "No Tricia Saunders matches." },
    { title: "Super32", items: results.super32, empty: "No Super32 results." },
    { title: "Single-season wins", items: results.winningest, empty: "No single-season wins." },
    { title: "Career wins", items: results.careerWinningest, empty: "No career wins." },
  ]
  const total = sections.reduce((acc, s) => acc + s.items.length, 0)

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
        <p className="mt-4 text-gray-600">Searching Legacy NC data…</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <p className="text-gray-600 mb-6">
        Found <strong>{total}</strong> match{total !== 1 ? "es" : ""} for &quot;{query}&quot;
      </p>
      <div className="space-y-8">
        {sections.map(({ title, items, empty }) => (
          <Card key={title} className="border">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-3" style={{ color: NC_NAVY }}>{title}</h3>
              {items.length === 0 ? (
                <p className="text-gray-500 text-sm">{empty}</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((m, i) => (
                    <li key={`${title}-${i}-${m.name}`} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{m.name}</span>
                      {m.detail ? <span className="text-gray-500">— {m.detail}</span> : null}
                      {m.athleteId ? (
                        <Link href={profileHref(m.athleteId)} className="text-blue-600 hover:underline">
                          View Profile
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
