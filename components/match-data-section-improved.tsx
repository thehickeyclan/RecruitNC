"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { profileMatchDataCardClass, PROFILE_TABLE_WIDTH_CONSTRAINT_CLASS } from "@/lib/profile-table-scroll"
import { ProfileScrollTable } from "@/components/profile-scroll-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart3, ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface IndividualMatch {
  date?: string
  weight?: string | number
  opponent_name?: string
  opponent?: string
  opponent_school?: string
  school?: string
  result?: string
  method?: string
  tournament?: string
  venue?: string
  win_loss?: string
}

interface SeasonData {
  season: string
  grade: string
  year?: string | number
  total_matches: number
  wins: number
  losses: number
  pins: number
  tech_falls: number
  decisions: number
  major_decisions: number
  forfeits_won: number
  win_percentage: number
  matches: IndividualMatch[]
  high_school?: string
  seasonKey?: string
}

interface MatchDataSectionImprovedProps {
  athleteId: string
  athleteName: string
  graduationYear?: number
  theme?: "light" | "dark"
  /** Mobile: collapsed by default with recruiter-first label. */
  collapseOnMobile?: boolean
}

const IS_DEV = process.env.NODE_ENV !== "production"

// Minimal dev-only mock seasons for preview when API can't reach the DB
const DEV_MOCK_SEASONS: SeasonData[] = [
  {
    season: "2024-25",
    grade: "Senior",
    year: "2024-25",
    total_matches: 35,
    wins: 28,
    losses: 7,
    pins: 12,
    tech_falls: 5,
    decisions: 8,
    major_decisions: 3,
    forfeits_won: 0,
    win_percentage: 80,
    matches: [
      {
        date: "2024-12-05",
        weight: 150,
        opponent: "A. Rivera",
        opponent_school: "Central",
        win_loss: "W",
        method: "Dec 6-4",
        tournament: "Dual Meet",
      },
      {
        date: "2024-12-12",
        weight: 150,
        opponent: "B. Kim",
        opponent_school: "Ridgeview",
        win_loss: "L",
        method: "MD 4-12",
        tournament: "Dual Meet",
      },
    ],
    high_school: "Sample HS",
    seasonKey: "senior-2024-25",
  },
  {
    season: "2023-24",
    grade: "Junior",
    year: "2023-24",
    total_matches: 32,
    wins: 26,
    losses: 6,
    pins: 10,
    tech_falls: 4,
    decisions: 9,
    major_decisions: 3,
    forfeits_won: 1,
    win_percentage: 81.25,
    matches: [
      {
        date: "2024-01-10",
        weight: 144,
        opponent: "C. Diaz",
        opponent_school: "North",
        win_loss: "W",
        method: "Fall 3:21",
        tournament: "Invite",
      },
    ],
    high_school: "Sample HS",
    seasonKey: "junior-2023-24",
  },
]

function normalizeGradeLabel(input?: string | number): string | undefined {
  if (input === undefined || input === null) return undefined
  const s = String(input).toLowerCase().trim()

  // Handle numeric grades
  if (/^9$|^9th$/.test(s)) return "Freshman"
  if (/^10$|^10th$/.test(s)) return "Sophomore"
  if (/^11$|^11th$/.test(s)) return "Junior"
  if (/^12$|^12th$/.test(s)) return "Senior"

  // Common abbreviations and variants
  if (/(^|\b)(fr|frosh|fresh|freshman)(\b|$)/.test(s)) return "Freshman"
  if (/(^|\b)(so|soph|sophomore)(\b|$)/.test(s)) return "Sophomore"
  if (/(^|\b)(jr|jun|junior)(\b|$)/.test(s)) return "Junior"
  if (/(^|\b)(sr|sen|senior)(\b|$)/.test(s)) return "Senior"

  return undefined
}

const gradeFromIndex = (idx: number): string | undefined => {
  // 0 -> Senior, 1 -> Junior, 2 -> Sophomore, 3 -> Freshman
  switch (idx) {
    case 0:
      return "Senior"
    case 1:
      return "Junior"
    case 2:
      return "Sophomore"
    case 3:
      return "Freshman"
    default:
      return undefined
  }
}

/**
 * Parse season strings like "2024-25" or "2023-24" into a sortable value.
 * Falls back to created order if parsing fails.
 */
function seasonSortValue(season?: string): number {
  if (!season) return Number.NEGATIVE_INFINITY
  // Expect formats like "2024-25" or "2021–22"
  const match = season.match(/(\d{4})/)
  if (match) {
    return Number.parseInt(match[1], 10)
  }
  return Number.NEGATIVE_INFINITY
}

/**
 * Normalize and dedupe seasons by seasonKey (grade-season), keeping the record with the highest total_matches.
 * Then sort DESC by season (latest first). If tie or missing, sort by grade as a secondary key.
 */
function normalizeSeasons(rows: SeasonData[]): SeasonData[] {
  const byKey = new Map<string, SeasonData>()
  for (const s of rows) {
    const key =
      (s.seasonKey && s.seasonKey.trim().toLowerCase()) ||
      `${(s.grade || "").toLowerCase().trim()}-${String(s.season || "").trim()}`
    const existing = byKey.get(key)
    if (!existing || (s.total_matches || 0) > (existing.total_matches || 0)) {
      byKey.set(key, { ...s, seasonKey: key })
    }
  }

  const gradeOrder: Record<string, number> = { senior: 1, junior: 2, sophomore: 3, freshman: 4 }
  return Array.from(byKey.values()).sort((a, b) => {
    const aSeason = seasonSortValue(a.season)
    const bSeason = seasonSortValue(b.season)
    if (aSeason !== bSeason) return bSeason - aSeason // latest first
    const ag = gradeOrder[(a.grade || "").toLowerCase()] || 99
    const bg = gradeOrder[(b.grade || "").toLowerCase()] || 99
    return ag - bg
  })
}

function parseStartYear(season?: string): number | undefined {
  if (!season) return undefined
  const m = season.match(/(\d{4})/)
  return m ? Number.parseInt(m[1], 10) : undefined
}

function gradeFromGradYear(seasonStart?: number, gradYear?: number): string | undefined {
  if (!seasonStart || !gradYear) return undefined

  console.log("[v0] Grade calculation - seasonStart:", seasonStart, "gradYear:", gradYear)

  // For season "2024-25", seasonStart is 2024
  // For class of 2027, they graduate in spring 2027
  // In 2024-25 academic year, they are a sophomore (2 years left after this year)
  const yearsUntilGraduation = gradYear - seasonStart
  console.log("[v0] Years until graduation:", yearsUntilGraduation)

  switch (yearsUntilGraduation) {
    case 1:
      return "Senior" // Graduates next spring
    case 2:
      return "Junior" // Graduates in 2 springs
    case 3:
      return "Sophomore" // Graduates in 3 springs
    case 4:
      return "Freshman" // Graduates in 4 springs
    default:
      console.log("[v0] No grade match for years until graduation:", yearsUntilGraduation)
      return undefined
  }
}

export function MatchDataSectionImproved({
  athleteId,
  athleteName,
  graduationYear,
  theme = "light",
  collapseOnMobile = false,
}: MatchDataSectionImprovedProps) {
  const isDark = theme === "dark"
  const [mobileOpen, setMobileOpen] = useState(false)
  const cardClass = profileMatchDataCardClass(isDark)
  const tableBorderClass = isDark ? "border-white/10" : undefined
  const headerClass = "bg-gradient-to-r from-[#13294B] to-[#1e3a5f] py-4"
  const contentClass = isDark ? "p-4 md:p-6 bg-[#0f1c2e] text-white/90" : "p-4 md:p-6"
  const sectionTitleClass = cn(
    "text-lg font-semibold mb-3",
    isDark ? "text-white" : "text-[#0D1A4D]",
  )
  const tableHeadRowClass = isDark ? "bg-white/5 hover:bg-white/5 border-white/10" : "bg-gray-50"
  const tableHeadCellClass = isDark ? "font-semibold text-white/70 whitespace-nowrap" : "font-semibold whitespace-nowrap"
  const tableRowClass = isDark
    ? "border-white/10 hover:bg-white/5 transition-colors"
    : "hover:bg-gray-50 transition-colors"
  const tableRowAltClass = (index: number) =>
    isDark
      ? cn(tableRowClass, index % 2 === 0 && "bg-white/[0.03]")
      : cn(tableRowClass, index % 2 === 0 && "bg-gray-50")
  const cellPrimaryClass = isDark ? "font-medium text-white whitespace-nowrap" : "font-medium text-gray-900 whitespace-nowrap"
  const cellMutedClass = isDark ? "text-white/70 capitalize whitespace-nowrap" : "text-gray-600 capitalize whitespace-nowrap"
  const cellOpponentClass = isDark ? "font-semibold text-white" : "font-semibold text-gray-900"
  const cellRecordClass = isDark ? "font-bold text-[#D3B574] whitespace-nowrap" : "font-bold text-[#B31B1B] whitespace-nowrap"
  const statTileClass = isDark
    ? "rounded-lg border border-white/10 bg-white/5 p-4 text-center"
    : "rounded-lg border border-gray-200 bg-gray-50 p-4 text-center"
  const statValueClass = isDark ? "text-2xl md:text-3xl font-bold text-white tabular-nums" : "text-2xl md:text-3xl font-bold text-[#0D1A4D] tabular-nums"
  const statLabelClass = isDark
    ? "text-xs font-semibold uppercase tracking-wide text-white/55 mt-1"
    : "text-xs font-semibold uppercase tracking-wide text-gray-500 mt-1"
  const statHighlightClass = isDark ? "text-[#D3B574]" : "text-[#B31B1B]"
  const pillClass = isDark
    ? "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
    : "inline-flex items-center rounded-full bg-[#0D1A4D] px-4 py-2 text-sm font-semibold text-white"
  const pillGoldClass = isDark
    ? "inline-flex items-center rounded-full bg-[#D3B574] px-4 py-2 text-sm font-semibold text-[#0A1628]"
    : "inline-flex items-center rounded-full bg-[#D3B574] px-4 py-2 text-sm font-semibold text-[#0D1A4D]"
  const tabBarClass = cn(
    "flex gap-1.5 mb-4 rounded-lg p-1.5",
    collapseOnMobile
      ? "flex-nowrap overflow-x-auto scroll-table-x max-lg:flex-nowrap max-lg:overflow-x-auto"
      : "flex-wrap",
    isDark ? "border border-white/10 bg-white/5" : "bg-gray-100",
  )
  const tabActiveClass = isDark
    ? "bg-[#D3B574] text-[#0A1628] shadow-sm font-semibold"
    : "bg-white text-gray-900 shadow-sm font-semibold"
  const tabInactiveClass = isDark
    ? "text-white/65 hover:text-white hover:bg-white/10 font-medium"
    : "text-gray-600 hover:text-gray-900 font-medium"
  const emptyTextClass = isDark ? "text-white/55 text-center py-8" : "text-gray-500 text-center py-8"
  const skeletonClass = isDark ? "bg-white/10" : "bg-gray-200"
  const careerRowClass = isDark
    ? "bg-[#D3B574]/15 border-t border-[#D3B574]/30 font-bold text-white hover:bg-[#D3B574]/15"
    : "bg-[#B31B1B] text-white font-bold hover:bg-[#B31B1B]"
  const [matchData, setMatchData] = useState<SeasonData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Use seasonKey for tabs; default empty and set after data loads
  const [activeTab, setActiveTab] = useState<string>("")

  async function fetchMatchData() {
    try {
      setLoading(true)

      if (!athleteId) {
        setError("No athlete ID provided")
        return
      }

      console.log("[v0] Fetching match data for athlete ID:", athleteId)

      // Primary: matches-direct
      const directUrl = `/api/athletes/${athleteId}/matches-direct`
      console.log("[v0] Trying direct endpoint:", directUrl)
      const directRes = await fetch(directUrl, { cache: "no-store" })
      console.log("[v0] Direct response status:", directRes.status)
      const directData = await directRes.json().catch(() => ({}) as any)
      console.log("[v0] Direct response data:", directData)

      const mapRecord = (record: any): SeasonData => ({
        season: record.season,
        grade: record.grade,
        year: record.season,
        total_matches: Number(record.total_matches ?? (record.wins ?? 0) + (record.losses ?? 0)),
        wins: Number(record.wins ?? 0),
        losses: Number(record.losses ?? 0),
        pins: Number(record.pins ?? 0),
        tech_falls: Number(record.tech_falls ?? 0),
        decisions: Number(record.decisions ?? 0),
        major_decisions: Number(record.major_decisions ?? 0),
        forfeits_won: Number(record.forfeits_won ?? 0),
        win_percentage:
          Number(record.total_matches ?? (record.wins ?? 0) + (record.losses ?? 0)) > 0
            ? ((record.wins ?? 0) / Number(record.total_matches ?? (record.wins ?? 0) + (record.losses ?? 0))) * 100
            : 0,
        matches: Array.isArray(record.matches) ? record.matches : [],
        high_school: record.high_school,
        seasonKey:
          (record.seasonKey && String(record.seasonKey)) ||
          `${String(record.grade || "")
            .toLowerCase()
            .trim()}-${String(record.season || "").trim()}`,
      })

      let seasons: SeasonData[] = []
      const directOk =
        directData && directData.success === true && Array.isArray(directData.matches)
      if (directOk && directData.matches.length > 0) {
        console.log("[v0] Using direct endpoint data, found", directData.matches.length, "seasons")
        seasons = directData.matches.map(mapRecord)
      } else {
        if (directOk && directData.matches.length === 0) {
          console.log(
            "[v0] Direct endpoint OK but no seasons in DB (matches table empty / unlinked for this athlete); trying legacy",
          )
        } else {
          console.log("[v0] Direct endpoint error or unexpected JSON shape; trying legacy")
        }
        // Fallback: legacy endpoint
        const legacyUrl = `/api/athletes/${athleteId}/matches`
        console.log("[v0] Trying legacy endpoint:", legacyUrl)
        const legacyRes = await fetch(legacyUrl, { cache: "no-store" })
        console.log("[v0] Legacy response status:", legacyRes.status)
        const legacyData = await legacyRes.json().catch(() => ({}) as any)
        console.log("[v0] Legacy response data:", legacyData)

        // Try common shapes:
        //  - { success: true, matches: [...] }
        //  - { success: true, seasons: [...] }
        //  - raw array
        const raw =
          (legacyData && (legacyData.matches || legacyData.seasons)) || (Array.isArray(legacyData) ? legacyData : [])

        if (Array.isArray(raw) && raw.length > 0) {
          console.log("[v0] Using legacy endpoint data, found", raw.length, "seasons")
          seasons = raw.map(mapRecord)
        } else {
          console.log("[v0] No season rows from direct or legacy (no match records for this athlete)")
        }
      }

      if (seasons.length > 0) {
        console.log("[v0] Successfully loaded", seasons.length, "seasons of match data")
        setMatchData(seasons)
        setError(null)
        const normalized = normalizeSeasons(seasons)
        if (normalized.length > 0) {
          setActiveTab(normalized[0].seasonKey as string)
        }
      } else if (IS_DEV) {
        console.log("[v0] No real data found, using mock data for development")
        // Show mock data in preview/dev to verify UI without live DB
        setMatchData(DEV_MOCK_SEASONS)
        setError(null)
        const normalized = normalizeSeasons(DEV_MOCK_SEASONS)
        if (normalized.length > 0) {
          setActiveTab(normalized[0].seasonKey as string)
        }
      } else {
        console.log("[v0] No match data available")
        setMatchData([])
        setError("No match data found")
      }
    } catch (err) {
      console.error("[v0] Error fetching match data:", err)
      setError("Failed to load match data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatchData()
  }, [athleteId, athleteName])

  const sortedSeasons = useMemo(() => normalizeSeasons(matchData), [matchData])

  const effectiveGradYear = useMemo(() => {
    if (graduationYear) {
      console.log("[v0] Using provided graduation year:", graduationYear)
      return graduationYear
    }

    // Only calculate from season data if no graduationYear is provided
    const latest = sortedSeasons[0]
    if (!latest) {
      console.log("[v0] No season data available for graduation year calculation")
      return undefined
    }

    const start = parseStartYear(latest?.season)
    if (!start) {
      console.log("[v0] Could not parse start year from season:", latest?.season)
      return undefined
    }

    // Calculate based on the assumption that the latest season represents their current grade
    // If they're a senior in 2024-25, they graduate in 2025
    // If they're a junior in 2024-25, they graduate in 2026, etc.
    const gradeLevel = normalizeGradeLabel(latest.grade)
    let yearsToAdd = 1 // Default to senior (graduates next year)

    switch (gradeLevel) {
      case "Senior":
        yearsToAdd = 1
        break
      case "Junior":
        yearsToAdd = 2
        break
      case "Sophomore":
        yearsToAdd = 3
        break
      case "Freshman":
        yearsToAdd = 4
        break
    }

    const calculated = start + yearsToAdd
    console.log("[v0] Calculated graduation year from season data:", calculated, "based on grade:", gradeLevel)
    return calculated
  }, [graduationYear, sortedSeasons])

  // Compute display grade labels per season row
  const gradeBySeasonKey = new Map<string, string>()
  sortedSeasons.forEach((s, idx) => {
    const key = s.seasonKey || s.season || String(idx)
    const normalized = normalizeGradeLabel(s.grade)
    const start = parseStartYear(s.season)
    const byGrad = gradeFromGradYear(start, effectiveGradYear)
    const inferred = gradeFromIndex(idx)
    // Priority: derived from graduation year → normalized from data → position-based inference → raw → —
    const label = byGrad || normalized || inferred || (s.grade ? String(s.grade) : "—")
    gradeBySeasonKey.set(key, label)
  })

  function getDisplayGrade(s: SeasonData, idx: number): string {
    const key = s.seasonKey || s.season || String(idx)
    const fromMap = gradeBySeasonKey.get(key)
    if (fromMap) return fromMap
    const start = parseStartYear(s.season)
    return (
      normalizeGradeLabel(s.grade) ||
      gradeFromGradYear(start, effectiveGradYear) ||
      gradeFromIndex(idx) ||
      s.grade ||
      "—"
    )
  }

  const getYearsOfHighSchool = () => {
    const yearsCount = sortedSeasons.length
    if (yearsCount === 0) return "High School Wrestling"
    if (yearsCount === 1) return "One Year of Championship Wrestling"
    if (yearsCount === 2) return "Two Years of Championship Wrestling"
    if (yearsCount === 3) return "Three Years of Championship Wrestling"
    if (yearsCount === 4) return "Four Years of Championship Wrestling"
    return `${yearsCount} Years of Championship Wrestling`
  }

  const getResultDisplay = (match: IndividualMatch) => {
    const winLoss = match.win_loss || ""
    if (winLoss === "W") {
      return { display: "W", isWin: true }
    } else if (winLoss === "L") {
      return { display: "L", isWin: false }
    } else {
      return { display: "?", isWin: true }
    }
  }

  if (loading) {
    return (
      <Card className={cardClass}>
        <CardContent className={cn(contentClass, "min-w-0")}>
          <div className="animate-pulse space-y-4">
            <div className={cn("h-8 rounded w-2/3 mx-auto", skeletonClass)} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={cn("h-20 rounded-lg", skeletonClass)} />
              ))}
            </div>
            <div className={cn("h-40 rounded-lg", skeletonClass)} />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || sortedSeasons.length === 0) {
    return (
      <Card className={cardClass}>
        <CardHeader className={headerClass}>
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-[#D3B574]" />
            High School Career Match Results
          </CardTitle>
        </CardHeader>
        <CardContent className={cn(contentClass, "min-w-0")}>
          <p className={emptyTextClass}>No match data available for {athleteName}</p>
        </CardContent>
      </Card>
    )
  }

  // Career totals across ALL normalized seasons (no grade-level collapsing)
  const careerTotals = sortedSeasons.reduce(
    (totals, season) => ({
      matches: totals.matches + (season.total_matches || 0),
      wins: totals.wins + (season.wins || 0),
      losses: totals.losses + (season.losses || 0),
      pins: totals.pins + (season.pins || 0),
      techFalls: totals.techFalls + (season.tech_falls || 0),
      decisions: totals.decisions + (season.decisions || 0),
      majorDec: totals.majorDec + (season.major_decisions || 0),
      forfeits: totals.forfeits + (season.forfeits_won || 0),
    }),
    { matches: 0, wins: 0, losses: 0, pins: 0, techFalls: 0, decisions: 0, majorDec: 0, forfeits: 0 },
  )

  const totalMatches = careerTotals.wins + careerTotals.losses
  const winPercentage = totalMatches > 0 ? (careerTotals.wins / totalMatches) * 100 : 0

  const activeSeason = sortedSeasons.find((season) => season.seasonKey === activeTab) ?? sortedSeasons[0]

  const sectionTitle = collapseOnMobile ? "In-season match log" : "High School Career Match Results"

  const matchDataBody = (
    <>
      {/* Career stats — profile-style tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className={statTileClass}>
            <div className={statValueClass}>
              {careerTotals.wins}-{careerTotals.losses}
            </div>
            <div className={statLabelClass}>Career Record</div>
          </div>
          <div className={statTileClass}>
            <div className={cn(statValueClass, statHighlightClass)}>
              {winPercentage.toFixed(1)}%
            </div>
            <div className={statLabelClass}>Win Percentage</div>
          </div>
          <div className={statTileClass}>
            <div className={statValueClass}>{careerTotals.pins}</div>
            <div className={statLabelClass}>Pins</div>
          </div>
          <div className={statTileClass}>
            <div className={statValueClass}>{careerTotals.techFalls}</div>
            <div className={statLabelClass}>Tech Falls</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
          <span className={pillClass}>{totalMatches} Total Matches</span>
          {effectiveGradYear ? (
            <span className={pillGoldClass}>{`Class of ${effectiveGradYear}`}</span>
          ) : null}
        </div>

        {/* Season summary */}
        <div className="mb-8">
          <h3 className={sectionTitleClass}>Season Summary</h3>
          <ProfileScrollTable minWidthPx={720} borderClassName={tableBorderClass}>
              <TableHeader>
                <TableRow className={tableHeadRowClass}>
                  <TableHead className={tableHeadCellClass}>Year</TableHead>
                  <TableHead className={tableHeadCellClass}>Grade</TableHead>
                  <TableHead className={tableHeadCellClass}>Matches</TableHead>
                  <TableHead className={tableHeadCellClass}>Record</TableHead>
                  <TableHead className={tableHeadCellClass}>Pins</TableHead>
                  <TableHead className={tableHeadCellClass}>Tech Falls</TableHead>
                  <TableHead className={tableHeadCellClass}>Decisions</TableHead>
                  <TableHead className={tableHeadCellClass}>Major Dec</TableHead>
                  <TableHead className={tableHeadCellClass}>Forfeits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSeasons.map((season, index) => (
                  <TableRow key={season.seasonKey} className={tableRowAltClass(index)}>
                    <TableCell className={cellPrimaryClass}>{season.season}</TableCell>
                    <TableCell className={cellMutedClass}>{getDisplayGrade(season, index)}</TableCell>
                    <TableCell className={cellPrimaryClass}>{season.total_matches}</TableCell>
                    <TableCell className={cellRecordClass}>
                      {season.wins}-{season.losses}
                    </TableCell>
                    <TableCell className={cellPrimaryClass}>{season.pins}</TableCell>
                    <TableCell className={cellPrimaryClass}>{season.tech_falls}</TableCell>
                    <TableCell className={cellPrimaryClass}>{season.decisions}</TableCell>
                    <TableCell className={cellPrimaryClass}>{season.major_decisions}</TableCell>
                    <TableCell className={cellPrimaryClass}>{season.forfeits_won}</TableCell>
                  </TableRow>
                ))}
                <TableRow className={careerRowClass}>
                  <TableCell>CAREER</TableCell>
                  <TableCell>TOTALS</TableCell>
                  <TableCell>{totalMatches}</TableCell>
                  <TableCell>
                    {careerTotals.wins}-{careerTotals.losses}
                  </TableCell>
                  <TableCell>{careerTotals.pins}</TableCell>
                  <TableCell>{careerTotals.techFalls}</TableCell>
                  <TableCell>{careerTotals.decisions}</TableCell>
                  <TableCell>{careerTotals.majorDec}</TableCell>
                  <TableCell>{careerTotals.forfeits}</TableCell>
                </TableRow>
              </TableBody>
          </ProfileScrollTable>
        </div>

        {/* Individual match list */}
        <div>
          <h3 className={sectionTitleClass}>Individual Matches</h3>
          <p className={cn("text-sm mb-4", isDark ? "text-white/55" : "text-gray-600")}>
            Select a season to view each match.
          </p>

          <div className={tabBarClass}>
            {sortedSeasons.map((season, idx) => {
              const displayGrade = getDisplayGrade(season, idx)
              const label = `${displayGrade} (${season.season})`
              const isActive = activeTab === season.seasonKey
              return (
                <button
                  key={`${season.seasonKey}-tab`}
                  type="button"
                  onClick={() => setActiveTab(season.seasonKey as string)}
                  className={cn(
                    "match-season-tab shrink-0 inline-flex items-center justify-center whitespace-nowrap rounded-full border border-transparent px-2.5 py-1 text-[11px] leading-tight sm:px-3 sm:py-1.5 sm:text-xs md:text-sm min-h-0 min-w-0 h-auto transition-colors capitalize",
                    isActive ? tabActiveClass : tabInactiveClass,
                    isActive && "border-[#D3B574]/40",
                  )}
                  aria-pressed={isActive}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <ProfileScrollTable minWidthPx={800} borderClassName={tableBorderClass}>
              <TableHeader>
                <TableRow className={tableHeadRowClass}>
                  <TableHead className={tableHeadCellClass}>Date</TableHead>
                  <TableHead className={tableHeadCellClass}>Weight</TableHead>
                  <TableHead className={tableHeadCellClass}>Opponent</TableHead>
                  <TableHead className={tableHeadCellClass}>School</TableHead>
                  <TableHead className={cn(tableHeadCellClass, "text-center")}>Result</TableHead>
                  <TableHead className={tableHeadCellClass}>Method</TableHead>
                  <TableHead className={tableHeadCellClass}>Tournament / Venue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSeason?.matches?.length ? (
                  activeSeason.matches.map((match, index) => {
                    const resultInfo = getResultDisplay(match)
                    const opponentName = match.opponent || match.opponent_name || "Unknown"
                    const isOwnName =
                      opponentName.toLowerCase().includes(athleteName.toLowerCase()) ||
                      athleteName.toLowerCase().includes(opponentName.toLowerCase())
                    const displayOpponent = isOwnName ? "Opponent Name Missing" : opponentName

                    return (
                      <TableRow key={`match-${index}`} className={tableRowAltClass(index)}>
                        <TableCell className={cellPrimaryClass}>{match.date || "—"}</TableCell>
                        <TableCell className={cellMutedClass}>{match.weight ?? "—"}</TableCell>
                        <TableCell className={cellOpponentClass}>{displayOpponent}</TableCell>
                        <TableCell className={cellMutedClass}>
                          {match.opponent_school || match.school || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white",
                              resultInfo.isWin ? "bg-emerald-600" : "bg-red-600",
                            )}
                            aria-label={resultInfo.isWin ? "Win" : "Loss"}
                            title={resultInfo.isWin ? "Win" : "Loss"}
                          >
                            {resultInfo.display}
                          </span>
                        </TableCell>
                        <TableCell className={cellPrimaryClass}>{match.method || match.result || "—"}</TableCell>
                        <TableCell className={cellMutedClass}>
                          {match.tournament || match.venue || "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className={emptyTextClass}>
                      No individual match data for{" "}
                      {activeSeason ? `${activeSeason.grade} (${activeSeason.season})` : "this season"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
          </ProfileScrollTable>
        </div>
    </>
  )

  const matchDataHeader = (
    <CardHeader className={headerClass}>
      <CardTitle className="text-white flex items-center gap-2 text-lg md:text-xl">
        <BarChart3 className="h-5 w-5 text-[#D3B574]" />
        {sectionTitle}
      </CardTitle>
      {collapseOnMobile ? (
        <p className={cn("text-xs mt-1", isDark ? "text-white/50" : "text-blue-100/80")}>
          {careerTotals.wins}-{careerTotals.losses} career · {totalMatches} matches
        </p>
      ) : getYearsOfHighSchool() ? (
        <p className={cn("text-sm mt-1", isDark ? "text-white/65" : "text-blue-100")}>
          {getYearsOfHighSchool()}
        </p>
      ) : null}
    </CardHeader>
  )

  if (collapseOnMobile) {
    return (
      <div className={PROFILE_TABLE_WIDTH_CONSTRAINT_CLASS}>
        <Collapsible open={mobileOpen} onOpenChange={setMobileOpen} className={cn(PROFILE_TABLE_WIDTH_CONSTRAINT_CLASS, "lg:hidden")}>
          <Card className={cardClass} id="in-season" data-section="in-season">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full text-left">
                <CardHeader className={headerClass}>
                  <CardTitle className="text-white flex items-center justify-between gap-2 text-base">
                    <span className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-[#D3B574]" />
                      {sectionTitle}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-white/70 transition-transform",
                        mobileOpen && "rotate-180",
                      )}
                    />
                  </CardTitle>
                  {/* The record is the headline, not a hint that something is hidden. A college
                      coach scanning a profile should read 143-6 without tapping anything; the
                      bout-by-bout table is what stays folded away. */}
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className={cn("text-2xl font-semibold leading-none", isDark ? "text-white" : "text-white")}>
                      {careerTotals.wins}-{careerTotals.losses}
                    </span>
                    {totalMatches > 0 ? (
                      <span className={cn("text-sm", isDark ? "text-white/70" : "text-blue-100")}>
                        {winPercentage.toFixed(1)}% wins
                      </span>
                    ) : null}
                    {careerTotals.pins > 0 ? (
                      <span className={cn("text-sm", isDark ? "text-white/70" : "text-blue-100")}>
                        {careerTotals.pins} pins
                      </span>
                    ) : null}
                  </div>
                  <p className={cn("text-xs mt-1", isDark ? "text-white/50" : "text-blue-100/80")}>
                    {totalMatches} matches — tap for every bout
                  </p>
                </CardHeader>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent
              className={cn(
                PROFILE_TABLE_WIDTH_CONSTRAINT_CLASS,
                "overflow-visible data-[state=closed]:overflow-hidden",
              )}
            >
              <CardContent className={cn(contentClass, PROFILE_TABLE_WIDTH_CONSTRAINT_CLASS)}>
                {matchDataBody}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        <Card className={cn(cardClass, "hidden lg:block")}>
          {matchDataHeader}
          <CardContent className={cn(contentClass, PROFILE_TABLE_WIDTH_CONSTRAINT_CLASS)}>{matchDataBody}</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card className={cardClass}>
      {matchDataHeader}
      <CardContent className={cn(contentClass, PROFILE_TABLE_WIDTH_CONSTRAINT_CLASS)}>{matchDataBody}</CardContent>
    </Card>
  )
}

// Also export as default for backward compatibility
export default MatchDataSectionImproved

// Named export
export { MatchDataSectionImproved as MatchDataSection }
