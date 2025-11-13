"use client"

import { useEffect, useMemo, useState } from "react"

import { AuthGuard } from "@/components/auth-guard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RankingsTableView } from "@/components/rankings-table-view"
import { RankingsCardView } from "@/components/rankings-card-view"
import { Filter, LayoutGrid, List, Loader2, Search, Users } from "lucide-react"

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

  useEffect(() => {
    const fetchProspects = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch("/api/prospects?limit=1000", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        })

        if (!response.ok) {
          const text = await response.text().catch(() => "")
          throw new Error(
            `Prospects API ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`,
          )
        }

        const data = await response.json()
        const rawProspects = Array.isArray(data?.prospects) ? data.prospects : Array.isArray(data) ? data : null
        if (rawProspects) {
          const filtered = rawProspects
            .filter((prospect: Prospect) => Number(prospect.graduationyear) !== 2025)
            .filter(isNorthCarolinaProspect)
          setProspects(filtered)
        } else {
          throw new Error("Unexpected response shape from /api/prospects")
        }
      } catch (fetchError: any) {
        console.error("[prospects/all] Error fetching prospects:", fetchError)
        setError(fetchError?.message || "Unable to load prospects right now.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProspects()
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

      return true
    })
  }, [prospects, searchTerm, yearFilter, genderFilter, statusFilter, rankFilter, weightFilters])

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

  const tableAthletes = useMemo(() => {
    return sortedProspects.map((prospect, index) => {
      const weightValue =
        prospect.weightclass && prospect.weightclass.trim() !== ""
          ? prospect.weightclass
          : prospect.weight
            ? String(prospect.weight)
            : ""

      const hasRankedWin =
        !!prospect.nationally_ranked_wins &&
        (!["0", "none", "None"].includes(String(prospect.nationally_ranked_wins).trim()))

      const stateResults = coerceTournamentResults(
        prospect.state_results,
        buildLegacyStateResults(prospect),
      )

      const nhscaResults = coerceTournamentResults(
        prospect.nhsca_results,
        buildLegacyNHSCAResults(prospect),
      )

      const super32Results = coerceTournamentResults(
        prospect.super_32_results ?? prospect.super32_results,
        buildLegacySuper32Results(prospect),
      )

      return {
        id: prospect.id || `prospect-${index}`,
        name: prospect.name || "Unknown",
        highschool: prospect.highschool || "—",
        weight_display: weightValue || "-",
        nhsca_record_display:
          prospect.nhsca_record_display ||
          prospect.nhsca_2025_record ||
          prospect.nhsca_2024_record ||
          null,
        nhsca_results: nhscaResults,
        super_32_record_display:
          prospect.super_32_record_display ||
          prospect.super_32_2025_record ||
          prospect.super_32_2024_record ||
          null,
        super_32_results: super32Results,
        state_championship_summary:
          prospect.state_championship_summary ||
          stateResults?.[0]?.text ||
          prospect.achievements?.find((achievement) =>
            achievement.toLowerCase().includes("state"),
          ) ||
          "—",
        state_results: stateResults,
        has_ranked_win: hasRankedWin,
        academic_gpa: prospect.academic_gpa ?? null,
        prospect_ranking: prospect.prospect_ranking ?? 9999,
        photourl: prospect.photourl ?? undefined,
        nationally_ranked_wins: prospect.nationally_ranked_wins ?? undefined,
        college: prospect.college ?? undefined,
        recruiting_status: prospect.recruiting_status ?? undefined,
      }
    })
  }, [sortedProspects])

  const resetFilters = () => {
    setSearchTerm("")
    setYearFilter("all")
    setGenderFilter("all")
    setStatusFilter("all")
    setRankFilter("all")
    setWeightFilters([])
  }

  return (
    <AuthGuard>
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
              <div className="overflow-x-auto px-2 pb-6">
                <RankingsTableView
                  athletes={tableAthletes}
                  hideRankColumn={true}
                  showRankColumn={false}
                  additionalDividerLabel="Additional North Carolina Prospects"
                  dividerAfterRank={sortedProspects.length + 1}
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
    </AuthGuard>
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
  const parts = []
  if (placement) parts.push(String(placement))
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

  if (!summary) return []

  return [
    {
      text: summary,
      placement: parsePlacement(summary),
      year: prospect.graduationyear ?? undefined,
    },
  ]
}

