import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    console.log("[v0] Prospects API - Request received")

    // Get query parameters
    const graduationYear = searchParams.get("graduationYear")
    const gender = searchParams.get("gender")
    const division = searchParams.get("division")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    console.log("[v0] Prospects API - Filters:", { graduationYear, gender, division, limit, offset })

    let query = supabase
      .from("athletes")
      .select(`
        id,
        name,
        firstName,
        lastName,
        graduationyear,
        gender,
        weightclass,
        weight,
        highschool,
        wrestlingClub,
        college,
        division,
        photourl,
        achievements,
        bio,
        location,
        prospect_ranking,
        recruiting_status,
        created_at,
        updated_at,
        academic_gpa,
        nationally_ranked_wins,
        college_opens_experience,
        nhsca_2024_record,
        nhsca_2024_placement,
        nhsca_2025_record,
        nhsca_2025_placement,
        super_32_2024_record,
        super_32_2024_placement,
        super_32_2025_record,
        super_32_2025_placement,
        super_32_2023_record,
        super_32_2023_placement
      `)
      .order("prospect_ranking", { ascending: true, nullsLast: true })
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply filters - match admin prospects API pattern
    if (graduationYear && graduationYear !== "all") {
      query = query.eq("graduationyear", Number.parseInt(graduationYear))
      console.log("[v0] Prospects API - Filtering by graduationYear:", graduationYear)
    }

    if (gender && gender !== "all") {
      query = query.eq("gender", gender === "male" ? "Male" : gender === "female" ? "Female" : gender)
      console.log("[v0] Prospects API - Filtering by gender:", gender)
    }

    if (division && division !== "all") {
      if (division === "DI") {
        query = query.or("division.eq.Division I,division.eq.NCAA Division I,division.eq.NCAA DI")
      } else if (division === "DII") {
        query = query.or("division.eq.Division II,division.eq.NCAA Division II,division.eq.NCAA DII")
      } else if (division === "DIII") {
        query = query.or("division.eq.Division III,division.eq.NCAA Division III,division.eq.NCAA DIII")
      } else {
        query = query.eq("division", division)
      }
      console.log("[v0] Prospects API - Filtering by division:", division)
    }

    const { data: prospects, error } = await query

    console.log("[v0] Prospects API - Query executed, results:", prospects?.length || 0)

    if (error) {
      console.error("[v0] Prospects API - Supabase error:", error)
      return NextResponse.json(
        { error: "Failed to fetch prospects", details: error.message },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      )
    }

    // Get total count for pagination
    let countQuery = supabase.from("athletes").select("*", { count: "exact", head: true })

    if (graduationYear && graduationYear !== "all") {
      countQuery = countQuery.eq("graduationyear", Number.parseInt(graduationYear))
    }
    if (gender && gender !== "all") {
      countQuery = countQuery.eq("gender", gender === "male" ? "Male" : gender === "female" ? "Female" : gender)
    }

    const { count } = await countQuery

    console.log("[v0] Prospects API - Total count:", count)
    console.log("[v0] Prospects API - Returning prospects:", prospects?.length || 0)

    return NextResponse.json(
      {
        prospects: prospects || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=900, stale-while-revalidate=1800", // 15 minutes cache
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Prospects API - Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  }
}
