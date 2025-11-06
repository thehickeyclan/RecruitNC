import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const revalidate = 0

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get("year")
    const targetYear = yearParam ? Number.parseInt(yearParam) : 2026

    console.log(`🔍 Featured Athletes API: Starting fetch for year ${targetYear}`)

    if (targetYear === 2025) {
      console.log("🔍 Featured Athletes API: Fetching specific 2025 athletes")

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

        const mappedAthletes = athletes.map((athlete) => ({
          id: athlete.id?.toString() || "",
          name: athlete.name || "Unknown",
          highschool: athlete.highschool || "Unknown High School",
          college: athlete.college || "Unknown College",
          division: athlete.division || "Unknown Division",
          graduationyear: athlete.graduationyear || 2025,
          photourl: athlete.photourl || "/wrestler-silhouette.png",
          weightclass: athlete.college_weight_class || athlete.weightclass || "Unknown",
          college_weight_class: athlete.college_weight_class || athlete.weightclass || "Unknown",
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
        }))

        return NextResponse.json(
          {
            success: true,
            athletes: mappedAthletes,
          },
          {
            headers: {
              "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
              "CDN-Cache-Control": "public, s-maxage=600",
              "Vercel-CDN-Cache-Control": "public, s-maxage=600",
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

    // Map the database data to the expected format
    const mappedAthletes = validAthletes.map((athlete) => {
      console.log("[v0] ===== ATHLETE DEBUG START =====")
      console.log("[v0] Athlete name:", athlete.name)
      console.log("[v0] HS weightclass from DB:", athlete.weightclass)
      console.log("[v0] College weight class from DB:", athlete.college_weight_class)
      console.log("[v0] College weight class exists?:", !!athlete.college_weight_class)
      console.log("[v0] College weight class value:", athlete.college_weight_class || "NULL/EMPTY")
      console.log("[v0] ===== ATHLETE DEBUG END =====")

      return {
        id: athlete.id?.toString() || "",
        name: athlete.name || "Unknown",
        highschool: athlete.highschool || "Unknown High School",
        college: athlete.college || "Unknown College",
        division: athlete.division || "Unknown Division",
        graduationyear: athlete.graduationyear || targetYear,
        photourl: athlete.commitmentPhotoUrl || athlete.photourl || "/wrestler-silhouette.png",
        weightclass: athlete.weightclass || "Unknown", // HS weight only
        college_weight_class: athlete.college_weight_class || null, // College weight only, no fallback
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
      }
    })

    console.log(`✅ Featured Athletes API: Successfully mapped ${mappedAthletes.length} athletes`)
    console.log("[v0] ===== API RESPONSE DEBUG =====")
    console.log("[v0] First athlete in response:", JSON.stringify(mappedAthletes[0], null, 2))
    console.log("[v0] ===== API RESPONSE DEBUG END =====")

    return NextResponse.json(
      {
        success: true,
        athletes: mappedAthletes,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
          "CDN-Cache-Control": "public, s-maxage=600",
          "Vercel-CDN-Cache-Control": "public, s-maxage=600",
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
