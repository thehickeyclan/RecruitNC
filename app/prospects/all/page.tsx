"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RankingsTableView } from "@/components/rankings-table-view"
import { RankingsCardView } from "@/components/rankings-card-view"
import { Filter, LayoutGrid, List, Loader2, Search, Users, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

type RecruitingStatus = "committed" | "verbal" | "recruiting" | "interested" | "uncommitted"

type AchievementLevel = "all-american" | "state-champion" | "state-placer" | "state-qualifier" | "dnq"

type TournamentResult = {
  text: string
  placement: number | null
  year?: number
}

interface Prospect {
  id: string
  name: string
  graduationyear: number | null
  weightclass: string | null
  weight?: number | null
  highschool: string | null
  wrestlingClub: string | null
  college: string | null
  division: string | null
  photourl?: string | null
  achievements?: string[]
  gender?: string | null
  prospect_ranking?: number | null
  recruiting_status?: string | null
  academic_gpa?: number | null
  nationally_ranked_wins?: string | number | null
  location?: string | null
  state?: string | null
  state_results?: TournamentResult[]
  state_championship_summary?: string | null
  nhsca_results?: TournamentResult[]
  nhsca_record_display?: string | null
  nhsca_2024_placement?: string | null
  nhsca_2025_placement?: string | null
  nhsca_2024_record?: string | null
  nhsca_2025_record?: string | null
  super_32_results?: TournamentResult[]
  super32_results?: TournamentResult[]
  super_32_record_display?: string | null
  super_32_2024_placement?: string | null
  super_32_2025_placement?: string | null
  super_32_2024_record?: string | null
  super_32_2025_record?: string | null
}

const stateQualifiers2025 = [
  { full_name: "Damicquen Powell", graduation_year: 2026 },
  { full_name: "Hutson Catullo", graduation_year: 2026 },
  { full_name: "Jesse Farnsworth", graduation_year: 2026 },
  { full_name: "Keilan Adams", graduation_year: 2026 },
  { full_name: "Lleyton Hooper", graduation_year: 2026 },
  { full_name: "Sydney Martin", graduation_year: 2026 },
  { full_name: "Zack Sheets", graduation_year: 2026 },
  { full_name: "Carter Furman", graduation_year: 2027 },
  { full_name: "Colt Cambruzzi", graduation_year: 2027 },
  { full_name: "Garrison Raper", graduation_year: 2027 },
  { full_name: "Gavin Lopez", graduation_year: 2027 },
  { full_name: "Logan Mumy", graduation_year: 2027 },
]

export default function AllProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<"table" | "cards">("table")
  const [showFilters, setShowFilters] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [yearFilter, setYearFilter] = useState<string>("active")
  const [genderFilter, setGenderFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [rankFilter, setRankFilter] = useState<"all" | "ranked" | "unranked">("all")
  const [weightFilters, setWeightFilters] = useState<string[]>([])
  const [achievementFilters, setAchievementFilters] = useState<AchievementLevel[]>([])

  useEffect(() => {
    const run = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Single source: all athletes (NC) from public API – no admin APIs
        const prospectsResponse = await fetch('/api/prospects?limit=5000', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })

        if (!prospectsResponse.ok) {
          const text = await prospectsResponse.text().catch(() => '')
          throw new Error(
            `Athlete profiles API ${prospectsResponse.status} ${prospectsResponse.statusText}${text ? ` - ${text}` : ''}`,
          )
        }

        const prospectsPayload = await prospectsResponse.json()
        const rawProspects = Array.isArray(prospectsPayload?.prospects)
          ? prospectsPayload.prospects
          : Array.isArray(prospectsPayload)
            ? prospectsPayload
            : []

        // All NC athletes, all years (filter client-side by year/gender)
        const filtered = rawProspects.filter(isNorthCarolinaProspect)

        setProspects(filtered)
      } catch (fetchError: any) {
        console.error("[prospects/all] Error loading athlete profiles:", fetchError)
        setError(fetchError?.message || "Unable to load athlete profiles right now.")
      } finally {
        setIsLoading(false)
      }
    }

    run()
  }, [])

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    for (const prospect of prospects) {
      if (prospect.graduationyear && prospect.graduationyear >= 2024 && prospect.graduationyear <= 2032) {
        years.add(prospect.graduationyear)
      }
    }
    return Array.from(years).sort((a, b) => a - b)
  }, [prospects])

  const availableWeightClasses = useMemo(() => {
    const weights = new Set<string>()
    prospects.forEach((prospect) => {
      const weight = (prospect.weightclass || prospect.weight?.toString() || "").trim()
      if (weight) {
        weights.add(weight.replace(/\s*l?bs?\.?$/i, "").trim())
      }
    })
    return Array.from(weights)
      .map((weight) => (/\d/.test(weight) ? weight : weight.toUpperCase()))
      .sort((a, b) => {
        const aNum = Number.parseInt(a)
        const bNum = Number.parseInt(b)
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum
        return a.localeCompare(b)
      })
  }, [prospects])

  const summarizeStatus = (status?: string | null): RecruitingStatus => {
    const normalized = (status ?? "").toString().toLowerCase().trim()
    if (!normalized) return "uncommitted"
    if (normalized.includes("verb")) return "verbal"
    if (normalized.includes("commit") || normalized.includes("signed")) return "committed"
    if (normalized.includes("recruit")) return "recruiting"
    if (normalized.includes("interest")) return "interested"
    return "uncommitted"
  }

  const getHighestAchievement = (prospect: Prospect): { level: AchievementLevel; badge: string; color: string } => {
    const nhscaResults = coerceTournamentResults(prospect.nhsca_results, buildLegacyNHSCAResults(prospect))
    const super32Results = coerceTournamentResults(
      prospect.super_32_results ?? prospect.super32_results,
      buildLegacySuper32Results(prospect),
    )
    const stateResults = coerceTournamentResults(prospect.state_results, buildLegacyStateResults(prospect))

    // Check for All-American (NHSCA or Super 32 top 8)
    const isNHSCAAA = nhscaResults?.some((r) => r.placement && r.placement <= 8)
    const isSuper32AA = super32Results?.some((r) => r.placement && r.placement <= 8)
    if (isNHSCAAA || isSuper32AA) {
      return { level: "all-american", badge: "All-American", color: "bg-purple-600 text-white" }
    }

    // Check for State Champion
    const isStateChamp = stateResults?.some((r) => r.placement === 1)
    if (isStateChamp) {
      return { level: "state-champion", badge: "State Champion", color: "bg-yellow-500 text-white" }
    }

    // Check for State Placer (2nd-6th)
    const isStatePlacer = stateResults?.some((r) => r.placement && r.placement >= 2 && r.placement <= 6)
    if (isStatePlacer) {
      return { level: "state-placer", badge: "State Placer", color: "bg-blue-600 text-white" }
    }

    // Check for State Qualifier
    const isStateQualifier =
      stateResults?.some((r) => r.placement === null || r.placement > 8) ||
      stateQualifiers2025.some(
        (sq) =>
          sq.full_name.toLowerCase() === prospect.name.toLowerCase() &&
          sq.graduation_year === prospect.graduationyear,
      )
    if (isStateQualifier) {
      return { level: "state-qualifier", badge: "State Qualifier", color: "bg-green-600 text-white" }
    }

    // DNQ (Did Not Qualify)
    return { level: "dnq", badge: "DNQ", color: "bg-gray-400 text-white" }
  }

  function getRawRank(prospect: Prospect): number {
    const p = prospect.prospect_ranking
    if (p != null && Number.isFinite(Number(p))) return Number(p)
    const r = (prospect as any)?.rankings
    if (r != null && typeof r === "number" && Number.isFinite(r)) return r
    if (r != null && typeof r === "object") {
      const n = (r as Record<string, unknown>)[2029] ?? (r as Record<string, unknown>)["2029"] ?? (r as Record<string, unknown>).class_2029 ?? (r as Record<string, unknown>)[2028] ?? (r as Record<string, unknown>)["2028"] ?? (r as Record<string, unknown>).class_2028 ?? (r as Record<string, unknown>).state ?? (r as Record<string, unknown>).national
      if (typeof n === "number" && Number.isFinite(n)) return n
    }
    return NaN
  }

  const filteredProspects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return prospects.filter((prospect) => {
      if (term) {
        const matchesTerm =
          prospect.name?.toLowerCase().includes(term) ||
          prospect.highschool?.toLowerCase().includes(term) ||
          prospect.wrestlingClub?.toLowerCase().includes(term) ||
          prospect.college?.toLowerCase().includes(term)
        if (!matchesTerm) return false
      }

      if (yearFilter === "active") {
        const y = prospect.graduationyear
        if (y == null || y < 2026 || y > 2029) return false
      } else if (yearFilter === "graduates") {
        const y = prospect.graduationyear
        if (y == null || y > 2025) return false
      } else if (yearFilter !== "all") {
        if (String(prospect.graduationyear || "") !== yearFilter) return false
      }

      if (genderFilter !== "all") {
        const genderValue = ((prospect.gender ?? "") as string).toString().toLowerCase().trim()
        if (genderFilter === "male") {
          const isMale =
            genderValue === "male" ||
            genderValue === "m" ||
            genderValue === "men" ||
            genderValue === "man" ||
            genderValue === "boy" ||
            genderValue.includes("men's") ||
            genderValue.includes("male") ||
            genderValue.includes("boys")
          const isFemale =
            genderValue.includes("female") ||
            genderValue.includes("woman") ||
            genderValue.includes("girl")
          if (!isMale || isFemale) return false
        }
        if (genderFilter === "female") {
          const isFemale =
            genderValue === "female" ||
            genderValue === "f" ||
            genderValue.includes("woman") ||
            genderValue.includes("women") ||
            genderValue.includes("girl")
          const isMale =
            (genderValue.includes("male") && !genderValue.includes("female")) ||
            genderValue.includes("men") ||
            genderValue.includes("boy")
          if (!isFemale || isMale) return false
        }
      }

      if (statusFilter !== "all") {
        const statusRaw =
          (prospect as any).recruiting_status ??
          (prospect as any).recruitingStatus ??
          (prospect as any).recruiting_status_display ??
          ""
        const summarized = summarizeStatus(statusRaw)
        if (statusFilter === "committed" && summarized !== "committed") return false
        if (statusFilter === "uncommitted" && summarized === "committed") return false
        if (statusFilter === "verbal" && summarized !== "verbal") return false
      }

      if (rankFilter === "ranked" || rankFilter === "unranked") {
        const gradYear = prospect.graduationyear
        const rawRank = getRawRank(prospect)
        const maxRank =
          gradYear === 2028 || gradYear === 2029 ? 20 : gradYear === 2026 || gradYear === 2027 ? 30 : 0
        const hasOfficialRank =
          Number.isFinite(rawRank) && rawRank >= 1 && rawRank <= maxRank
        if (rankFilter === "ranked" && !hasOfficialRank) return false
        if (rankFilter === "unranked" && hasOfficialRank) return false
      }

      if (weightFilters.length > 0) {
        const normalizedWeight = (prospect.weightclass || prospect.weight?.toString() || "")
          .replace(/\s*l?bs?\.?$/i, "")
          .trim()
        if (!weightFilters.includes(normalizedWeight)) return false
      }

      if (achievementFilters.length > 0) {
        const achievement = getHighestAchievement(prospect)
        if (!achievementFilters.includes(achievement.level)) return false
      }

      return true
    })
  }, [prospects, searchTerm, yearFilter, genderFilter, statusFilter, rankFilter, weightFilters, achievementFilters])

  const sortedProspects = useMemo(() => {
    return [...filteredProspects].sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }))
  }, [filteredProspects])

  const committedCount = useMemo(
    () => sortedProspects.filter((prospect) => {
      const status = summarizeStatus(prospect.recruiting_status)
      // Must have "committed" status AND have a college assigned
      return status === "committed" && prospect.college && prospect.college.trim() !== ""
    }).length,
    [sortedProspects],
  )

  const uncommittedCount = useMemo(
    () => {
      // Uncommitted = all prospects that are NOT committed (don't have both committed status AND college)
      return sortedProspects.filter((prospect) => {
        const status = summarizeStatus(prospect.recruiting_status)
        const hasCollege = prospect.college && prospect.college.trim() !== ""
        // Not committed if: status is not "committed" OR no college assigned
        return !(status === "committed" && hasCollege)
      }).length
    },
    [sortedProspects],
  )

  const tableAthletes = useMemo(() => {
    const mapped = sortedProspects.map((prospect, index) => {
      const weightValue =
        prospect.weightclass && prospect.weightclass.trim() !== ""
          ? prospect.weightclass
          : prospect.weight
            ? String(prospect.weight)
            : ""

      const hasRankedWin =
        !!prospect.nationally_ranked_wins &&
        (!["0", "none", "None"].includes(String(prospect.nationally_ranked_wins).trim()))

      const achievement = getHighestAchievement(prospect)
      const status = summarizeStatus(prospect.recruiting_status)
      const commitmentDisplay =
        status === "committed" && prospect.college && prospect.college.trim() !== ""
          ? "Committed"
          : status === "verbal"
            ? "Verbal"
            : "Uncommitted"

      // Only show rank for athletes on our official rankings: top 30 in 2026/2027, top 20 in 2028/2029; show "G" for graduated (2025 and earlier)
      const gradYear = prospect.graduationyear
      const isRankedClass = gradYear === 2026 || gradYear === 2027 || gradYear === 2028 || gradYear === 2029
      const rawRank = getRawRank(prospect)
      const maxRankForClass =
        gradYear === 2028 || gradYear === 2029 ? 20 : (gradYear === 2026 || gradYear === 2027 ? 30 : 0)
      const hasOfficialRank =
        Number.isFinite(rawRank) && rawRank >= 1 && rawRank <= maxRankForClass
      const prospectRanking = isRankedClass && hasOfficialRank ? rawRank : null
      const rankDisplay = !isRankedClass && gradYear != null && gradYear <= 2025 ? "G" : undefined

      return {
        id: prospect.id || `prospect-${index}`,
        name: prospect.name || "Unknown",
        highschool: prospect.highschool || "—",
        weight_display: weightValue || "-",
        graduation_year: prospect.graduationyear ?? null,
        achievement_badge: achievement.badge,
        achievement_color: achievement.color,
        has_ranked_win: hasRankedWin,
        academic_gpa: prospect.academic_gpa ?? null,
        prospect_ranking: prospectRanking,
        rank_display: rankDisplay,
        photourl: prospect.photourl ?? undefined,
        nationally_ranked_wins: prospect.nationally_ranked_wins ?? undefined,
        college: prospect.college ?? undefined,
        recruiting_status: prospect.recruiting_status ?? undefined,
        commitment_status_display: commitmentDisplay,
      }
    })

    if (mapped.length > 0) {
      console.log("[prospects/all] tableAthletes sample", mapped.slice(0, 3))
    }
    return mapped
  }, [sortedProspects])

  const resetFilters = () => {
    setSearchTerm("")
    setYearFilter("active")
    setGenderFilter("all")
    setStatusFilter("all")
    setRankFilter("all")
    setWeightFilters([])
    setAchievementFilters([])
  }

  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm.trim() !== "" ||
      (yearFilter !== "all" && yearFilter !== "active") ||
      genderFilter !== "all" ||
      statusFilter !== "all" ||
      rankFilter !== "all" ||
      weightFilters.length > 0 ||
      achievementFilters.length > 0
    )
  }, [searchTerm, yearFilter, genderFilter, statusFilter, rankFilter, weightFilters, achievementFilters])

  const isShutDown = false

  if (isShutDown) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-[#B31B1B]">
              <h1 className="text-3xl font-bold text-[#002147] mb-4">Page Temporarily Unavailable</h1>
              <p className="text-lg text-gray-700 mb-6">
                The All Prospects page is temporarily unavailable for maintenance.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Please check back soon or visit the <a href="/public-rankings/2026" className="text-[#B31B1B] hover:underline">rankings pages</a> for prospect information.
              </p>
              <div className="flex gap-4 justify-center">
                <a href="/">
                  <Button variant="outline">Return to Home</Button>
                </a>
                <a href="/public-rankings/2026">
                  <Button className="bg-[#B31B1B] hover:bg-[#8B1515] text-white">View Rankings</Button>
                </a>
              </div>
            </div>
          </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero: NC Athlete Profiles – public, no auth required */}
      <section className="bg-gradient-to-r from-[#03154C] via-[#002147] to-[#012ECD] text-white py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <Badge className="mb-4 bg-white/20 text-white border-white/30" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              NC Athletes
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">Athlete Profiles</h1>
            <p className="text-lg md:text-xl text-white/90 mb-8">
              All NC wrestlers – every graduation year, male and female. Browse by name, school, year, and more.
              Create your profile and we automatically pull in your NCHSAA, NHSCA, and Super 32 results.
            </p>
            <Link href="/create-profile">
              <Button
                size="lg"
                className="bg-[#D3B574] hover:bg-[#c4a660] text-[#002147] font-bold text-lg px-8 py-6 rounded-lg shadow-lg"
              >
                Create your profile
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 space-y-10">

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Athletes</p>
              <p className="text-3xl font-bold text-[#03154C]">{sortedProspects.length}</p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-1">Committed</p>
              <p className="text-3xl font-bold text-green-600">{committedCount}</p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-1">Uncommitted</p>
              <p className="text-3xl font-bold text-[#B31B1B]">{uncommittedCount}</p>
            </div>
          </div>

          {/* Compact Filter Bar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name, school, club, or college..."
                  className="pl-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Button & View Toggle */}
            <div className="flex items-center gap-2">
              {/* Mobile Filter Button */}
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="md:hidden gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                        {[yearFilter !== "all" && yearFilter !== "active", genderFilter !== "all", statusFilter !== "all", rankFilter !== "all", weightFilters.length > 0, achievementFilters.length > 0].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filter Prospects</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    {/* Achievement Level */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Achievement Level</label>
                      <div className="grid gap-2 grid-cols-2">
                        {[
                          { value: "all-american" as AchievementLevel, label: "All-American", color: "bg-purple-600" },
                          { value: "state-champion" as AchievementLevel, label: "State Champion", color: "bg-yellow-500" },
                          { value: "state-placer" as AchievementLevel, label: "State Placer", color: "bg-blue-600" },
                          { value: "state-qualifier" as AchievementLevel, label: "State Qualifier", color: "bg-green-600" },
                          { value: "dnq" as AchievementLevel, label: "DNQ", color: "bg-gray-400" },
                        ].map(({ value, label, color }) => {
                          const isChecked = achievementFilters.includes(value)
                          return (
                            <label
                              key={value}
                              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium cursor-pointer"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  setAchievementFilters((prev) =>
                                    checked ? [...prev, value] : prev.filter((a) => a !== value),
                                  )
                                }}
                              />
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${color}`}></div>
                                <span>{label}</span>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    {/* Quick Filters */}
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium">Graduation Year</label>
                        <Select value={yearFilter} onValueChange={setYearFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Years" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active (2026–2029)</SelectItem>
                            <SelectItem value="all">All Years</SelectItem>
                            <SelectItem value="graduates">Graduates (2025 and earlier)</SelectItem>
                            {availableYears.map((year) => (
                              <SelectItem key={year} value={String(year)}>
                                Class of {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Gender</label>
                        <Select value={genderFilter} onValueChange={setGenderFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Genders" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Genders</SelectItem>
                            <SelectItem value="male">Men&apos;s Wrestling</SelectItem>
                            <SelectItem value="female">Women&apos;s Wrestling</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Recruiting Status</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="committed">Committed</SelectItem>
                            <SelectItem value="verbal">Verbal Commit</SelectItem>
                            <SelectItem value="uncommitted">Uncommitted</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Ranking Status</label>
                        <Select value={rankFilter} onValueChange={(value) => setRankFilter(value as typeof rankFilter)}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Athletes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Athletes</SelectItem>
                            <SelectItem value="ranked">Ranked</SelectItem>
                            <SelectItem value="unranked">Unranked</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Weight Classes */}
                    {availableWeightClasses.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Weight Classes</label>
                          {weightFilters.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setWeightFilters([])}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-2 grid-cols-3 max-h-48 overflow-y-auto">
                          {availableWeightClasses.map((weight) => {
                            const normalized = weight
                            const isChecked = weightFilters.includes(normalized)
                            return (
                              <label
                                key={normalized}
                                className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium cursor-pointer"
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    setWeightFilters((prev) =>
                                      checked ? [...prev, normalized] : prev.filter((w) => w !== normalized),
                                    )
                                  }}
                                />
                                <span>{normalized.match(/^\d+$/) ? `${normalized} lbs` : normalized}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={resetFilters} className="flex-1">
                        Reset All
                      </Button>
                      <Button onClick={() => setMobileFiltersOpen(false)} className="flex-1">
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Desktop Filter Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="hidden md:flex gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? "Hide Filters" : "Show Filters"}
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {[yearFilter !== "all" && yearFilter !== "active", genderFilter !== "all", statusFilter !== "all", rankFilter !== "all", weightFilters.length > 0, achievementFilters.length > 0].filter(Boolean).length}
                  </Badge>
                )}
              </Button>

              {/* View Toggle */}
              <div className="inline-flex items-center rounded-md border bg-background p-1 shadow-sm">
                <Button
                  type="button"
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Cards</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchTerm}
                  <button onClick={() => setSearchTerm("")} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {yearFilter === "graduates" && (
                <Badge variant="secondary" className="gap-1">
                  Graduates (2025 and earlier)
                  <button onClick={() => setYearFilter("active")} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {yearFilter !== "all" && yearFilter !== "active" && yearFilter !== "graduates" && (
                <Badge variant="secondary" className="gap-1">
                  Class of {yearFilter}
                  <button onClick={() => setYearFilter("active")} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {yearFilter === "active" && (
                <Badge variant="secondary" className="gap-1">
                  Active (2026–2029)
                  <button onClick={() => setYearFilter("all")} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {genderFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {genderFilter === "male" ? "Men's" : "Women's"}
                  <button onClick={() => setGenderFilter("all")} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {statusFilter}
                  <button onClick={() => setStatusFilter("all")} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {rankFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {rankFilter === "ranked" ? "Ranked" : "Unranked"}
                  <button onClick={() => setRankFilter("all")} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {weightFilters.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {weightFilters.length} weight{weightFilters.length > 1 ? "s" : ""}
                  <button onClick={() => setWeightFilters([])} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {achievementFilters.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {achievementFilters.length} achievement{achievementFilters.length > 1 ? "s" : ""}
                  <button onClick={() => setAchievementFilters([])} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs">
                Clear All
              </Button>
            </div>
          )}

          {/* Desktop Collapsible Filters */}
          {showFilters && (
            <div className="rounded-lg border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#03154C]">Filter Options</h3>
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Reset All
                </Button>
              </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Achievement Level</label>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
                {[
                  { value: "all-american" as AchievementLevel, label: "All-American", color: "bg-purple-600" },
                  { value: "state-champion" as AchievementLevel, label: "State Champion", color: "bg-yellow-500" },
                  { value: "state-placer" as AchievementLevel, label: "State Placer", color: "bg-blue-600" },
                  { value: "state-qualifier" as AchievementLevel, label: "State Qualifier", color: "bg-green-600" },
                  { value: "dnq" as AchievementLevel, label: "DNQ", color: "bg-gray-400" },
                ].map(({ value, label, color }) => {
                  const isChecked = achievementFilters.includes(value)
                  return (
                    <label
                      key={value}
                      className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium shadow-sm transition hover:border-[#D3B574] hover:text-[#03154C] cursor-pointer"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          setAchievementFilters((prev) =>
                            checked ? [...prev, value] : prev.filter((a) => a !== value),
                          )
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color}`}></div>
                        <span>{label}</span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="xl:col-span-2">
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by name, school, club, or college..."
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Graduation Year</label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (2026–2029)</SelectItem>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="graduates">Graduates (2025 and earlier)</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        Class of {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Gender</label>
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Genders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Men&apos;s Wrestling</SelectItem>
                    <SelectItem value="female">Women&apos;s Wrestling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Recruiting Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="committed">Committed</SelectItem>
                    <SelectItem value="verbal">Verbal Commit</SelectItem>
                    <SelectItem value="uncommitted">Uncommitted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Ranking Status</label>
                <Select value={rankFilter} onValueChange={(value) => setRankFilter(value as typeof rankFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Prospects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Athletes</SelectItem>
                    <SelectItem value="ranked">Ranked</SelectItem>
                    <SelectItem value="unranked">Unranked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">Weight Classes</label>
                {weightFilters.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setWeightFilters([])}
                  >
                    Clear
                  </Button>
                )}
              </div>
              {availableWeightClasses.length === 0 ? (
                <p className="text-xs text-muted-foreground">Weights populate once prospect data loads.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {availableWeightClasses.map((weight) => {
                    const normalized = weight
                    const isChecked = weightFilters.includes(normalized)
                    return (
                      <label
                        key={normalized}
                        className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium shadow-sm transition hover:border-[#D3B574] hover:text-[#03154C]"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            setWeightFilters((prev) =>
                              checked ? [...prev, normalized] : prev.filter((w) => w !== normalized),
                            )
                          }}
                        />
                        <span>{normalized.match(/^\d+$/) ? `${normalized} lbs` : normalized}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            </div>
          )}

          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-[#03154C]">Athlete Profiles</h3>
                <p className="text-sm text-muted-foreground">
                  All prospects A–Z. Sort by name, rank, weight, school, or commitment status.
                </p>
              </div>
              <Badge variant="outline" className="gap-2 text-sm">
                <Filter className="h-4 w-4" />
                {sortedProspects.length} Showing
              </Badge>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#03154C]" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
                <p className="text-lg font-semibold text-[#B31B1B]">We couldn&apos;t load the prospect list.</p>
                <p className="text-sm text-muted-foreground max-w-md">{error}</p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </div>
            ) : sortedProspects.length === 0 ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-16 text-center text-muted-foreground">
                <Users className="h-10 w-10" />
                <p>No prospects matched your current filters.</p>
                <Button variant="outline" onClick={resetFilters}>
                  Clear Filters
                </Button>
              </div>
            ) : viewMode === "table" ? (
              <div className="overflow-x-auto px-2 pb-6">
                <RankingsTableView
                  athletes={tableAthletes}
                  hideRankColumn={false}
                  showRankColumn={true}
                  defaultSortField="name"
                  defaultSortDirection="asc"
                  additionalDividerLabel=""
                  dividerAfterRank={0}
                />
              </div>
            ) : (
              <div className="px-2 pb-6">
                <RankingsCardView
                  athletes={tableAthletes}
                  loading={false}
                  showRankBadges={false}
                  showAdditionalDivider={false}
                />
              </div>
            )}
          </div>
        </section>
      </div>
  )
}

function isNorthCarolinaProspect(prospect: Prospect) {
  const state = (prospect.state || "").trim().toLowerCase()
  if (state) {
    if (state === "nc" || state === "north carolina") return true
    return false
  }

  const location = (prospect.location || "").trim().toLowerCase()
  if (location) {
    if (/\bnorth carolina\b/.test(location) || /\bnc\b/.test(location.replace(/[.,]/g, " "))) {
      return true
    }

    const nonNcStates = [
      "sc",
      "south carolina",
      "ga",
      "georgia",
      "va",
      "virginia",
      "tn",
      "tennessee",
      "fl",
      "florida",
      "oh",
      "ohio",
      "pa",
      "pennsylvania",
      "ny",
      "new york",
      "tx",
      "texas",
      "ca",
      "california",
      "al",
      "alabama",
    ]

    if (nonNcStates.some((stateToken) => location.includes(stateToken))) {
      return false
    }
  }

  // Default to including when we can't determine
  return true
}

function parsePlacement(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const digits = value.match(/\d+/)
    if (digits) {
      return Number.parseInt(digits[0], 10)
    }
  }
  return null
}

function coerceTournamentResults(
  source?: TournamentResult[] | null,
  fallback?: TournamentResult[],
): TournamentResult[] | undefined {
  if (Array.isArray(source) && source.length > 0) {
    return source.map((entry) => ({
      placement: parsePlacement(entry.placement ?? null),
      text: entry.text,
      year: entry.year,
    }))
  }

  if (fallback && fallback.length > 0) {
    return fallback
  }

  return undefined
}

function buildLegacyTournamentEntry(
  label: string,
  placement?: string | number | null,
  record?: string | null,
  year?: number,
): TournamentResult | null {
  if (!placement && !record) return null
  
  const placementNum = parsePlacement(placement ?? null)
  const parts = []
  
  // Add placement text with ordinal suffix
  if (placementNum) {
    let ordinalPlacement: string
    if (placementNum === 1) ordinalPlacement = "1st"
    else if (placementNum === 2) ordinalPlacement = "2nd"
    else if (placementNum === 3) ordinalPlacement = "3rd"
    else if (placementNum <= 8) ordinalPlacement = `${placementNum}th Place (AA)`
    else ordinalPlacement = `${placementNum}th Place`
    
    parts.push(ordinalPlacement)
  } else if (placement && typeof placement === "string") {
    // If placement exists as string but couldn't parse as number, include it
    parts.push(String(placement))
  }
  
  if (record) parts.push(`Record: ${record}`)
  
  return {
    placement: placementNum,
    text: `${label}${parts.length > 0 ? " – " + parts.join(" • ") : ""}`,
    year,
  }
}

function buildLegacyNHSCAResults(prospect: Prospect): TournamentResult[] {
  const results: TournamentResult[] = []

  const entry2025 = buildLegacyTournamentEntry(
    "NHSCA Nationals 2025",
    prospect.nhsca_2025_placement,
    prospect.nhsca_2025_record,
    2025,
  )
  if (entry2025) results.push(entry2025)

  const entry2024 = buildLegacyTournamentEntry(
    "NHSCA Nationals 2024",
    prospect.nhsca_2024_placement,
    prospect.nhsca_2024_record,
    2024,
  )
  if (entry2024) results.push(entry2024)

  return results
}

function buildLegacySuper32Results(prospect: Prospect): TournamentResult[] {
  const results: TournamentResult[] = []

  const entry2025 = buildLegacyTournamentEntry(
    "Super 32 (2025)",
    prospect.super_32_2025_placement,
    prospect.super_32_2025_record,
    2025,
  )
  if (entry2025) results.push(entry2025)

  const entry2024 = buildLegacyTournamentEntry(
    "Super 32 (2024)",
    prospect.super_32_2024_placement,
    prospect.super_32_2024_record,
    2024,
  )
  if (entry2024) results.push(entry2024)

  return results
}

function buildLegacyStateResults(prospect: Prospect): TournamentResult[] {
  const summary =
    prospect.state_championship_summary ||
    prospect.achievements?.find((achievement) => achievement.toLowerCase().includes("state"))

  if (!summary) return []

  return [
    {
      text: summary,
      placement: parsePlacement(summary),
      year: prospect.graduationyear ?? undefined,
    },
  ]
}
