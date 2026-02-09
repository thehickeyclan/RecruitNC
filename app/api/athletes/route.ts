import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDivisionFilterValues } from "@/lib/division-display"
import { normalizeCollegeToCanonical } from "@/lib/canonical-college"
import { getDivisionFromMappings } from "@/lib/get-division-from-mappings"

export const dynamic = "force-dynamic"
export const revalidate = 30 // Cache for 30 seconds to reduce API calls

export async function GET(request: Request) {
  try {
    console.log("🤼 Athletes API: Starting fetch")

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "100"), 500) // Cap at 500
    const offset = (page - 1) * limit

    const yearFilter = searchParams.get("year")
    const genderFilter = searchParams.get("gender")
    const divisionFilter = searchParams.get("division")

    console.log("🤼 Athletes API: Filters applied:", { yearFilter, genderFilter, divisionFilter })

    let supabase
    try {
      supabase = await createClient()
      if (!supabase) {
        throw new Error("Failed to create Supabase client")
      }
    } catch (clientError: any) {
      console.error("❌ Athletes API: Supabase client creation failed:", clientError)
      return NextResponse.json(
        {
          success: false,
          error: "Database connection unavailable. Please try again in a moment.",
          athletes: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Content-Type": "application/json",
          },
        },
      )
    }

    let data, error, count
    try {
      // PostgreSQL .neq() doesn't match NULL values, so we need to explicitly handle them
      let query = supabase
        .from("athletes")
        .select(
          `
            id, name, highschool, college, division, 
            graduationyear, photourl, commitmentPhotoUrl,
            weightclass, wrestlingClub, 
            achievements, ncUnitedTeam, gender, commitmentdate,
            firstName, lastName
          `,
          { count: "exact" },
        )
        .not("college", "is", null)
        .neq("college", "")
        .or("is_prospect.is.null,is_prospect.eq.false")

      if (yearFilter && yearFilter !== "all") {
        query = query.eq("graduationyear", Number.parseInt(yearFilter))
        console.log(`🤼 Athletes API: Filtering by graduation year: ${yearFilter}`)
      }

      if (genderFilter && genderFilter !== "all") {
        query = query.eq("gender", genderFilter)
        console.log(`🤼 Athletes API: Filtering by gender: ${genderFilter}`)
      }

      if (divisionFilter && divisionFilter !== "all") {
        const divisionValues = getDivisionFilterValues(divisionFilter)
        if (divisionValues.length > 0) {
          query = query.in("division", divisionValues)
          console.log(`🤼 Athletes API: Filtering by division: ${divisionFilter} (matches ${divisionValues.length} values)`)
        }
      }

      const result = await Promise.race([
        query.order("commitmentdate", { ascending: false }).range(offset, offset + limit - 1),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Database query timeout")), 10000)),
      ])

      data = result.data
      error = result.error
      count = result.count
    } catch (queryError: any) {
      console.error("❌ Athletes API: Query execution failed:", queryError)

      const errorString = String(queryError?.message || queryError || "")

      if (
        errorString.includes("Too Many") ||
        errorString.includes("rate limit") ||
        errorString.includes("429") ||
        errorString.includes("timeout") ||
        queryError?.status === 429
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Database temporarily unavailable due to high traffic. Please try again in a moment.",
            athletes: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          },
          {
            status: 429,
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Retry-After": "60",
              "Content-Type": "application/json",
            },
          },
        )
      }

      if (errorString.includes("JSON") || errorString.includes("SyntaxError")) {
        return NextResponse.json(
          {
            success: false,
            error: "Database response error. Please try again in a moment.",
            athletes: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          },
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
            },
          },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Database query failed. Please try again in a moment.",
          athletes: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        },
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    if (error) {
      console.error("❌ Athletes API: Error fetching athletes:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
        athletes: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    if (!data) {
      return NextResponse.json({
        success: true,
        athletes: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    console.log(`🤼 Athletes API: Processing ${data.length} athlete records`)

    // Division only from college_division_mappings (single source of truth). Roanoke College → Roanoke → table.
    const mappedAthletes = await Promise.all(
      data.map(async (athlete) => {
        const photoUrl = athlete.commitmentPhotoUrl || athlete.photourl || "/wrestler-silhouette.png"
        const division = await getDivisionFromMappings(athlete.college ?? "") || ""

        return {
          id: athlete.id,
          name: athlete.name,
          highschool: athlete.highschool || "",
          college: athlete.college || "",
          division,
        graduationyear: athlete.graduationyear || 0,
        photourl: photoUrl,
        photoUrl: photoUrl,
        photo_url: photoUrl,
        image_url: photoUrl,
        weightclass: athlete.weightclass || "",
        wrestlingclub: athlete.wrestlingClub || "",
        club: athlete.wrestlingClub || "",
        wrestlingClub: athlete.wrestlingClub || "",
        achievements: Array.isArray(athlete.achievements)
          ? athlete.achievements
          : typeof athlete.achievements === "string"
            ? athlete.achievements
                .split(",")
                .map((a) => a.trim())
                .filter(Boolean)
            : [],
        team: athlete.ncUnitedTeam || "",
        gender: athlete.gender || "male",
        commitmentdate: athlete.commitmentdate || "",
        first_name: athlete.firstName || "",
        last_name: athlete.lastName || "",
        graduation_year: athlete.graduationyear || 0,
        weight_class: athlete.weightclass || "",
        high_school: athlete.highschool || "",
        wrestling_club: athlete.wrestlingClub || "",
        commitment_date: athlete.commitmentdate || "",
        }
      }),
    )

    console.log(`✅ Athletes API: Successfully processed ${mappedAthletes.length} athletes`)

    const totalPages = Math.ceil((count || 0) / limit)
    const response = NextResponse.json({
      success: true,
      athletes: mappedAthletes,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")

    return response
  } catch (error) {
    console.error("💥 Athletes API: Unexpected error:", error)

    const errorMessage = error instanceof Error ? error.message : String(error || "Unknown error")

    if (
      errorMessage.includes("Too Many") ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("429") ||
      errorMessage.includes("JSON") ||
      errorMessage.includes("SyntaxError")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Database temporarily unavailable due to high traffic. Please try again in a moment.",
          athletes: [],
          pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
        },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Retry-After": "60",
            "Content-Type": "application/json",
          },
        },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch athletes",
        athletes: [],
        pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}

export async function POST(request: Request) {
  try {
    console.log("[v0] Athletes API: Starting POST request")

    const supabase = await createClient()
    const body = await request.json()

    console.log("[v0] Athletes API: Received data:", body)

    // Map form data to database fields
    const athleteData = {
      firstName: body.firstName,
      lastName: body.lastName,
      highschool: body.highschool,
      graduationyear: body.graduationyear,
      gender: body.gender,
      weightclass: body.weightclass,
      wrestlingClub: body.wrestlingClub,
      photourl: body.photoUrl,
      is_prospect: body.is_prospect || false,
      recruiting_status: body.recruiting_status || "Uncommitted",
      college: normalizeCollegeToCanonical(body.college) || body.college || null,
      division: body.division || null,
      highSchoolLogoUrl: body.highSchoolDivision || body.highSchoolLogoUrl || null,
      commitmentdate: body.commitmentdate || null,
      collegeLogoUrl: body.collegeLogoUrl || null,
      academic_gpa: body.academic_gpa || null,
      academic_sat: body.academic_sat || null,
      academic_act: body.academic_act || null,
      academic_summary: body.academic_summary || null,
      achievements: body.achievements || [],
      prospect_ranking: body.prospect_ranking || null,
      prospect_notes: body.prospect_notes || null,
      super_32_2024_record: body.super_32_2024_record || null,
      super_32_2024_placement: body.super_32_2024_placement || null,
      super_32_2025_record: body.super_32_2025_record || null,
      super_32_2025_placement: body.super_32_2025_placement || null,
      super_32_2023_record: body.super_32_2023_record || null,
      super_32_2023_placement: body.super_32_2023_placement || null,
      nationally_ranked_wins: body.nationally_ranked_wins || null,
    }

    console.log("[v0] Athletes API: Mapped athlete data:", athleteData)

    const { data, error } = await supabase.from("athletes").insert([athleteData]).select()

    if (error) {
      console.error("[v0] Athletes API: Database error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    console.log("[v0] Athletes API: Successfully created athlete:", data)

    return NextResponse.json({
      success: true,
      athlete: data[0],
    })
  } catch (error) {
    console.error("[v0] Athletes API: POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to create athlete" }, { status: 500 })
  }
}
