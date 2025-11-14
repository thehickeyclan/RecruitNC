"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, LayoutGrid, List, Loader2, Search, Users, ExternalLink } from 'lucide-react'

type RecruitingStatus = "committed" | "verbal" | "recruiting" | "interested" | "uncommitted"

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

const STATE_QUALIFIERS_2025 = [
  { name: "Peyton Craft", year: 2027 },
  { name: "Christian Deleon", year: 2026 },
  { name: "Landon Greene", year: 2027 },
  { name: "Lucas Greene", year: 2027 },
  { name: "Elijah Horton", year: 2027 },
  { name: "Jax Lipford", year: 2027 },
  { name: "Christian Murray", year: 2027 },
  { name: "Grayson Sigmon", year: 2027 },
  { name: "Bryce Stamey", year: 2026 },
  { name: "Owen Tart", year: 2027 },
  { name: "Cohen Walker", year: 2027 },
  { name: "Tristan Warren", year: 2027 },
]

export default function AllProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<"table" | "cards">("table")

  const [searchTerm, setSearchTerm] = useState("")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [genderFilter, setGenderFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [rankFilter, setRankFilter] = useState<"all" | "ranked" | "unranked">("all")
  const [weightFilters, setWeightFilters] = useState<string[]>([])
  const [achievementFilters, setAchievementFilters] = useState<string[]>([])

  useEffect(() => {
    const run = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [prospectsRes, rankingsRes] = await Promise.all([
          fetch("/api/prospects?limit=1000", {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }),
          fetch("/api/admin/prospects/simple-ranking", {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }),
        ])

        if (!prospectsRes.ok) {
          const text = await prospectsRes.text().catch(() => "")
          throw new Error(
            `Prospects API ${prospectsRes.status} ${prospectsRes.statusText}${text ? ` - ${text}` : ""}`,
          )
        }

        if (!rankingsRes.ok) {
          const text = await rankingsRes.text().catch(() => "")
          throw new Error(
            `Rankings API ${rankingsRes.status} ${rankingsRes.statusText}${text ? ` - ${text}` : ""}`,
          )
        }

        const prospectsPayload = await prospectsRes.json()
        const rankingsPayload = await rankingsRes.json()

        const rawProspects = Array.isArray(prospectsPayload?.prospects)
          ? prospectsPayload.prospects
          : Array.isArray(prospectsPayload)
            ? prospectsPayload
            : []

        const rawRankings = Array.isArray(rankingsPayload?.rankings)
          ? rankingsPayload.rankings
          : Array.isArray(rankingsPayload)
            ? rankingsPayload
            : []

        const filtered = rawProspects
          .filter((prospect: Prospect) => Number(prospect.graduationyear) !== 2025)
          .filter(isNorthCarolinaProspect)

        const rankingMap = new Map<string, any>()
        for (const ranking of rawRankings) {
          if (ranking?.athlete_id) rankingMap.set(ranking.athlete_id, ranking)
        }

        const merged = filtered.map((prospect) => {
          const ranking = rankingMap.get(prospect.id)
          return {
            ...prospect,
            prospect_ranking: ranking?.prospect_ranking ?? ranking?.overall_rank ?? prospect.prospect_ranking ?? null,
            nhsca_results: ranking?.nhsca_results ?? prospect.nhsca_results,
            nhsca_record_display:
              ranking?.nhsca_record_display ??
              ranking?.nhsca_record ??
              prospect.nhsca_record_display ??
              prospect.nhsca_2025_record ??
              prospect.nhsca_2024_record,
            super_32_results: ranking?.super_32_results ?? prospect.super_32_results ?? prospect.super32_results,
            super_32_record_display:
              ranking?.super_32_record_display ??
              ranking?.super_32_record ??
              prospect.super_32_record_display ??
              prospect.super_32_2025_record ??
              prospect.super_32_2024_record,
            state_results: ranking?.state_results ?? prospect.state_results,
            state_championship_summary:
              ranking?.state_championship_summary ??
              prospect.state_championship_summary ??
              prospect.achievements?.find((achievement) => achievement.toLowerCase().includes("state")),
          }
        })

        setProspects(merged)
      } catch (fetchError: any) {
        console.error("[prospects/all] Error loading prospects:", fetchError)
        setError(fetchError?.message || "Unable to load prospects right now.")
      } finally {
        setIsLoading(false)
      }
    }

    run()
  }, [])

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    for (const prospect of prospects) {
      if (prospect.graduationyear && prospect.graduationyear >= 2026 && prospect.graduationyear <= 2030) {
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
    const normalized = status?.toLowerCase() || ""
    if (normalized.includes("verb")) return "verbal"
    if (normalized.includes("commit")) return "committed"
    if (normalized.includes("recruit")) return "recruiting"
    if (normalized.includes("interest")) return "interested"
    return "uncommitted"
  }

  const calculateHighestAchievement = (prospect: Prospect): string => {
    const stateResults = coerceTournamentResults(prospect.state_results, buildLegacyStateResults(prospect))
    const nhscaResults = coerceTournamentResults(prospect.nhsca_results, buildLegacyNHSCAResults(prospect))
    const super32Results = coerceTournamentResults(
      prospect.super_32_results ?? prospect.super32_results,
      buildLegacySuper32Results(prospect),
    )

    const hasNHSCAAA = nhscaResults?.some((r) => r.placement && r.placement <= 8)
    const hasSuper32AA = super32Results?.some((r) => r.placement && r.placement <= 8)
    if (hasNHSCAAA || hasSuper32AA) return "all-american"

    const isStateChamp = stateResults?.some(
      (r) =>
        r.text.toLowerCase().includes("champion") ||
        r.text.toLowerCase().includes("1st") ||
        (r.placement && r.placement === 1),
    )
    if (isStateChamp) return "state-champion"

    const isStatePlacer = stateResults?.some((r) => {
      if (r.placement && r.placement >= 2 && r.placement <= 6) return true
      const text = r.text.toLowerCase()
      return (
        text.includes("2nd") ||
        text.includes("3rd") ||
        text.includes("4th") ||
        text.includes("5th") ||
        text.includes("6th")
      )
    })
    if (isStatePlacer) return "state-placer"

    const isStateQualifier = stateResults?.some((r) => {
      const text = r.text.toLowerCase()
      return text.includes("sq") || text.includes("qualifier") || text.includes("qualified")
    })

    const is2025SQ = STATE_QUALIFIERS_2025.some(
      (sq) =>
        sq.name.toLowerCase() === (prospect.name || "").toLowerCase() &&
        String(sq.year) === String(prospect.graduationyear),
    )

    if (isStateQualifier || is2025SQ) return "state-qualifier"

    return "dnq"
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

      if (yearFilter !== "all") {
        if (String(prospect.graduationyear || "") !== yearFilter) return false
      }

      if (genderFilter !== "all") {
        const genderValue = (prospect.gender || "").toLowerCase()
        if (genderFilter === "male" && !["male", "m", "boy", "men", "man"].some((g) => genderValue === g)) return false
        if (genderFilter === "female" && !["female", "f", "girl", "women", "woman"].some((g) => genderValue === g))
          return false
      }

      if (statusFilter !== "all") {
        const summarized = summarizeStatus(prospect.recruiting_status)
        if (statusFilter === "committed" && summarized !== "committed") return false
        if (statusFilter === "uncommitted" && summarized === "committed") return false
        if (statusFilter === "verbal" && summarized !== "verbal") return false
      }

      if (rankFilter === "ranked" && !prospect.prospect_ranking) return false
      if (rankFilter === "unranked" && prospect.prospect_ranking) return false

      if (weightFilters.length > 0) {
        const normalizedWeight = (prospect.weightclass || prospect.weight?.toString() || "")
          .replace(/\s*l?bs?\.?$/i, "")
          .trim()
        if (!weightFilters.includes(normalizedWeight)) return false
      }

      if (achievementFilters.length > 0) {
        const achievement = calculateHighestAchievement(prospect)
        if (!achievementFilters.includes(achievement)) return false
      }

      return true
    })
  }, [prospects, searchTerm, yearFilter, genderFilter, statusFilter, rankFilter, weightFilters, achievementFilters])

  const sortedProspects = useMemo(() => {
    return [...filteredProspects].sort((a, b) => {
      const rankA = a.prospect_ranking ?? Number.POSITIVE_INFINITY
      const rankB = b.prospect_ranking ?? Number.POSITIVE_INFINITY

      if (rankA !== rankB) return rankA - rankB

      const gradA = a.graduationyear ?? Number.POSITIVE_INFINITY
      const gradB = b.graduationyear ?? Number.POSITIVE_INFINITY
      if (gradA !== gradB) return gradA - gradB

      return (a.name || "").localeCompare(b.name || "")
    })
  }, [filteredProspects])

  const committedCount = useMemo(
    () => sortedProspects.filter((prospect) => summarizeStatus(prospect.recruiting_status) === "committed").length,
    [sortedProspects],
  )

  const uncommittedCount = useMemo(
    () => sortedProspects.filter((prospect) => summarizeStatus(prospect.recruiting_status) === "uncommitted").length,
    [sortedProspects],
  )

  const resetFilters = () => {
    setSearchTerm("")
    setYearFilter("all")
    setGenderFilter("all")
    setStatusFilter("all")
    setRankFilter("all")
    setWeightFilters([])
    setAchievementFilters([])
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-r from-[#03154C] to-[#012ECD] text-white py-14">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <Badge className="mb-4 bg-white/20 text-white" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Prospect Directory
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">All North Carolina Prospects</h1>
            <p className="text-lg md:text-xl text-white/90">
              View every NC United athlete in one place – ranked prospects plus the extended college recruiting pool,
              with filters for class year, gender, division, and recruiting status.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 space-y-10">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Prospects</p>
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

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="rounded-lg border bg-card p-4 shadow-sm md:max-w-xl">
            <p className="text-sm text-muted-foreground">
              Showing North Carolina prospects across all classes. Apply filters to refine the list, or switch layouts
              for a quick card-style scan.
            </p>
          </div>
          <div className="inline-flex items-center rounded-md border bg-background p-1 shadow-sm self-start md:self-center">
            <Button
              type="button"
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
              Table
            </Button>
            <Button
              type="button"
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[#03154C]">Prospect Filters</h2>
              <p className="text-sm text-muted-foreground">
                Narrow the list by class year, recruiting status, division, club, or search by name/school.
              </p>
            </div>
            <Button variant="outline" onClick={resetFilters} className="self-start lg:self-center">
              Reset Filters
            </Button>
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
                  <SelectItem value="all">All Years</SelectItem>
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
                  <SelectItem value="all">All Prospects</SelectItem>
                  <SelectItem value="ranked">Ranked</SelectItem>
                  <SelectItem value="unranked">Unranked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">Achievement Level</label>
              {achievementFilters.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setAchievementFilters([])}
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {[
                { value: "all-american", label: "All-American", emoji: "🏆" },
                { value: "state-champion", label: "State Champion", emoji: "🥇" },
                { value: "state-placer", label: "State Placer", emoji: "🎖️" },
                { value: "state-qualifier", label: "State Qualifier", emoji: "✅" },
                { value: "dnq", label: "DNQ", emoji: "—" },
              ].map((achievement) => {
                const isChecked = achievementFilters.includes(achievement.value)
                return (
                  <label
                    key={achievement.value}
                    className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium shadow-sm transition hover:border-[#D3B574] hover:text-[#03154C] cursor-pointer"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        setAchievementFilters((prev) =>
                          checked ? [...prev, achievement.value] : prev.filter((a) => a !== achievement.value),
                        )
                      }}
                    />
                    <span>
                      {achievement.emoji} {achievement.label}
                    </span>
                  </label>
                )
              })}
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

        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h3 className="text-xl font-semibold text-[#03154C]">Prospect Directory</h3>
              <p className="text-sm text-muted-foreground">
                Ranked prospects are surfaced first, followed by the extended North Carolina talent pool.
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-nc-navy-950 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">School</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Weight</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Achievement</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedProspects.map((prospect) => {
                    const achievement = calculateHighestAchievement(prospect)
                    const achievementBadge = {
                      "all-american": { text: "All-American", emoji: "🏆", color: "text-yellow-600" },
                      "state-champion": { text: "State Champion", emoji: "🥇", color: "text-yellow-500" },
                      "state-placer": { text: "State Placer", emoji: "🎖️", color: "text-orange-500" },
                      "state-qualifier": { text: "State Qualifier", emoji: "✅", color: "text-green-600" },
                      "dnq": { text: "—", emoji: "", color: "text-muted-foreground" },
                    }[achievement] || { text: "—", emoji: "", color: "text-muted-foreground" }

                    return (
                      <tr key={prospect.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-nc-navy-950">{prospect.name}</div>
                          {prospect.prospect_ranking && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              #{prospect.prospect_ranking}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{prospect.highschool || "—"}</td>
                        <td className="px-4 py-3 text-sm">
                          {prospect.weightclass || prospect.weight || "—"}
                        </td>
                        <td className={`px-4 py-3 text-sm ${achievementBadge.color}`}>
                          {achievementBadge.emoji} {achievementBadge.text}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/athletes/${prospect.id}`}
                            className="inline-flex items-center gap-1 text-sm text-nc-navy-950 hover:text-nc-red-800"
                          >
                            View
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {sortedProspects.map((prospect) => {
                const achievement = calculateHighestAchievement(prospect)
                const achievementBadge = {
                  "all-american": { text: "All-American", emoji: "🏆" },
                  "state-champion": { text: "State Champion", emoji: "🥇" },
                  "state-placer": { text: "State Placer", emoji: "🎖️" },
                  "state-qualifier": { text: "State Qualifier", emoji: "✅" },
                  "dnq": { text: "—", emoji: "" },
                }[achievement] || { text: "—", emoji: "" }

                return (
                  <Link
                    key={prospect.id}
                    href={`/athletes/${prospect.id}`}
                    className="block rounded-lg border bg-card p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-nc-navy-950">{prospect.name}</h4>
                        <p className="text-sm text-muted-foreground">{prospect.highschool || "—"}</p>
                        {prospect.prospect_ranking && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            #{prospect.prospect_ranking}
                          </Badge>
                        )}
                      </div>
                      {prospect.photourl && (
                        <img
                          src={prospect.photourl || "/placeholder.svg"}
                          alt={prospect.name}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {prospect.weightclass || prospect.weight || "—"}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span>
                        {achievementBadge.emoji} {achievementBadge.text}
                      </span>
                    </div>
                  </Link>
                )
              })}
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

function getOrdinalSuffix(num: number): string {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) return `${num}st`
  if (j === 2 && k !== 12) return `${num}nd`
  if (j === 3 && k !== 13) return `${num}rd`
  return `${num}th`
}

function buildLegacyTournamentEntry(
  label: string,
  placement?: string | number | null,
  record?: string | null,
  year?: number,
): TournamentResult | null {
  if (!placement && !record) return null
  
  const parts = []
  if (placement) {
    const placementNum = parsePlacement(placement)
    if (placementNum) {
      parts.push(getOrdinalSuffix(placementNum))
    }
  }
  if (record) parts.push(`Record: ${record}`)
  
  return {
    placement: parsePlacement(placement ?? null),
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

  const is2025SQ = STATE_QUALIFIERS_2025.some(
    (sq) =>
      sq.name.toLowerCase() === (prospect.name || "").toLowerCase() &&
      String(sq.year) === String(prospect.graduationyear),
  )

  if (is2025SQ) {
    return [
      {
        text: "2025 SQ",
        placement: null,
        year: 2025,
      },
    ]
  }

  if (!summary) return []

  return [
    {
      text: summary,
      placement: parsePlacement(summary),
      year: prospect.graduationyear ?? undefined,
    },
  ]
}
