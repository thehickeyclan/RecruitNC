import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    console.log("Starting SQL debug for Liam Hickey matches...")
    const supabase = createClient()

    const results: any = {
      totalMatches: 0,
      liamMatches: [],
      similarNames: [],
      sampleWrestlers: [],
      sampleData: [],
      debug: {},
    }

    // 1. Get total count of matches
    try {
      const { count, error: countError } = await supabase.from("matches").select("*", { count: "exact", head: true })

      if (countError) {
        console.error("Count error:", countError)
        results.debug.countError = countError.message
      } else {
        results.totalMatches = count || 0
        console.log(`Total matches: ${count}`)
      }
    } catch (err) {
      console.error("Count query failed:", err)
      results.debug.countError = err instanceof Error ? err.message : "Unknown error"
    }

    // 2. Get sample data to understand structure
    try {
      const { data: sampleData, error: sampleError } = await supabase
        .from("matches")
        .select("id, created_at, wrestler_id, first_name, last_name, season, matches")
        .limit(5)

      if (sampleError) {
        console.error("Sample data error:", sampleError)
        results.debug.sampleError = sampleError.message
      } else if (sampleData) {
        results.sampleData = sampleData.map((record) => ({
          id: record.id,
          created_at: record.created_at,
          wrestler_id: record.wrestler_id,
          first_name: record.first_name,
          last_name: record.last_name,
          season: record.season,
          matches_count: Array.isArray(record.matches) ? record.matches.length : 0,
          matches_preview: JSON.stringify(record.matches).substring(0, 200) + "...",
        }))
        console.log(`Sample data retrieved: ${sampleData.length} records`)
      }
    } catch (err) {
      console.error("Sample data query failed:", err)
      results.debug.sampleError = err instanceof Error ? err.message : "Unknown error"
    }

    // 3. Search for Liam Hickey specifically
    try {
      const { data: liamMatches, error: liamError } = await supabase
        .from("matches")
        .select("*")
        .ilike("first_name", "%liam%")
        .ilike("last_name", "%hickey%")

      if (liamError) {
        console.error("Liam search error:", liamError)
        results.debug.liamError = liamError.message
      } else if (liamMatches) {
        results.liamMatches = liamMatches.map((match) => ({
          id: match.id,
          wrestler_id: match.wrestler_id,
          first_name: match.first_name,
          last_name: match.last_name,
          season: match.season,
          grade: match.grade,
          high_school: match.high_school,
          total_matches: match.total_matches,
          wins: match.wins,
          losses: match.losses,
          pins: match.pins,
          matches_data: match.matches,
        }))
        console.log(`Found ${liamMatches.length} Liam Hickey matches`)
      }
    } catch (err) {
      console.error("Liam search failed:", err)
      results.debug.liamError = err instanceof Error ? err.message : "Unknown error"
    }

    // 4. Search for similar names
    try {
      const { data: similarMatches, error: similarError } = await supabase
        .from("matches")
        .select("id, wrestler_id, first_name, last_name, high_school, season")
        .or("first_name.ilike.%liam%,first_name.ilike.%william%,last_name.ilike.%hickey%,last_name.ilike.%hick%")
        .limit(20)

      if (similarError) {
        console.error("Similar names error:", similarError)
        results.debug.similarError = similarError.message
      } else if (similarMatches) {
        results.similarNames = similarMatches.map((match) => ({
          full_name: `${match.first_name} ${match.last_name}`,
          high_school: match.high_school,
          season: match.season,
          wrestler_id: match.wrestler_id,
          match_id: match.id,
        }))
        console.log(`Found ${similarMatches.length} similar names`)
      }
    } catch (err) {
      console.error("Similar names search failed:", err)
      results.debug.similarError = err instanceof Error ? err.message : "Unknown error"
    }

    // 5. Get sample wrestler names
    try {
      const { data: allMatches, error: allMatchesError } = await supabase
        .from("matches")
        .select("first_name, last_name, high_school, season")
        .limit(50)

      if (allMatchesError) {
        console.error("All matches error:", allMatchesError)
        results.debug.allMatchesError = allMatchesError.message
      } else if (allMatches) {
        results.sampleWrestlers = allMatches.map((match) => ({
          full_name: `${match.first_name} ${match.last_name}`,
          high_school: match.high_school,
          season: match.season,
        }))
        console.log(`Sample wrestlers: ${allMatches.length}`)
      }
    } catch (err) {
      console.error("Sample wrestlers query failed:", err)
      results.debug.allMatchesError = err instanceof Error ? err.message : "Unknown error"
    }

    // 6. Check table structure
    try {
      const { data: tableInfo, error: tableError } = await supabase.from("matches").select("*").limit(1)

      if (!tableError && tableInfo && tableInfo.length > 0) {
        results.debug.tableStructure = Object.keys(tableInfo[0])
        results.debug.sampleRecord = tableInfo[0]
      } else if (tableError) {
        results.debug.tableError = tableError.message
      }
    } catch (err) {
      results.debug.tableError = err instanceof Error ? err.message : "Unknown error"
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("SQL Debug Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
