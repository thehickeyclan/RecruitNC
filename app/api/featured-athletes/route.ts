import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCollegesByIds } from "@/lib/colleges"
import { jsonSafeClone } from "@/lib/json-safe-clone"

export const dynamic = "force-dynamic"
export const revalidate = 60 // Cache for 60 seconds

async function safeSupabaseQuery(queryFn: () => Promise<any>, context: string) {
  try {
    const result = await queryFn()
    return { data: result.data, error: result.error, success: true }
  } catch (error) {
    console.error(`❌ ${context}: Supabase query error:`, error)

    if (error instanceof SyntaxError && error.message.includes("Unexpected token")) {
      return {
        data: null,
        error: "Rate limit exceeded",
        success: false,
        isRateLimit: true,
      }
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
      success: false,
    }
  }
}

/** Add division from colleges table; rawRows have college_id, mappedAthletes get division set by id. */
async function attachDivision(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  rawRows: any[],
  mappedAthletes: any[],
) {
  const idToCollegeId = new Map<string, string>()
  rawRows.forEach((r) => {
    if (r.id != null && r.college_id) idToCollegeId.set(String(r.id), r.college_id)
  })
  const collegeIds = [...new Set(idToCollegeId.values())]
  const collegesMap = collegeIds.length ? await getCollegesByIds(supabase, collegeIds) : new Map()
  mappedAthletes.forEach((a) => {
    const cid = idToCollegeId.get(String(a.id))
    const c = cid ? collegesMap.get(cid) : null
    a.division = c?.division ?? ""
  })
  return mappedAthletes
}

/** Pass through NHSCA/Super32 placements only (honor chips — no win–loss records). */
function honorSourceFieldsFromRow(athlete: Record<string, unknown>) {
  return {
    nhsca_2023_placement: athlete.nhsca_2023_placement ?? undefined,
    nhsca_2024_placement: athlete.nhsca_2024_placement ?? undefined,
    nhsca_2025_placement: athlete.nhsca_2025_placement ?? undefined,
    super_32_2023_placement: athlete.super_32_2023_placement ?? undefined,
    super_32_2024_placement: athlete.super_32_2024_placement ?? undefined,
    super_32_2025_placement: athlete.super_32_2025_placement ?? undefined,
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()
    let recentCommitmentAthletes: any[] = []

    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get("year")
    const targetYear = yearParam ? Number.parseInt(yearParam) : 2026

    if (targetYear === 2025) {
      console.log("🔍 Featured Athletes API: Fetching specific 2025 athletes (Liam Hickey, Anna Ockerman, Colt Campbell)")

      // For 2025, skip recent commitments and go straight to specific athletes
      const specificNamesResult = await safeSupabaseQuery(
        () =>
          supabase
            .from("athletes")
            .select("*")
            .eq("graduationyear", 2025)
            .in("name", ["Liam Hickey", "Colt Campbell", "Anna Ockerman"])
            .order("name", { ascending: true }),
        "Featured Athletes API - Specific 2025 Athletes",
      )

      if (specificNamesResult.success && specificNamesResult.data && specificNamesResult.data.length > 0) {
        const athletes = specificNamesResult.data
        console.log(`✅ Featured Athletes API: Found ${athletes.length} specific 2025 athletes`)

        const mappedAthletes = athletes.map((athlete: any) => ({
          id: athlete.id?.toString() || "",
          name: athlete.name || "Unknown",
          highschool: athlete.highschool || "Unknown High School",
          college: athlete.college || "Unknown College",
          division: "", // filled below
          graduationyear: athlete.graduationyear || 2025,
          photourl: athlete.commitmentPhotoUrl || athlete.photourl || "/wrestler-silhouette.png",
          weightclass: athlete.weightclass || "Unknown",
          college_weight_class:
            athlete.college_weight_class != null
              ? String(athlete.college_weight_class)
              : athlete.projected_weight != null
                ? String(athlete.projected_weight)
                : null,
          projected_weight:
            athlete.projected_weight != null
              ? String(athlete.projected_weight)
              : athlete.college_weight_class != null
                ? String(athlete.college_weight_class)
                : null,
          hs_weight_class: athlete.weightclass || "Unknown",
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
          team: athlete.team || "",
          gender: athlete.gender || "Male",
          commitment_date: athlete.commitment_date || athlete.commitmentdate || null,
          prospect_ranking: athlete.prospect_ranking ?? undefined,
          ...honorSourceFieldsFromRow(athlete),
        }))
        await attachDivision(supabase, athletes, mappedAthletes)

        // Ensure we have all 3 athletes, fill with fallbacks if needed
        const athleteNames = mappedAthletes.map(a => a.name.toLowerCase())
        const requiredNames = ["liam hickey", "anna ockerman", "colt campbell"]
        const missingNames = requiredNames.filter(name => !athleteNames.includes(name))
        
        if (missingNames.length > 0) {
          console.log(`⚠️ Featured Athletes API: Missing athletes: ${missingNames.join(", ")}`)
        }

        // Return the mapped athletes (up to 3)
        return NextResponse.json(
          jsonSafeClone({
            success: true,
            athletes: mappedAthletes.slice(0, 3),
          }),
          {
            headers: {
              "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
              "CDN-Cache-Control": "public, s-maxage=60",
              "Vercel-CDN-Cache-Control": "public, s-maxage=60",
            },
          },
        )
      }
      console.log("⚠️ Featured Athletes API: No specific 2025 athletes found in DB, using hardcoded fallbacks")
      const fallback2025Athletes = [
        {
          id: "liam-hickey-fallback",
          name: "Liam Hickey",
          highschool: "Cardinal Gibbons",
          college: "UNC Chapel Hill",
          graduationyear: 2025,
          photourl: "/wrestler-liam-hickey.png",
          weightclass: "165",
          college_weight_class: "165",
          projected_weight: "165",
          hs_weight_class: "165",
          wrestlingclub: "NC United",
          club: "NC United",
          wrestlingClub: "NC United",
          achievements: ["State Champion", "NHSCA All-American"],
          team: "",
          gender: "Male",
        },
        {
          id: "anna-ockerman-fallback",
          name: "Anna Ockerman",
          highschool: "Laney High School",
          college: "Appalachian State",
          graduationyear: 2025,
          photourl: "/wrestler-anna-ockerman.png",
          weightclass: "120",
          college_weight_class: "120",
          projected_weight: "120",
          hs_weight_class: "120",
          wrestlingclub: "NC United",
          club: "NC United",
          wrestlingClub: "NC United",
          achievements: ["State Champion", "National Placer"],
          team: "",
          gender: "Female",
        },
        {
          id: "colt-campbell-fallback",
          name: "Colt Campbell",
          highschool: "Hough High School",
          college: "Campbell University",
          graduationyear: 2025,
          photourl: "/wrestler-Colt-Campbell.png",
          weightclass: "165",
          college_weight_class: "165",
          projected_weight: "165",
          hs_weight_class: "165",
          wrestlingclub: "NC United",
          club: "NC United",
          wrestlingClub: "NC United",
          achievements: ["State Placer", "Regional Champion"],
          team: "",
          gender: "Male",
        },
      ]

      return NextResponse.json(
        {
          success: true,
          athletes: fallback2025Athletes,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
            "CDN-Cache-Control": "public, s-maxage=60",
            "Vercel-CDN-Cache-Control": "public, s-maxage=60",
          },
        },
      )
    }

    // Latest commitments: Get ALL athletes with colleges, sort by most recent commitment/update
    const recentCommitmentsResult = await safeSupabaseQuery(
      () =>
        supabase
          .from("athletes")
          .select("*")
          .not("college", "is", null)
          .neq("college", "")
          .limit(500),
      "Featured Athletes API - Recent Commitments",
    )

    if (recentCommitmentsResult.success && Array.isArray(recentCommitmentsResult.data) && recentCommitmentsResult.data.length > 0) {
      const sortedCommitments = recentCommitmentsResult.data
        .sort((a: any, b: any) => {
          const dateA = new Date(a.commitment_date || a.commitmentdate || a.updated_at || 0).getTime()
          const dateB = new Date(b.commitment_date || b.commitmentdate || b.updated_at || 0).getTime()
          return dateB - dateA
        })
        .slice(0, 3)

      recentCommitmentAthletes = sortedCommitments.map((athlete: any) => ({
        id: athlete.id?.toString() || "",
        name: athlete.name || "Unknown",
        highschool: athlete.highschool || "Unknown High School",
        college: athlete.college || "Unknown College",
        division: "",
        graduationyear: athlete.graduationyear || targetYear,
        photourl: athlete.commitmentPhotoUrl || athlete.photourl || "/wrestler-silhouette.png",
        weightclass: athlete.weightclass || "Unknown",
        college_weight_class:
          athlete.college_weight_class != null
            ? String(athlete.college_weight_class)
            : athlete.projected_weight != null
              ? String(athlete.projected_weight)
              : null,
        projected_weight:
          athlete.projected_weight != null
            ? String(athlete.projected_weight)
            : athlete.college_weight_class != null
              ? String(athlete.college_weight_class)
              : null,
        hs_weight_class: athlete.weightclass || "Unknown",
        wrestlingclub: athlete.wrestlingClub || athlete.wrestlingclub || "",
        club: athlete.wrestlingClub || athlete.wrestlingclub || "",
        wrestlingClub: athlete.wrestlingClub || athlete.wrestlingclub || "",
        achievements: Array.isArray(athlete.achievements)
          ? athlete.achievements
          : typeof athlete.achievements === "string"
            ? athlete.achievements
                .split(",")
                .map((a: string) => a.trim())
                .filter(Boolean)
            : [],
        team: athlete.team || "",
        gender: athlete.gender || "Male",
        commitment_date: athlete.commitment_date || athlete.commitmentdate || athlete.updated_at || null,
        prospect_ranking: athlete.prospect_ranking ?? undefined,
        ...honorSourceFieldsFromRow(athlete),
      }))
      await attachDivision(supabase, sortedCommitments, recentCommitmentAthletes)

      if (recentCommitmentAthletes.length > 0) {
        return NextResponse.json(
          jsonSafeClone({
            success: true,
            athletes: recentCommitmentAthletes,
          }),
          {
            headers: {
              "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
              "CDN-Cache-Control": "public, s-maxage=60",
              "Vercel-CDN-Cache-Control": "public, s-maxage=60",
            },
          },
        )
      }
    }

    console.log(`🔍 Featured Athletes API: Querying for top ranked ${targetYear} prospects`)

    const specificResult = await safeSupabaseQuery(
      () =>
        supabase
          .from("athletes")
          .select("*")
          .eq("graduationyear", targetYear)
          .not("prospect_ranking", "is", null)
          .order("prospect_ranking", { ascending: true })
          .limit(3),
      `Featured Athletes API - Top ${targetYear} Prospects`,
    )

    if (!specificResult.success) {
      if (specificResult.isRateLimit) {
        return NextResponse.json({
          success: false,
          error: "Database is temporarily busy. Please try again in a moment.",
          athletes: [],
        })
      }

      console.error("❌ Featured Athletes API: Error fetching specific athletes:", specificResult.error)
    }

    let athletes = specificResult.data || []

    // No fallback needed - if we don't have 3 ranked prospects, just return what we have

    console.log(`✅ Featured Athletes API: Found ${athletes.length} athletes`)

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({
        success: true,
        athletes: [],
        message: "No featured athletes found",
      })
    }

    const validAthletes = athletes.filter((athlete) => athlete && typeof athlete === "object")

    const mappedAthletes = validAthletes.map((athlete: any) => ({
      id: athlete.id?.toString() || "",
      name: athlete.name || "Unknown",
      highschool: athlete.highschool || "Unknown High School",
      college: athlete.college || "Unknown College",
      division: "",
      graduationyear: athlete.graduationyear || targetYear,
      photourl: athlete.commitmentPhotoUrl || athlete.photourl || "/wrestler-silhouette.png",
      weightclass: athlete.weightclass || "Unknown",
      college_weight_class: athlete.college_weight_class ?? athlete.projected_weight ?? null,
      projected_weight: athlete.projected_weight ?? athlete.college_weight_class ?? null,
      hs_weight_class: athlete.weightclass || "Unknown",
      wrestlingclub: athlete.wrestlingClub || "",
      club: athlete.wrestlingClub || "",
      wrestlingClub: athlete.wrestlingClub || "",
      achievements: Array.isArray(athlete.achievements)
        ? athlete.achievements
        : typeof athlete.achievements === "string"
          ? athlete.achievements.split(",").map((a) => a.trim()).filter(Boolean)
          : [],
      team: athlete.team || "",
      gender: athlete.gender || "Male",
      commitment_date: athlete.commitment_date || athlete.commitmentdate || null,
      prospect_ranking: athlete.prospect_ranking ?? undefined,
      ...honorSourceFieldsFromRow(athlete),
    }))
    await attachDivision(supabase, validAthletes, mappedAthletes)

    console.log(`✅ Featured Athletes API: Successfully mapped ${mappedAthletes.length} athletes`)
    console.log("[v0] ===== API RESPONSE DEBUG =====")
    try {
      console.log(
        "[v0] First athlete in response:",
        JSON.stringify(mappedAthletes[0], (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2),
      )
    } catch {
      console.log("[v0] First athlete in response: [omit — not JSON-safe]")
    }
    console.log("[v0] ===== API RESPONSE DEBUG END =====")

    // Only use rankings as fallback if no recent commitments are available
    // This prevents mixing ranked prospects with actual latest commitments
    const finalAthletes = recentCommitmentAthletes.length > 0 
      ? recentCommitmentAthletes 
      : mappedAthletes

    return NextResponse.json(
      jsonSafeClone({
        success: true,
        athletes: finalAthletes.slice(0, 3),
      }),
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          "CDN-Cache-Control": "public, s-maxage=60",
          "Vercel-CDN-Cache-Control": "public, s-maxage=60",
        },
      },
    )
  } catch (error) {
    console.error("💥 Featured Athletes API: Unexpected error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)

    return NextResponse.json({
      success: false,
      error: errorMessage.includes("Too Many")
        ? "Rate limit exceeded. Please try again in a moment."
        : "Failed to fetch featured athletes. Please try again later.",
      athletes: [],
    })
  }
}
