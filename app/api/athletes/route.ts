import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import { normalizeCollegeToCanonical } from "@/lib/canonical-college"
import { fetchCommitmentAthletes, fetchCommitmentStats, type CommitmentAthleteFilters } from "@/lib/athletes-commitments-fetch"
import { jsonSafeClone } from "@/lib/json-safe-clone"
import { adminGate } from "@/lib/admin-gate"
import { ATHLETE_PUBLIC_COLUMNS } from "@/lib/athlete-public-columns"

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
    /*
     * Rank numbers on the commitment list, for the people entitled to them.
     *
     * These went missing when `prospect_ranking` was dropped from the list select - the column
     * is revoked for the browser key, so asking for it there took the whole page down with a
     * permissions error. The fallback read `public_rankings`, which nothing syncs: it holds no
     * 2029 at all and 83 rows for a class published as a top 30, so the numbers were simply
     * absent. Gemma Amiott reported exactly that.
     *
     * The live board is `athletes.prospect_ranking`, readable by the service role. It is read
     * here rather than in the shared fetch so the entitlement check sits next to it: a Blue
     * family, coach or subscriber sees the numbers, and everybody else gets the same list
     * without them, which is what the paywall on the boards means.
     */
    const { viewer } = await resolveRankingViewer({ supabase, admin: createAdminClient() })
    if (canSeeProspectRanking(viewer) && athletes.length > 0) {
      const ids = athletes.map((a) => String((a as Record<string, unknown>).id)).filter(Boolean)
      const { data: ranked } = await createAdminClient()
        .from("athletes")
        .select("id, prospect_ranking, graduationyear")
        .in("id", ids)
        .not("prospect_ranking", "is", null)
      const rankById = new Map(
        (ranked ?? [])
          // Only classes actually released; an unreleased board must not leak through this list.
          .filter((r) => isPublicRankingsYearPublished(Number(r.graduationyear)))
          .map((r) => [String(r.id), Number(r.prospect_ranking)]),
      )
      for (const athlete of athletes as Array<Record<string, unknown>>) {
        const rank = rankById.get(String(athlete.id))
        if (rank != null) athlete.prospect_ranking = rank
      }
    }

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
  const denied = await adminGate()
  if (denied) return denied

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

    const { data, error } = await supabase.from("athletes").insert([athleteData]).select(ATHLETE_PUBLIC_COLUMNS)

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
