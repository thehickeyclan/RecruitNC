import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    // Get total count of matches
    const { count: totalMatches, error: countError } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })

    if (countError) {
      console.error("Error counting matches:", countError)
      return NextResponse.json({
        success: false,
        error: "Failed to count matches",
        details: countError,
      })
    }

    // Get sample matches to see structure
    const { data: sampleMatches, error: sampleError } = await supabase.from("matches").select("*").limit(10)

    if (sampleError) {
      console.error("Error fetching sample matches:", sampleError)
      return NextResponse.json({
        success: false,
        error: "Failed to fetch sample matches",
        details: sampleError,
      })
    }

    // Get table structure by examining the first row
    const tableStructure = sampleMatches && sampleMatches.length > 0 ? Object.keys(sampleMatches[0]) : []

    // Search specifically for Liam Hickey matches using different strategies
    const liamSearchResults = []

    // Strategy 1: Exact name match
    const { data: exactMatches, error: exactError } = await supabase
      .from("matches")
      .select("*")
      .eq("first_name", "Liam")
      .eq("last_name", "Hickey")

    if (!exactError && exactMatches) {
      liamSearchResults.push({ strategy: "Exact name", count: exactMatches.length, matches: exactMatches })
    } else if (exactError) {
      liamSearchResults.push({ strategy: "Exact name", count: 0, error: exactError.message, matches: [] })
    }

    // Strategy 2: wrestler_id pattern (only if column exists)
    if (tableStructure.includes("wrestler_id")) {
      const { data: wrestlerIdMatches, error: wrestlerIdError } = await supabase
        .from("matches")
        .select("*")
        .ilike("wrestler_id", "liam_hickey%")

      if (!wrestlerIdError && wrestlerIdMatches) {
        liamSearchResults.push({
          strategy: "Wrestler ID pattern",
          count: wrestlerIdMatches.length,
          matches: wrestlerIdMatches,
        })
      } else if (wrestlerIdError) {
        liamSearchResults.push({
          strategy: "Wrestler ID pattern",
          count: 0,
          error: wrestlerIdError.message,
          matches: [],
        })
      }
    } else {
      liamSearchResults.push({
        strategy: "Wrestler ID pattern",
        count: 0,
        error: "wrestler_id column not found",
        matches: [],
      })
    }

    // Strategy 3: Case insensitive
    const { data: iLikeMatches, error: iLikeError } = await supabase
      .from("matches")
      .select("*")
      .ilike("first_name", "liam")
      .ilike("last_name", "hickey")

    if (!iLikeError && iLikeMatches) {
      liamSearchResults.push({ strategy: "Case insensitive", count: iLikeMatches.length, matches: iLikeMatches })
    } else if (iLikeError) {
      liamSearchResults.push({ strategy: "Case insensitive", count: 0, error: iLikeError.message, matches: [] })
    }

    // Strategy 4: Broad search
    const { data: broadMatches, error: broadError } = await supabase
      .from("matches")
      .select("*")
      .or("first_name.ilike.%liam%,last_name.ilike.%hickey%")

    if (!broadError && broadMatches) {
      liamSearchResults.push({ strategy: "Broad search", count: broadMatches.length, matches: broadMatches })
    } else if (broadError) {
      liamSearchResults.push({ strategy: "Broad search", count: 0, error: broadError.message, matches: [] })
    }

    // Get all unique wrestler names to see what's available
    const { data: uniqueNames, error: namesError } = await supabase
      .from("matches")
      .select("first_name, last_name, wrestler_id")
      .limit(50)

    const uniqueWrestlerNames = uniqueNames
      ? [
          ...new Set(
            uniqueNames.map((match) => `${match.first_name} ${match.last_name} (${match.wrestler_id || "N/A"})`),
          ),
        ].slice(0, 20)
      : []

    // Combine all Liam matches
    const allLiamMatches = liamSearchResults.reduce((acc, result) => {
      return [...acc, ...result.matches]
    }, [])

    // Remove duplicates
    const uniqueLiamMatches = allLiamMatches.filter(
      (match, index, self) => index === self.findIndex((m) => m.id === match.id),
    )

    return NextResponse.json({
      success: true,
      totalMatches: totalMatches || 0,
      sampleMatches: sampleMatches || [],
      tableStructure,
      liamSearchResults,
      liamMatches: uniqueLiamMatches,
      uniqueWrestlerNames,
    })
  } catch (error) {
    console.error("Error in matches check:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error,
    })
  }
}
