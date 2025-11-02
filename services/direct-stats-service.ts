import { supabase } from "@/lib/supabase"

// This is a completely new service that uses a direct approach
export async function getDirectDivisionCounts() {
  try {
    console.log("Fetching direct division counts...")

    // Get all athletes with college commitments
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .not("college", "is", null)

    if (error) {
      console.error("Error fetching athletes:", error)
      return {
        success: false,
        error: error.message,
        counts: { D1: 0, D2: 0, D3: 0, NAIA: 0, NJCAA: 0 },
      }
    }

    // Initialize counts
    const counts = {
      D1: 0,
      D2: 0,
      D3: 0,
      NAIA: 0,
      NJCAA: 0,
    }

    // Process each athlete with exact division matching
    athletes.forEach((athlete) => {
      const division = athlete.division || ""

      // Use exact matching to match the debug page
      if (division === "NCAA Division I") {
        counts.D1++
      } else if (division === "NCAA Division II") {
        counts.D2++
      } else if (division === "NCAA Division III") {
        counts.D3++
      } else if (division === "NAIA") {
        counts.NAIA++
      } else if (division === "NJCAA") {
        counts.NJCAA++
      }
    })

    return {
      success: true,
      counts,
      totalAthletes: athletes.length,
    }
  } catch (error) {
    console.error("Error in getDirectDivisionCounts:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      counts: { D1: 0, D2: 0, D3: 0, NAIA: 0, NJCAA: 0 },
    }
  }
}

// Updated function to get direct stats with improved division detection
export async function getDirectStats() {
  try {
    // Get all athletes with college commitments
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, college, division, graduationyear")
      .not("college", "is", null)

    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return getDefaultStats()
    }

    // Get the total count of athletes with commitments
    const totalCommitments = athletes.length

    // Initialize stats object
    const stats = {
      totalCommitments,
      classOf2025: 0,
      classOf2026: 0,
      divisionBreakdown: {
        D1: 0,
        D2: 0,
        D3: 0,
        NAIA: 0,
        NJCAA: 0,
      },
    }

    // Count athletes by graduation year
    athletes.forEach((athlete) => {
      if (athlete.graduationyear === 2025) {
        stats.classOf2025++
      } else if (athlete.graduationyear === 2026) {
        stats.classOf2026++
      }
    })

    // Count athletes by division - EXACT MATCH with debug page
    athletes.forEach((athlete) => {
      const division = athlete.division || ""

      // Use exact matching to match the debug page
      if (division === "NCAA Division I") {
        stats.divisionBreakdown.D1++
      } else if (division === "NCAA Division II") {
        stats.divisionBreakdown.D2++
      } else if (division === "NCAA Division III") {
        stats.divisionBreakdown.D3++
      } else if (division === "NAIA") {
        stats.divisionBreakdown.NAIA++
      } else if (division === "NJCAA") {
        stats.divisionBreakdown.NJCAA++
      }
    })

    return stats
  } catch (error) {
    console.error("Error fetching direct stats:", error)
    return getDefaultStats()
  }
}

function getDefaultStats() {
  return {
    totalCommitments: 0,
    classOf2025: 0,
    classOf2026: 0,
    divisionBreakdown: {
      D1: 0,
      D2: 0,
      D3: 0,
      NAIA: 0,
      NJCAA: 0,
    },
  }
}

function createClient() {
  return supabase
}
