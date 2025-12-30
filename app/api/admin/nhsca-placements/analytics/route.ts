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

    // Get all placements for the state and year range
    const { data: placements, error } = await supabase
      .from("nhsca_placements")
      .select("*")
      .eq("state", state)
      .gte("year", startYear)
      .lte("year", endYear)
      .order("year", { ascending: true })

    if (error) {
      console.error("Error fetching placements:", error)
      return NextResponse.json({ error: "Failed to fetch placements" }, { status: 500 })
    }

    // Debug: Log 2025 Senior data with detailed breakdown
    if (endYear >= 2025) {
      const all2025 = placements?.filter((p) => p.year === 2025) || []
      const senior2025 = all2025.filter(
        (p) => p.division?.toLowerCase().trim() === "senior"
      )
      const senior2025ByState = all2025.filter(
        (p) => p.division?.toLowerCase().trim() === "senior" && p.state === "NC"
      )
      const divisionVariations = new Set(all2025.map(p => p.division?.toLowerCase().trim()).filter(Boolean))
      const stateVariations = new Set(all2025.map(p => p.state).filter(Boolean))
      
      console.log(`[NHSCA Analytics] 2025 Total: ${all2025.length} records`)
      console.log(`[NHSCA Analytics] 2025 Senior (all states): ${senior2025.length} total, ${senior2025.filter(p => p.placement !== null && p.placement !== undefined).length} All-Americans`)
      console.log(`[NHSCA Analytics] 2025 Senior (NC only): ${senior2025ByState.length} total, ${senior2025ByState.filter(p => p.placement !== null && p.placement !== undefined).length} All-Americans`)
      console.log(`[NHSCA Analytics] 2025 Division variations:`, Array.from(divisionVariations))
      console.log(`[NHSCA Analytics] 2025 State variations:`, Array.from(stateVariations))
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
      // Normalize division name (handle case variations and whitespace)
      let division = "Unknown"
      if (placement.division) {
        const normalized = placement.division.trim()
        // Capitalize first letter, lowercase rest
        division = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()
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

