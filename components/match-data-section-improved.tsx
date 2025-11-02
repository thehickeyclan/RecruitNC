"use client"

import { useEffect, useMemo, useState } from "react"

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

export function MatchDataSectionImproved({ athleteId, athleteName, graduationYear }: MatchDataSectionImprovedProps) {
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
      if (directData && directData.success && Array.isArray(directData.matches) && directData.matches.length > 0) {
        console.log("[v0] Using direct endpoint data, found", directData.matches.length, "seasons")
        seasons = directData.matches.map(mapRecord)
      } else {
        console.log("[v0] Direct endpoint failed or no data, trying fallback")
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
          console.log("[v0] No data from either endpoint")
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || sortedSeasons.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">High School Career Match Results</h2>
        <p className="text-gray-500 text-center py-8">No match data available for {athleteName}</p>
      </div>
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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-center mb-6" style={{ color: "#0D1A4D" }}>
        High School Career Match Results
      </h2>

      {/* Career Excellence Banner */}
      <div className="rounded-lg p-8 mb-8 text-white" style={{ backgroundColor: "#B31B1B" }}>
        <div className="text-center mb-6">
          <h3 className="text-3xl font-bold mb-2">HIGH SCHOOL CAREER EXCELLENCE</h3>
          <p className="text-xl opacity-90">{getYearsOfHighSchool()}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div className="text-center">
            <div className="text-4xl font-bold mb-1">
              {careerTotals.wins}-{careerTotals.losses}
            </div>
            <div className="text-lg opacity-90">Career Record</div>
          </div>

          <div className="text-center">
            <div className="text-4xl font-bold mb-1" style={{ color: "#CBAF5D" }}>
              {winPercentage.toFixed(1)}%
            </div>
            <div className="text-lg opacity-90">Win Percentage</div>
          </div>

          <div className="text-center">
            <div className="text-4xl font-bold mb-1">{careerTotals.pins}</div>
            <div className="text-lg opacity-90">Pins</div>
          </div>

          <div className="text-center">
            <div className="text-4xl font-bold mb-1">{careerTotals.techFalls}</div>
            <div className="text-lg opacity-90">Tech Falls</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <div className="px-6 py-3 rounded-full text-white font-semibold" style={{ backgroundColor: "#0D1A4D" }}>
            {totalMatches} Total Matches
          </div>
          {/* Class/Grad Year pill */}
          {effectiveGradYear ? (
            <div
              className="px-6 py-3 rounded-full font-semibold"
              style={{ backgroundColor: "#CBAF5D", color: "#0D1A4D" }}
            >
              {`Class of ${effectiveGradYear}`}
            </div>
          ) : null}
        </div>
      </div>

      {/* Season Summary Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4" style={{ color: "#0D1A4D" }}>
          Season Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: "#0D1A4D" }} className="text-white">
                <th className="px-4 py-3 text-left font-semibold">Year</th>
                <th className="px-4 py-3 text-left font-semibold">Grade</th>
                <th className="px-4 py-3 text-left font-semibold">Matches</th>
                <th className="px-4 py-3 text-left font-semibold">Record</th>
                <th className="px-4 py-3 text-left font-semibold">Pins</th>
                <th className="px-4 py-3 text-left font-semibold">Tech Falls</th>
                <th className="px-4 py-3 text-left font-semibold">Decisions</th>
                <th className="px-4 py-3 text-left font-semibold">Major Dec</th>
                <th className="px-4 py-3 text-left font-semibold">Forfeits</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedSeasons.map((season, index) => (
                <tr key={season.seasonKey} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-4 py-3 text-gray-900">{season.season}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{getDisplayGrade(season, index)}</td>
                  <td className="px-4 py-3 text-gray-900">{season.total_matches}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "#B31B1B" }}>
                    {season.wins}-{season.losses}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{season.pins}</td>
                  <td className="px-4 py-3 text-gray-900">{season.tech_falls}</td>
                  <td className="px-4 py-3 text-gray-900">{season.decisions}</td>
                  <td className="px-4 py-3 text-gray-900">{season.major_decisions}</td>
                  <td className="px-4 py-3 text-gray-900">{season.forfeits_won}</td>
                </tr>
              ))}
              {/* Career Totals Row */}
              <tr style={{ backgroundColor: "#B31B1B" }} className="text-white font-bold">
                <td className="px-4 py-3">CAREER</td>
                <td className="px-4 py-3">TOTALS</td>
                <td className="px-4 py-3">{totalMatches}</td>
                <td className="px-4 py-3">
                  {careerTotals.wins}-{careerTotals.losses}
                </td>
                <td className="px-4 py-3">{careerTotals.pins}</td>
                <td className="px-4 py-3">{careerTotals.techFalls}</td>
                <td className="px-4 py-3">{careerTotals.decisions}</td>
                <td className="px-4 py-3">{careerTotals.majorDec}</td>
                <td className="px-4 py-3">{careerTotals.forfeits}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Match Results with Tabs */}
      <div>
        {/* Grade+Season Tabs (unique by seasonKey) */}
        <div className="flex flex-wrap gap-2 mb-4 bg-gray-100 rounded-lg p-2">
          {sortedSeasons.map((season, idx) => {
            const displayGrade = getDisplayGrade(season, idx)
            const label = `${displayGrade} (${season.season})`
            const isActive = activeTab === season.seasonKey
            return (
              <button
                key={`${season.seasonKey}-tab`}
                onClick={() => setActiveTab(season.seasonKey as string)}
                className={`whitespace-nowrap min-w-[140px] py-2 px-4 text-center font-medium rounded-md transition-colors capitalize ${
                  isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-800"
                }`}
                aria-pressed={isActive}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Individual Match Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: "#0D1A4D" }} className="text-white">
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Weight</th>
                <th className="px-4 py-3 text-left font-semibold">Opponent</th>
                <th className="px-4 py-3 text-left font-semibold">School</th>
                <th className="px-4 py-3 text-left font-semibold">Result</th>
                <th className="px-4 py-3 text-left font-semibold">Method</th>
                <th className="px-4 py-3 text-left font-semibold">Tournament/Venue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeSeason && activeSeason.matches && activeSeason.matches.length > 0 ? (
                activeSeason.matches.map((match, index) => {
                  const resultInfo = getResultDisplay(match)

                  const opponentName = match.opponent || match.opponent_name || "Unknown"
                  const isOwnName =
                    opponentName.toLowerCase().includes(athleteName.toLowerCase()) ||
                    athleteName.toLowerCase().includes(opponentName.toLowerCase())

                  const displayOpponent = isOwnName ? "Opponent Name Missing" : opponentName

                  console.log("[v0] Match data:", {
                    index,
                    opponent: match.opponent,
                    opponent_name: match.opponent_name,
                    result: match.win_loss,
                    athleteName,
                  })

                  return (
                    <tr key={`match-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{match.date || "N/A"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{match.weight || "N/A"}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{displayOpponent}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {match.opponent_school || match.school || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
                            resultInfo.isWin ? "bg-green-500" : "bg-red-500"
                          }`}
                          aria-label={resultInfo.isWin ? "Win" : "Loss"}
                          title={resultInfo.isWin ? "Win" : "Loss"}
                        >
                          {resultInfo.display}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{match.method || match.result || "N/A"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{match.tournament || match.venue || "N/A"}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No individual match data available for{" "}
                    {activeSeason ? `${activeSeason.grade} (${activeSeason.season})` : "this season"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Also export as default for backward compatibility
export default MatchDataSectionImproved

// Named export
export { MatchDataSectionImproved as MatchDataSection }
