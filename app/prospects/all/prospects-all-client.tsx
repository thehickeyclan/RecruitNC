"use client"

import { VIEW_GENDER_COOKIE, coachProgramOf, parseViewGender, viewGenderFor } from "@/lib/recruiting/coach-program"
import { usesRecruitingShell, visibleStates } from "@/lib/recruiting/brand"
import { HOME_STATE } from "@/lib/recruiting/states"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { yearFilterToApiParams } from "@/lib/prospects-directory"
import { currentClassYears } from "@/lib/class-years"
import { highestAchievement, type AchievementFacts } from "@/lib/prospect-achievements"
import { useCoachMode } from "@/hooks/use-coach-mode"
import { useAuth } from "@/contexts/auth-context"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RankingsTableView } from "@/components/rankings-table-view"
import { RankingsCardView } from "@/components/rankings-card-view"
import { Filter, LayoutGrid, List, Loader2, Search, Users, X, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
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
  nhsca_2026_placement?: string | null
  nhsca_2026_record?: string | null
  nhsca_2024_placement?: string | null
  nhsca_2025_placement?: string | null
  nhsca_2023_placement?: string | null
  nhsca_2024_record?: string | null
  nhsca_2025_record?: string | null
  nhsca_2023_record?: string | null
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

/** Resolved once at module load; the page is client-rendered per visit. */
const CURRENT_CLASS_YEARS = currentClassYears()
/*
 * Written out from the classes actually in high school, never typed.
 *
 * These three labels read "Active (2026–2029)" while the filter beneath them selected 2027–2030,
 * so the control said one thing and did another — and the class of 2026 it named had graduated in
 * June. A label with a year in it goes stale every summer unless it is derived.
 */
const ACTIVE_YEARS_LABEL = `Active (${CURRENT_CLASS_YEARS[0]}–${CURRENT_CLASS_YEARS[CURRENT_CLASS_YEARS.length - 1]})`
const GRADUATES_LABEL = `Graduates (${CURRENT_CLASS_YEARS[0]! - 1} and earlier)`

type SortChoice = "rank" | "name" | "weight" | "year" | "school"

function QuickGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-white/45">{label}</span>
      {/* One line per group on a phone, scrolling sideways, so the filters do not push the list a screen down. */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 sm:flex-wrap sm:overflow-visible">{children}</div>
    </div>
  )
}

type HonorPill = "all-american" | "state-champion" | "state-placer"
const HONOR_PILLS: ReadonlyArray<readonly [HonorPill, string]> = [
  ["all-american", "All-American"],
  ["state-champion", "State champ"],
  ["state-placer", "State placer"],
]

/** From the honours the server attaches to each row (lib/prospect-achievements.ts). */
function hasHonor(prospect: Prospect, honor: HonorPill): boolean {
  const facts = ((prospect as { achievement_facts?: AchievementFacts }).achievement_facts ?? {}) as AchievementFacts
  const state = Number(facts.bestStatePlace)
  if (honor === "state-champion") return state === 1
  // Placed 1st to 6th at states, the champion included: lib/prospect-achievements.ts places 2-6 and
  // counts 7th and below as qualifying.
  if (honor === "state-placer") return Number.isFinite(state) && state >= 1 && state <= 6
  const nhsca = Number(facts.bestNhscaPlace)
  const s32 = Number(facts.bestSuper32Place)
  return (Number.isFinite(nhsca) && nhsca >= 1 && nhsca <= 8) || (Number.isFinite(s32) && s32 >= 1 && s32 <= 8)
}

/** The state a wrestler competes in. Rows without one are North Carolina's: the directory holds no one else yet. */
/**
 * The weight he last competed at (the server sends it beside last_competed); the listed weight
 * only when no result records one. The listed weight goes stale and nobody corrects it, and an
 * out-of-state profile has none at all.
 */
function lastWeight(prospect: Prospect): string | null {
  const w = (prospect as { last_competed_weight?: string | null }).last_competed_weight
  return w && String(w).trim() ? String(w).trim() : null
}

function stateOfProspect(prospect: Prospect): string {
  const raw = String((prospect as { state?: string | null }).state ?? "").trim().toUpperCase()
  if (raw === "NORTH CAROLINA") return "NC"
  return raw || "NC"
}

function QuickChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors ${
        active ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/20 text-white/75 hover:border-white/40 hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}

export default function ProspectsAllClient({
  initialProspects = [],
}: {
  initialProspects?: Prospect[]
}) {
  /*
   * The rank column is the product.
   *
   * It was printed for anybody who opened the directory, which is the whole board in one table —
   * a faster way to read the rankings than the rankings page. Gated to the people it is for:
   * NC United Blue members, verified college coaches and admins. Everyone else sees the
   * directory without the numbers, which is still a useful page.
   */
  const { profile: viewerProfile, user: viewerUser } = useAuth()
  const { actsAsCoach } = useCoachMode()
  /*
   * The ranks are not in the rows. The rows are public and cached; the server sends the ranks
   * separately, and only to an admin, a verified college coach, a Blue family or a subscriber
   * (/api/prospects/ranks). Null means this viewer was not sent any - whether or not the page
   * could have guessed otherwise.
   */
  const [ranks, setRanks] = useState<Record<string, number> | null>(null)
  const viewerId = viewerProfile?.user_id ?? null
  useEffect(() => {
    let cancelled = false
    if (!viewerId) {
      setRanks(null)
      return
    }
    fetch("/api/prospects/ranks", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ranks?: Record<string, number> } | null) => {
        if (!cancelled) setRanks(d?.ranks ?? null)
      })
      .catch(() => {
        // A failed lookup leaves the column hidden, which is the safe way to be wrong.
        if (!cancelled) setRanks(null)
      })
    return () => {
      cancelled = true
    }
  }, [viewerId])
  const maySeeRanking = ranks != null

  const [prospects, setProspects] = useState<Prospect[]>(initialProspects)
  const [isLoading, setIsLoading] = useState(initialProspects.length === 0)
  const skipInitialActiveFetch = useRef(initialProspects.length > 0)
  const [error, setError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<"table" | "cards">("table")
  const [showFilters, setShowFilters] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [yearFilter, setYearFilter] = useState<string>("active")
  const [genderFilter, setGenderFilter] = useState<string>("all")
  /*
   * Where the gender filter starts (Matt, 13 October 2026). A link can ask for one side
   * (?gender=female, from a women's coach's home). Otherwise a college coach starts on their own
   * program's side - a women's coach was handed every boy in the state first - and families start
   * on everyone, as before. Set once; after that the filter is the reader's.
   */
  const genderDefaulted = useRef(false)
  useEffect(() => {
    if (genderDefaulted.current) return
    const asked = parseViewGender(new URLSearchParams(window.location.search).get("gender"))
    if (asked) {
      genderDefaulted.current = true
      setGenderFilter(asked === "Female" ? "female" : "male")
      return
    }
    if (!viewerProfile) return
    genderDefaulted.current = true
    if (!usesRecruitingShell(viewerProfile)) return
    const cookie = document.cookie.match(new RegExp(`(?:^|; )${VIEW_GENDER_COOKIE}=([^;]+)`))?.[1]
    const program = coachProgramOf(viewerUser)
    // Never asked and never switched: leave a coach who predates the question on everyone.
    if (!program && !cookie) return
    setGenderFilter(viewGenderFor(program, cookie) === "Female" ? "female" : "male")
  }, [viewerProfile, viewerUser])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [rankFilter, setRankFilter] = useState<"all" | "ranked" | "unranked">("all")
  /**
   * How the list is ordered. Unset until someone chooses: a coach then gets ranked-first (only 75
   * of ~575 carry a rank, and A-Z opened on a screen of dashes), everyone else A-Z.
   */
  // Coach Home's "see them all" arrives with ?show=uncommitted, so the list opens on what it promised.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("show") === "uncommitted") setStatusFilter("uncommitted")
  }, [])
  const [sortChoice, setSortChoice] = useState<SortChoice | null>(null)
  const sortBy: SortChoice = sortChoice ?? (actsAsCoach ? "rank" : "name")
  const [weightFilters, setWeightFilters] = useState<string[]>([])
  const [achievementFilters, setAchievementFilters] = useState<AchievementLevel[]>([])
  const [honorFilters, setHonorFilters] = useState<HonorPill[]>([])
  /*
   * One state's wrestlers at a time, North Carolina first: each state is its own list (and its
   * own brand to families). Choosing another state loads it from the server.
   */
  const [stateFilter, setStateFilter] = useState<string>(HOME_STATE)
  const stateChoices = visibleStates(viewerProfile?.is_admin === true || viewerProfile?.role === "admin")

  useEffect(() => {
    if (skipInitialActiveFetch.current && yearFilter === "active") {
      skipInitialActiveFetch.current = false
      return
    }

    const run = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const PAGE = 500
        const rawProspects: Prospect[] = []
        let offset = 0
        const yearParams = yearFilterToApiParams(yearFilter)

        const fetchChunk = async (chunkOffset: number) => {
          const params = new URLSearchParams({
            limit: String(PAGE),
            offset: String(chunkOffset),
          })
          if (yearParams.graduationYear) params.set("graduationYear", yearParams.graduationYear)
          if (yearParams.minYear != null) params.set("minYear", String(yearParams.minYear))
          if (yearParams.maxYear != null) params.set("maxYear", String(yearParams.maxYear))
          if (stateFilter !== HOME_STATE) params.set("state", stateFilter)

          const url = `/api/prospects?${params.toString()}`
          const maxAttempts = 3
          let lastText = ""
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const prospectsResponse = await fetch(url, {
              method: "GET",
              headers: { Accept: "application/json" },
            })
            if (prospectsResponse.ok) {
              return prospectsResponse
            }
            lastText = await prospectsResponse.text().catch(() => "")
            const retryable = prospectsResponse.status >= 500 || prospectsResponse.status === 429
            if (!retryable || attempt === maxAttempts) {
              throw new Error(
                `Athlete profiles API ${prospectsResponse.status} ${prospectsResponse.statusText}${lastText ? ` - ${lastText}` : ""}`,
              )
            }
            await new Promise((r) => setTimeout(r, 400 * attempt))
          }
          throw new Error(lastText || "Athlete profiles API failed after retries")
        }

        for (;;) {
          const prospectsResponse = await fetchChunk(offset)
          const prospectsPayload = await prospectsResponse.json()
          const batch = Array.isArray(prospectsPayload?.prospects)
            ? prospectsPayload.prospects
            : Array.isArray(prospectsPayload)
              ? prospectsPayload
              : []

          rawProspects.push(...batch)
          const hasMore = prospectsPayload?.pagination?.hasMore ?? batch.length >= PAGE
          if (!hasMore) break
          offset += PAGE
          if (offset > 20000) break
        }

        setProspects(rawProspects)
      } catch (fetchError: any) {
        console.error("[prospects/all] Error loading athlete profiles:", fetchError)
        setError(fetchError?.message || "Unable to load athlete profiles right now.")
      } finally {
        setIsLoading(false)
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter, stateFilter])

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    for (const prospect of prospects) {
      /** Offer only classes still in high school; a graduated year is no longer a useful filter. */
      if (prospect.graduationyear && CURRENT_CLASS_YEARS.includes(prospect.graduationyear)) {
        years.add(prospect.graduationyear)
      }
    }
    return Array.from(years).sort((a, b) => a - b)
  }, [prospects])

  const availableWeightClasses = useMemo(() => {
    const weights = new Set<string>()
    prospects.forEach((prospect) => {
      const raw =
        lastWeight(prospect) ??
        (prospect as any).weightclass ??
        (prospect as any).weight_class ??
        prospect.weight?.toString() ??
        ""
      const weight = String(raw).trim()
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
    /*
     * Prefer what the server worked out from the real tables.
     *
     * Everything below reads JSON on the athlete row, and one of the three columns it reaches
     * for — `state_results` — does not exist, so every state check compared against undefined.
     * Filtering by "State Champion" found two wrestlers in the whole directory. It is 37.
     * The old path stays as a fallback for any row that arrives without the server's answer.
     */
    const served = (prospect as unknown as { achievement_facts?: AchievementFacts }).achievement_facts
    if (served && Object.keys(served).length > 0) return highestAchievement(served)

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
    const rank = ranks?.[String(prospect.id)]
    return typeof rank === "number" && Number.isFinite(rank) ? rank : NaN
  }

  const filteredProspects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return prospects.filter((prospect) => {
      if (term) {
        const name = prospect.name ?? ""
        const highschool = (prospect as any).highschool ?? (prospect as any).highSchool ?? ""
        const club = (prospect as any).wrestlingClub ?? (prospect as any).wrestlingclub ?? ""
        const college = prospect.college ?? ""
        const matchesTerm =
          name.toLowerCase().includes(term) ||
          String(highschool).toLowerCase().includes(term) ||
          String(club).toLowerCase().includes(term) ||
          String(college).toLowerCase().includes(term)
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
        const hasCollege = !!(prospect.college && String(prospect.college).trim() !== "")
        if (statusFilter === "committed") {
          if (summarized !== "committed" || !hasCollege) return false
        }
        if (statusFilter === "uncommitted") {
          if (summarized === "committed" && hasCollege) return false
        }
        if (statusFilter === "verbal" && summarized !== "verbal") return false
      }

      if (rankFilter === "ranked" || rankFilter === "unranked") {
        const gradYear = prospect.graduationyear
        const rawRank = getRawRank(prospect)
        /*
         * The published depth of each class, from the one place that knows it - the same rule the
         * rank column prints from. This used to carry its own typed cut-offs (25 for 2028, 20 for
         * 2029), so "Ranked" hid #26-30 of a class the column showed thirty of, and would have
         * counted five 2029s the column leaves blank.
         */
        const classYear = gradYear == null ? null : Number(gradYear)
        const maxRank = isPublicRankingsYearPublished(classYear, prospect.gender) ? getPublicRankingsMax(classYear, prospect.gender) : 0
        const hasOfficialRank =
          Number.isFinite(rawRank) && rawRank >= 1 && rawRank <= maxRank
        if (rankFilter === "ranked" && !hasOfficialRank) return false
        if (rankFilter === "unranked" && hasOfficialRank) return false
      }

      if (weightFilters.length > 0) {
        const rawWeight =
          lastWeight(prospect) ??
          (prospect as any).weightclass ??
          (prospect as any).weight_class ??
          prospect.weight?.toString() ??
          ""
        const normalizedWeight = String(rawWeight)
          .replace(/\s*l?bs?\.?$/i, "")
          .trim()
        if (!normalizedWeight || !weightFilters.includes(normalizedWeight)) return false
      }

      if (achievementFilters.length > 0) {
        const achievement = getHighestAchievement(prospect)
        if (!achievementFilters.includes(achievement.level)) return false
      }

      if (honorFilters.length > 0 && !honorFilters.some((h) => hasHonor(prospect, h))) return false

      if (stateFilter !== HOME_STATE && stateOfProspect(prospect) !== stateFilter) return false

      return true
    })
  }, [prospects, searchTerm, yearFilter, genderFilter, statusFilter, rankFilter, weightFilters, achievementFilters, honorFilters, stateFilter, ranks])

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
      const weightValue = lastWeight(prospect) ??
        (prospect.weightclass && prospect.weightclass.trim() !== ""
          ? prospect.weightclass
          : prospect.weight
            ? String(prospect.weight)
            : "")

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

      // Only show rank for athletes on our official published rankings; show "G" for graduated (2025 and earlier)
      const gradYear = prospect.graduationyear
      const isRankedClass = isPublicRankingsYearPublished(gradYear, prospect.gender)
      const rawRank = getRawRank(prospect)
      const maxRankForClass = isRankedClass ? getPublicRankingsMax(gradYear, prospect.gender) : 0
      const hasOfficialRank =
        Number.isFinite(rawRank) && rawRank >= 1 && rawRank <= maxRankForClass
      const prospectRanking = maySeeRanking && isRankedClass && hasOfficialRank ? rawRank : null
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
        /*
         * Carried through for the table's own columns and gates.
         *
         * `gender` is not decoration here: the scouting-report link is hidden for female
         * wrestlers, whose national results are too thinly imported for a report to be fair,
         * and a row that arrives without it would be read as "not female" and offered one.
         */
        gender: (prospect as { gender?: string | null }).gender ?? null,
        graduationyear: prospect.graduationyear ?? null,
        last_competed: (prospect as { last_competed?: string | null }).last_competed ?? null,
      }
    })

    return mapped
    /*
     * `maySeeRanking` belongs here. Who is looking arrives a moment after the rows do, so the
     * first pass runs with it false and blanks every rank; without it in this list the rows were
     * never rebuilt when it turned true, and the Rank column stayed empty for a coach until he
     * happened to touch a filter.
     */
  }, [sortedProspects, maySeeRanking, ranks])

  /** The same order for the table and the cards; the table's own header clicks still re-sort it. */
  const orderedAthletes = useMemo(() => {
    const value = (a: (typeof tableAthletes)[number]): string | number => {
      switch (sortBy) {
        case "rank":
          return a.prospect_ranking ?? Number.POSITIVE_INFINITY
        case "weight":
          return Number.parseInt(String(a.weight_display)) || 999
        case "year":
          return a.graduation_year ?? 9999
        case "school":
          return (a.highschool || "~").toLowerCase()
        default:
          return a.name.toLowerCase()
      }
    }
    return [...tableAthletes].sort((a, b) => {
      const x = value(a)
      const y = value(b)
      return x < y ? -1 : x > y ? 1 : a.name.localeCompare(b.name)
    })
  }, [tableAthletes, sortBy])

  const resetFilters = () => {
    setSearchTerm("")
    setYearFilter("active")
    setGenderFilter("all")
    setStatusFilter("all")
    setRankFilter("all")
    setWeightFilters([])
    setAchievementFilters([])
    setHonorFilters([])
    setStateFilter(HOME_STATE)
  }

  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm.trim() !== "" ||
      (yearFilter !== "all" && yearFilter !== "active") ||
      genderFilter !== "all" ||
      statusFilter !== "all" ||
      rankFilter !== "all" ||
      weightFilters.length > 0 ||
      achievementFilters.length > 0 ||
      honorFilters.length > 0 ||
      stateFilter !== HOME_STATE
    )
  }, [searchTerm, yearFilter, genderFilter, statusFilter, rankFilter, weightFilters, achievementFilters, honorFilters, stateFilter])

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
                Please check back soon or visit the <a href="/public-rankings" className="text-[#B31B1B] hover:underline">rankings pages</a> for prospect information.
              </p>
              <div className="flex gap-4 justify-center">
                <a href="/">
                  <Button variant="outline">Return to Home</Button>
                </a>
                <a href="/public-rankings">
                  <Button className="bg-[#B31B1B] hover:bg-[#8B1515] text-white">View Rankings</Button>
                </a>
              </div>
            </div>
          </div>
        </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0A1628]">
      {actsAsCoach ? (
        /* A coach is here to find wrestlers; "claim your profile" is the family's page. */
        <section className="container mx-auto px-4 pt-8">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Athletes</h1>
          <p className="mt-1 text-sm text-white/60">Every wrestler in the current classes. Filter by men or women and class, and sort by rank or weight.</p>
        </section>
      ) : (
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <Image
            src="/hero-banner-nchsaa-2026-arena.png"
            alt="NCHSAA Wrestling Championship arena"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/95 via-[#0A1628]/85 to-[#0A1628]/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-transparent to-transparent" />
        </div>
        <div className="container relative mx-auto px-4 py-12 md:py-16">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#D3B574] transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-xl bg-[#D3B574]/10 p-3 backdrop-blur-sm">
              <Users className="h-8 w-8 text-[#D3B574]" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">Athlete Profiles</h1>
          </div>
          <p className="text-white/70 text-lg max-w-2xl leading-relaxed mb-8">
            {stateFilter === HOME_STATE
              ? "All NC wrestlers — browse by name, school, class year, and commitment status. Create your profile and we pull in NCHSAA, NHSCA, and Super 32 results."
              : `${stateChoices.find((st) => st.code === stateFilter)?.name ?? stateFilter} state placers — browse by name, school, class year, and commitment status.`}
          </p>
          {/* Side by side, and the same page: most NC wrestlers are already here from their results
              (Matt, 8 Oct 2026), so /create-profile looks for the existing profile first and offers
              to claim it, whichever button brought the family there. */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/create-profile">
              <Button size="lg" className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] font-bold">
                Claim your profile
              </Button>
            </Link>
            <Link href="/create-profile">
              <Button
                size="lg"
                variant="outline"
                className="border-[#D3B574] bg-transparent font-bold text-[#D3B574] hover:bg-[#D3B574] hover:text-[#0A1628]"
              >
                Create your profile
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-sm text-white/50">We may already have yours. Either way, we look it up first.</p>
        </div>
      </section>
      )}

      <section className="container mx-auto px-4 py-10 space-y-10">

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-[#0f1c2e] p-6">
              <p className="text-sm font-medium text-white/40 mb-1">Total Athletes</p>
              <p className="text-3xl font-bold text-white">{sortedProspects.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0f1c2e] p-6">
              <p className="text-sm font-medium text-white/40 mb-1">Committed</p>
              <p className="text-3xl font-bold text-green-400">{committedCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0f1c2e] p-6">
              <p className="text-sm font-medium text-white/40 mb-1">Uncommitted</p>
              <p className="text-3xl font-bold text-[#BC0B03]">{uncommittedCount}</p>
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
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#D3B574]"
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

          {/* The filters people reach for most, always on the page; weights and achievements stay under Filters. */}
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
            <QuickGroup label="Wrestling">
              {([
                ["all", "All"],
                ["male", "Men"],
                ["female", "Women"],
              ] as const).map(([value, label]) => (
                <QuickChip key={value} active={genderFilter === value} onClick={() => setGenderFilter(value)}>
                  {label}
                </QuickChip>
              ))}
            </QuickGroup>
            <QuickGroup label="Class">
              <QuickChip active={yearFilter === "active"} onClick={() => setYearFilter("active")}>
                All current
              </QuickChip>
              {currentClassYears().map((year) => (
                <QuickChip key={year} active={yearFilter === String(year)} onClick={() => setYearFilter(String(year))}>
                  {year}
                </QuickChip>
              ))}
            </QuickGroup>
            {/* The three honours a coach filters by, as pills (Matt, 14 October 2026). A pill keeps
                everyone who has that honour, so a state champion who is also an All-American is in both. */}
            <QuickGroup label="Honors">
              {HONOR_PILLS.map(([value, label]) => (
                <QuickChip key={value} active={honorFilters.includes(value)} onClick={() => setHonorFilters((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))}>
                  {label}
                </QuickChip>
              ))}
            </QuickGroup>
            {/* Two rows on a wide screen: who (wrestling, class, honours), then how (state, show, sort). */}
            <div className="hidden basis-full lg:block" aria-hidden />
            {stateChoices.length > 1 ? (
              <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/45">
                State
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="min-h-[36px] rounded-lg border border-white/20 bg-[#0A1628] px-3 text-sm font-semibold normal-case tracking-normal text-white focus:border-[#D3B574] focus:outline-none"
                >
                  {stateChoices.map((st) => (
                    <option key={st.code} value={st.code}>
                      Recruit{st.code} · {st.name}
                      {st.live ? "" : " (staff only)"}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <QuickGroup label="Show">
              {maySeeRanking ? (
                <QuickChip active={rankFilter === "ranked"} onClick={() => setRankFilter(rankFilter === "ranked" ? "all" : "ranked")}>
                  Ranked only
                </QuickChip>
              ) : null}
              <QuickChip active={statusFilter === "uncommitted"} onClick={() => setStatusFilter(statusFilter === "uncommitted" ? "all" : "uncommitted")}>
                Uncommitted only
              </QuickChip>
            </QuickGroup>
            <label className="flex w-full flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/45 sm:ml-auto sm:w-auto">
              Sort by
              <select
                value={sortBy}
                onChange={(e) => setSortChoice(e.target.value as SortChoice)}
                className="min-h-[36px] rounded-lg border border-white/20 bg-[#0A1628] px-3 text-sm font-semibold normal-case tracking-normal text-white focus:border-[#D3B574] focus:outline-none"
              >
                {maySeeRanking ? <option value="rank">Rank</option> : null}
                <option value="name">Name (A to Z)</option>
                <option value="weight">Weight (light to heavy)</option>
                <option value="year">Class (seniors first)</option>
                <option value="school">High school</option>
              </select>
            </label>
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
                  {GRADUATES_LABEL}
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
                  {ACTIVE_YEARS_LABEL}
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
                  {statusFilter === "committed"
                    ? "Committed"
                    : statusFilter === "verbal"
                      ? "Verbal Commit"
                      : statusFilter === "uncommitted"
                        ? "Uncommitted"
                        : statusFilter}
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


          <div className="rounded-xl border border-white/10 bg-[#0f1c2e] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Athlete Profiles</h3>
                <p className="text-sm text-white/40">
                  Use the filters above to narrow the list; click a column heading to re-sort.
                </p>
              </div>
              <Badge variant="outline" className="gap-2 text-sm border-white/20 text-white/70">
                <Filter className="h-4 w-4" />
                {sortedProspects.length} Showing
              </Badge>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#D3B574]" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
                <p className="text-lg font-semibold text-red-400">We couldn&apos;t load the prospect list.</p>
                <p className="text-sm text-white/40 max-w-md">{error}</p>
                <Button onClick={() => window.location.reload()} className="bg-[#D3B574] text-[#0A1628]">
                  Try Again
                </Button>
              </div>
            ) : sortedProspects.length === 0 ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-16 text-center text-white/40">
                <Users className="h-10 w-10" />
                <p>No prospects matched your current filters.</p>
                <Button variant="outline" onClick={resetFilters}>
                  Clear Filters
                </Button>
              </div>
            ) : viewMode === "table" ? (
              <div className="overflow-x-auto px-2 pb-6">
                {/* The page is bg-[#0A1628]; the table defaults to light and was rendering a
                    white body under a navy header. */}
                {/* The key re-seats the table when the order is chosen above; its header clicks still sort. */}
                <RankingsTableView
                  key={sortBy}
                  athletes={orderedAthletes}
                  theme="dark"
                  hideRankColumn={false}
                  showRankColumn={true}
                  defaultSortField={sortBy}
                  defaultSortDirection="asc"
                  additionalDividerLabel=""
                  dividerAfterRank={0}
                />
              </div>
            ) : (
              <div className="px-2 pb-6">
                <RankingsCardView
                  athletes={orderedAthletes}
                  theme="dark"
                  loading={false}
                  showRankBadges={false}
                  showAdditionalDivider={false}
                />
              </div>
            )}
          </div>
        </section>
      </main>
  )
}

/** State field values we treat as clearly not NC (exact match after trim + lowerCase). */
const KNOWN_NON_NC_STATES = new Set([
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
])

const NON_NC_LOCATION_SUBSTRINGS = [
  "south carolina",
  "georgia",
  "virginia",
  "tennessee",
  "florida",
  "ohio",
  "pennsylvania",
  "new york",
  "texas",
  "california",
  "alabama",
  "sc",
  "ga",
  "va",
  "tn",
  "fl",
  "oh",
  "pa",
  "ny",
  "tx",
  "ca",
  "al",
] as const

function isNorthCarolinaProspect(prospect: Prospect) {
  const state = (prospect.state || "").trim().toLowerCase()
  if (state) {
    if (state === "nc" || state === "north carolina") return true
    if (KNOWN_NON_NC_STATES.has(state)) return false
    // Unknown state text (typo, "USA", bad import): do not hide the whole directory.
    return true
  }

  const location = (prospect.location || "").trim().toLowerCase()
  if (location) {
    if (/\bnorth carolina\b/.test(location) || /\bnc\b/.test(location.replace(/[.,]/g, " "))) {
      return true
    }

    if (NON_NC_LOCATION_SUBSTRINGS.some((stateToken) => location.includes(stateToken))) {
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

  const entry2026 = buildLegacyTournamentEntry(
    "NHSCA Nationals 2026",
    prospect.nhsca_2026_placement,
    prospect.nhsca_2026_record,
    2026,
  )
  if (entry2026) results.push(entry2026)

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

  const entry2023 = buildLegacyTournamentEntry(
    "NHSCA Nationals 2023",
    prospect.nhsca_2023_placement,
    prospect.nhsca_2023_record,
    2023,
  )
  if (entry2023) results.push(entry2023)

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
