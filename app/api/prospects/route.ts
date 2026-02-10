import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    // NOTE: service role client path avoids RLS policies that still reference legacy columns
    // Keep this temporary until the DB policy is updated to drop athletes.state_results references
    const { searchParams } = new URL(request.url)

    console.log("[v0] Prospects API - Request received")

    // Get query parameters
    const graduationYear = searchParams.get("graduationYear")
    const gender = searchParams.get("gender")
    const division = searchParams.get("division")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    console.log("[v0] Prospects API - Filters:", { graduationYear, gender, division, limit, offset })

    // division removed: now on colleges table (college_id -> colleges.division)
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
        state,
        wrestlingClub,
        college,
        college_id,
        photourl,
        achievements,
        bio,
        location,
        prospect_ranking,
        rankings,
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

    // Public Athlete Profiles directory shows all athletes; no profile_verified filter
    // (Most rows have profile_verified = false from default, which would hide 100s of athletes)

    // Note: NC filtering is handled client-side in the prospects page
    console.log("[v0] Prospects API - Returning all prospects (NC filtering handled client-side)")

    // Apply filters - match admin prospects API pattern
    if (graduationYear && graduationYear !== "all") {
      query = query.eq("graduationyear", Number.parseInt(graduationYear))
      console.log("[v0] Prospects API - Filtering by graduationYear:", graduationYear)
    }

    if (gender && gender !== "all") {
      query = query.eq("gender", gender === "male" ? "Male" : gender === "female" ? "Female" : gender)
      console.log("[v0] Prospects API - Filtering by gender:", gender)
    }

    // Division filter removed: athletes.division no longer exists; division is on colleges table.
    // Client can filter by college/division using college_id + colleges join if we add it later.
    if (division && division !== "all") {
      console.log("[v0] Prospects API - division filter requested but not applied (division now on colleges):", division)
    }

    const { data: prospects, error } = await query

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

    console.log("[v0] Prospects API - Query executed, results:", prospects?.length || 0)

    // Note: NC filtering is handled client-side in the prospects page
    // This allows the client to have full control over the filtering logic

    // Get total count for pagination (will be adjusted after NC filtering)
    let countQuery = supabase
      .from("athletes")
      .select("*", { count: "exact", head: true })

    if (graduationYear && graduationYear !== "all") {
      countQuery = countQuery.eq("graduationyear", Number.parseInt(graduationYear))
    }
    if (gender && gender !== "all") {
      countQuery = countQuery.eq("gender", gender === "male" ? "Male" : gender === "female" ? "Female" : gender)
    }

    const { count } = await countQuery

    console.log("[v0] Prospects API - Total count:", count)
    console.log("[v0] Prospects API - Returning prospects:", prospects?.length || 0)

    const normalized = (prospects || []).map((p: any) => ({
      ...p,
      name: p.name || [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Unknown",
    }))

    return NextResponse.json(
      {
        prospects: normalized,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: normalized.length >= limit,
        },
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
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
