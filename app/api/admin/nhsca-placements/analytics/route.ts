import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * Parse win-loss record (e.g., "3-2" -> {wins: 3, losses: 2})
 */
function parseRecord(record: string | null): { wins: number; losses: number } {
  if (!record) return { wins: 0, losses: 0 }
  
  const match = record.match(/(\d+)-(\d+)/)
  if (match) {
    return {
      wins: parseInt(match[1], 10),
      losses: parseInt(match[2], 10),
    }
  }
  return { wins: 0, losses: 0 }
}

/**
 * Calculate win percentage
 */
function calculateWinPercentage(wins: number, losses: number): number {
  const total = wins + losses
  if (total === 0) return 0
  return (wins / total) * 100
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get("state") || "NC"
    const startYear = parseInt(searchParams.get("startYear") || "2020")
    const endYear = parseInt(searchParams.get("endYear") || new Date().getFullYear().toString())

    // FIRST: Verify exact count from database using direct SQL query (optional - function may not exist)
    let dbCount: any = null
    try {
      const { data, error: countError } = await supabase.rpc('get_nhsca_2025_senior_count').single()
      if (!countError && data) {
        dbCount = data
        console.log(`[NHSCA Analytics] Database says 2025 Senior: ${dbCount.total_participants} participants, ${dbCount.all_americans} All-Americans`)
      }
    } catch (e) {
      // SQL function doesn't exist yet, that's okay - we'll calculate it
      console.log(`[NHSCA Analytics] SQL function not available, calculating from fetched data`)
    }

    // Get ALL placements for the year range - NO FILTERS in query, filter everything in JavaScript
    // This ensures we get every single record, then filter by state/division in code
    let allPlacements: any[] = []
    let offset = 0
    const pageSize = 1000
    
    while (true) {
      const { data: page, error: fetchError } = await supabase
        .from("nhsca_placements")
        .select("*")
        .gte("year", startYear)
        .lte("year", endYear)
        .order("year", { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (fetchError) {
        console.error("Error fetching placements:", fetchError)
        return NextResponse.json({ error: "Failed to fetch placements" }, { status: 500 })
      }

      if (!page || page.length === 0) break
      
      allPlacements = allPlacements.concat(page)
      offset += pageSize
      
      if (page.length < pageSize) break
    }

    // Helper function to normalize division names robustly - handle ALL variations
    // MUST be defined before it's used
    const normalizeDivision = (div: string | null | undefined): string => {
      if (!div) return "Unknown"
      // Convert to string, trim, normalize whitespace, lowercase
      const cleaned = String(div).trim().replace(/\s+/g, " ").toLowerCase()
      
      // Match ANY variation - be extremely permissive
      if (cleaned.includes("senior")) return "Senior"
      if (cleaned.includes("junior")) return "Junior"
      if (cleaned.includes("sophomore")) return "Sophomore"
      if (cleaned.includes("freshman")) return "Freshman"
      
      // Fallback: capitalize first letter
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    }

    // Filter by state in JavaScript (case-insensitive, handle nulls)
    const placements = allPlacements.filter(p => {
      if (!p.state) return false
      const pState = String(p.state).trim().toUpperCase()
      const targetState = String(state).trim().toUpperCase()
      return pState === targetState
    })

    // DEBUG: Log exact counts for 2025 Senior
    if (endYear >= 2025) {
      const all2025 = placements.filter(p => p.year === 2025)
      const senior2025Raw = all2025.filter(p => {
        const div = p.division ? String(p.division).trim().toLowerCase() : ''
        return div === 'senior' || div.includes('senior')
      })
      const senior2025Normalized = all2025.filter(p => {
        const normalized = normalizeDivision(p.division)
        return normalized === 'Senior'
      })
      
      console.log(`[NHSCA Analytics] Total 2025 records fetched: ${all2025.length}`)
      console.log(`[NHSCA Analytics] 2025 Senior (raw match): ${senior2025Raw.length} participants, ${senior2025Raw.filter(p => p.placement !== null && p.placement !== undefined).length} All-Americans`)
      console.log(`[NHSCA Analytics] 2025 Senior (normalized): ${senior2025Normalized.length} participants, ${senior2025Normalized.filter(p => p.placement !== null && p.placement !== undefined).length} All-Americans`)
      
      // Show division value variations
      const divVariations = new Set(all2025.map(p => p.division).filter(Boolean))
      console.log(`[NHSCA Analytics] 2025 Division values found:`, Array.from(divVariations))
    }

    if (!placements || placements.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          byYear: [],
          byClass: [],
          overall: {
            totalParticipants: 0,
            totalPlacers: 0,
            totalWins: 0,
            totalLosses: 0,
            overallWinPercentage: 0,
          },
        },
      })
    }

    // Calculate statistics by year
    const statsByYear = new Map<number, {
      year: number
      participants: number
      placers: number
      wins: number
      losses: number
      winPercentage: number
      placementBreakdown: Record<number, number>
    }>()

    // Calculate statistics by graduation class (estimate from division and year)
    const statsByClass = new Map<number, {
      class: number
      participants: number
      placers: number
      wins: number
      losses: number
      winPercentage: number
    }>()

    // Overall statistics
    let totalWins = 0
    let totalLosses = 0
    let totalPlacers = 0

    placements.forEach((placement) => {
      const { wins, losses } = parseRecord(placement.record)
      totalWins += wins
      totalLosses += losses

      // By Year
      if (!statsByYear.has(placement.year)) {
        statsByYear.set(placement.year, {
          year: placement.year,
          participants: 0,
          placers: 0,
          wins: 0,
          losses: 0,
          winPercentage: 0,
          placementBreakdown: {},
        })
      }
      const yearStats = statsByYear.get(placement.year)!
      yearStats.participants++
      yearStats.wins += wins
      yearStats.losses += losses

      if (placement.placement !== null && placement.placement !== undefined) {
        yearStats.placers++
        totalPlacers++
        const placementNum = placement.placement
        yearStats.placementBreakdown[placementNum] = (yearStats.placementBreakdown[placementNum] || 0) + 1
      }

      yearStats.winPercentage = calculateWinPercentage(yearStats.wins, yearStats.losses)

      // By Class (estimate graduation year from division and tournament year)
      let estimatedGradYear: number | null = null
      if (placement.division === "Senior") {
        estimatedGradYear = placement.year
      } else if (placement.division === "Junior") {
        estimatedGradYear = placement.year + 1
      } else if (placement.division === "Sophomore") {
        estimatedGradYear = placement.year + 2
      } else if (placement.division === "Freshman") {
        estimatedGradYear = placement.year + 3
      }

      if (estimatedGradYear) {
        if (!statsByClass.has(estimatedGradYear)) {
          statsByClass.set(estimatedGradYear, {
            class: estimatedGradYear,
            participants: 0,
            placers: 0,
            wins: 0,
            losses: 0,
            winPercentage: 0,
          })
        }
        const classStats = statsByClass.get(estimatedGradYear)!
        classStats.participants++
        classStats.wins += wins
        classStats.losses += losses
        if (placement.placement !== null && placement.placement !== undefined) {
          classStats.placers++
        }
        classStats.winPercentage = calculateWinPercentage(classStats.wins, classStats.losses)
      }
    })

    // Calculate statistics by division and year (for All-American queries)
    const statsByDivisionAndYear = new Map<string, Map<number, {
      year: number
      division: string
      participants: number
      allAmericans: number // Placers (1-8)
      champions: number
      finalists: number
      top4: number
      top8: number
    }>>()

    placements.forEach((placement) => {
      // Normalize division name (handle all case variations and whitespace)
      const division = normalizeDivision(placement.division)
      
      // DEBUG: Log if we're missing Senior records
      if (placement.year === 2025 && placement.state === 'NC') {
        const rawDiv = placement.division ? String(placement.division).trim().toLowerCase() : ''
        if (rawDiv.includes('senior') && division !== 'Senior') {
          console.warn(`[NHSCA Analytics] Division normalization issue: "${placement.division}" -> "${division}"`)
        }
      }
      
      if (!statsByDivisionAndYear.has(division)) {
        statsByDivisionAndYear.set(division, new Map())
      }
      
      const divisionMap = statsByDivisionAndYear.get(division)!
      
      if (!divisionMap.has(placement.year)) {
        divisionMap.set(placement.year, {
          year: placement.year,
          division,
          participants: 0,
          allAmericans: 0,
          champions: 0,
          finalists: 0,
          top4: 0,
          top8: 0,
        })
      }
      
      const yearDivStats = divisionMap.get(placement.year)!
      yearDivStats.participants++
      
      // Count All-Americans (placers 1-8)
      if (placement.placement !== null && placement.placement !== undefined) {
        yearDivStats.allAmericans++
        
        if (placement.placement === 1) {
          yearDivStats.champions++
        }
        if (placement.placement <= 2) {
          yearDivStats.finalists++
        }
        if (placement.placement <= 4) {
          yearDivStats.top4++
        }
        if (placement.placement <= 8) {
          yearDivStats.top8++
        }
      }
    })

    // Convert division stats to arrays
    const byDivisionAndYear: Record<string, Array<{
      year: number
      division: string
      participants: number
      allAmericans: number
      champions: number
      finalists: number
      top4: number
      top8: number
    }>> = {}
    
    statsByDivisionAndYear.forEach((yearMap, division) => {
      byDivisionAndYear[division] = Array.from(yearMap.values()).sort((a, b) => a.year - b.year)
    })

    // Find best year for each division (most All-Americans)
    const bestYearByDivision: Record<string, {
      year: number
      allAmericans: number
      participants: number
    }> = {}
    
    statsByDivisionAndYear.forEach((yearMap, division) => {
      let bestYear = 0
      let maxAllAmericans = 0
      let participants = 0
      
      yearMap.forEach((stats, year) => {
        if (stats.allAmericans > maxAllAmericans) {
          maxAllAmericans = stats.allAmericans
          bestYear = year
          participants = stats.participants
        }
      })
      
      if (bestYear > 0) {
        bestYearByDivision[division] = {
          year: bestYear,
          allAmericans: maxAllAmericans,
          participants,
        }
      }
    })

    // Convert maps to arrays and sort
    const byYear = Array.from(statsByYear.values()).sort((a, b) => a.year - b.year)
    const byClass = Array.from(statsByClass.values()).sort((a, b) => a.class - b.class)

    // Find best years by win percentage
    const bestYears = [...byYear]
      .filter((y) => y.participants > 0)
      .sort((a, b) => b.winPercentage - a.winPercentage)
      .slice(0, 5)

    // Overall statistics
    const overallWinPercentage = calculateWinPercentage(totalWins, totalLosses)

    // FINAL VERIFICATION: If we have 2025 data, verify Senior count matches database
    if (endYear >= 2025 && byDivisionAndYear["Senior"]) {
      const senior2025 = byDivisionAndYear["Senior"].find(s => s.year === 2025)
      if (senior2025) {
        console.log(`[NHSCA Analytics] FINAL: 2025 Senior = ${senior2025.participants} participants, ${senior2025.allAmericans} All-Americans`)
        // If database count exists and doesn't match, log warning
        if (dbCount && dbCount.total_participants && dbCount.total_participants !== senior2025.participants) {
          console.error(`[NHSCA Analytics] MISMATCH: Database says ${dbCount.total_participants}, we calculated ${senior2025.participants}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        byYear,
        byClass,
        byDivisionAndYear, // New: breakdown by division and year
        bestYearByDivision, // New: best year for each division
        bestYears,
        overall: {
          totalParticipants: placements.length,
          totalPlacers,
          totalWins,
          totalLosses,
          overallWinPercentage: Math.round(overallWinPercentage * 100) / 100,
        },
      },
    })
  } catch (error: any) {
    console.error("Analytics error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

