import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getNHSCAForAthlete } from "@/lib/athlete-nhsca"

/** One huge query (e.g. limit=5000) times out Supabase / edge — cap per request; client pages in chunks. */
const MAX_LIMIT = 500

export const dynamic = "force-dynamic"
export const maxDuration = 60

/** Directory list columns only — omit `bio` and other large fields to cut bytes and DB work (fixes timeouts). */
const PROSPECT_LIST_COLUMNS = `
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
        wrestling_name,
        college,
        college_id,
        photourl,
        achievements,
        location,
        prospect_ranking,
        rankings,
        recruiting_status,
        academic_gpa,
        nationally_ranked_wins,
        nhsca_results,
        nhsca_2024_record,
        nhsca_2024_placement,
        nhsca_2025_record,
        nhsca_2025_placement,
        nhsca_2023_record,
        nhsca_2023_placement,
        super_32_2024_record,
        super_32_2024_placement,
        super_32_2025_record,
        super_32_2025_placement,
        super_32_2023_record,
        super_32_2023_placement
      `

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
    const includeCount =
      searchParams.get("includeCount") === "1" || searchParams.get("includeCount") === "true"
    const rawLimit = Number.parseInt(searchParams.get("limit") || "100", 10)
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT) : 100

    console.log("[v0] Prospects API - Filters:", { graduationYear, gender, division, limit, offset })

    // division removed: now on colleges table (college_id -> colleges.division)
    let query = supabase.from("athletes").select(PROSPECT_LIST_COLUMNS)
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

    // Default: no exact count — doubles Supabase work and is unused by /prospects/all (chunked fetch).
    // Pass includeCount=true if you need pagination.total.
    let listResult = await query
    let count: number | null = null
    if (includeCount) {
      let countQuery = supabase.from("athletes").select("*", { count: "exact", head: true })
      if (graduationYear && graduationYear !== "all") {
        countQuery = countQuery.eq("graduationyear", Number.parseInt(graduationYear))
      }
      if (gender && gender !== "all") {
        countQuery = countQuery.eq("gender", gender === "male" ? "Male" : gender === "female" ? "Female" : gender)
      }
      const countResult = await countQuery
      if (countResult.error) {
        console.warn("[v0] Prospects API - Count query error:", countResult.error.message)
      } else {
        count = countResult.count
      }
    }

    const { data: prospects, error } = listResult

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

    console.log("[v0] Prospects API - Total count:", count ?? "(skipped)")
    console.log("[v0] Prospects API - Returning prospects:", prospects?.length || 0)

    const normalized = await Promise.all(
      (prospects || []).map(async (p: Record<string, unknown>) => {
        const displayName = (p.name as string) || [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Unknown"
        let nhscaMerged: Awaited<ReturnType<typeof getNHSCAForAthlete>> = []
        try {
          nhscaMerged = await getNHSCAForAthlete(supabase, { ...p, name: displayName })
        } catch {
          nhscaMerged = []
        }
        const nhsca_results = nhscaMerged.map((r) => ({
          year: r.year,
          placement: r.placement,
          record: r.record,
          weight: r.weight,
          division: r.division,
          text: `${r.year} ${[r.placement, r.record].filter(Boolean).join(" ").trim()}`.trim(),
        }))
        const nhsca_record_display =
          nhsca_results.length > 0
            ? nhsca_results
                .map(
                  (r) =>
                    `${r.year}: ${r.placement || "—"}${r.record ? ` (${r.record})` : ""}${r.division ? ` • ${r.division}` : ""}`,
                )
                .join("; ")
            : null
        return {
          ...p,
          name: displayName,
          nhsca_results,
          nhsca_record_display,
        }
      }),
    )

    return NextResponse.json(
      {
        prospects: normalized,
        pagination: {
          total: count ?? 0,
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
