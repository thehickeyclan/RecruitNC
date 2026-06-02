import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { normalizeCollegeToCanonical } from "@/lib/canonical-college"
import { fetchCommitmentAthletes, fetchCommitmentStats, type CommitmentAthleteFilters } from "@/lib/athletes-commitments-fetch"
import { jsonSafeClone } from "@/lib/json-safe-clone"

export const revalidate = 120

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filters: CommitmentAthleteFilters = {
      page: Number.parseInt(searchParams.get("page") || "1", 10),
      limit: Number.parseInt(searchParams.get("limit") || "100", 10),
      year: searchParams.get("year"),
      gender: searchParams.get("gender"),
      division: searchParams.get("division"),
    }

    const includeStats = searchParams.get("includeStats") === "1"
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: "Database connection unavailable. Please try again in a moment.",
          athletes: [],
          pagination: { page: filters.page ?? 1, limit: filters.limit ?? 100, total: 0, totalPages: 0 },
        },
        { status: 503 },
      )
    }

    const athletesPromise = fetchCommitmentAthletes(supabase, filters)
    const statsPromise = includeStats ? fetchCommitmentStats(supabase, filters) : null
    const [{ athletes, total }, stats] = await Promise.all([
      athletesPromise,
      statsPromise ?? Promise.resolve(null),
    ])
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 100, 500)
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json(
      jsonSafeClone({
        success: true,
        athletes,
        ...(stats
          ? {
              stats: {
                totalCommitments: stats.total,
                total: stats.total,
                byGender: { male: stats.male, female: stats.female },
                byDivision: stats.divisions,
                divisions: stats.divisions,
              },
            }
          : {}),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }),
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      },
    )
  } catch (error) {
    console.error("[api/athletes] GET:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch athletes",
        athletes: [],
        pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

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

    const { data, error } = await supabase.from("athletes").insert([athleteData]).select()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      athlete: data[0],
    })
  } catch (error) {
    console.error("[api/athletes] POST:", error)
    return NextResponse.json({ success: false, error: "Failed to create athlete" }, { status: 500 })
  }
}
