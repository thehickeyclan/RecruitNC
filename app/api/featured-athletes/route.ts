import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

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

export async function GET(request: Request) {
  try {
    // Use admin client to bypass RLS for public featured athletes endpoint
    const supabase = createAdminClient()
    
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

        const mappedAthletes = athletes.map((athlete) => ({
          id: athlete.id?.toString() || "",
          name: athlete.name || "Unknown",
          highschool: athlete.highschool || "Unknown High School",
          college: athlete.college || "Unknown College",
          division: athlete.division || "Unknown Division",
          graduationyear: athlete.graduationyear || 2025,
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
              ? athlete.achievements
                  .split(",")
                  .map((a) => a.trim())
                  .filter(Boolean)
              : [],
          team: athlete.team || "",
          gender: athlete.gender || "Male",
          commitment_date: athlete.commitment_date || athlete.commitmentdate || null,
        }))

        // Ensure we have all 3 athletes, fill with fallbacks if needed
        const athleteNames = mappedAthletes.map(a => a.name.toLowerCase())
        const requiredNames = ["liam hickey", "anna ockerman", "colt campbell"]
        const missingNames = requiredNames.filter(name => !athleteNames.includes(name))
        
        if (missingNames.length > 0) {
          console.log(`⚠️ Featured Athletes API: Missing athletes: ${missingNames.join(", ")}`)
        }

        // Return the mapped athletes (up to 3)
        return NextResponse.json(
          {
            success: true,
            athletes: mappedAthletes.slice(0, 3),
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
      // If we didn't find them in the database, fall back to hardcoded data
      console.log("⚠️ Featured Athletes API: No specific 2025 athletes found in DB, using hardcoded fallbacks")

      const fallback2025Athletes = [
        {
          id: "liam-hickey-fallback",
          name: "Liam Hickey",
          highschool: "Cardinal Gibbons",
          college: "UNC Chapel Hill",
          division: "NCAA Division I",
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
          division: "NCAA Division I",
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
          division: "NCAA Division I",
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

    console.log(`🔍 Featured Athletes API: Starting fetch for year ${targetYear}`)

    // For 2026+ first attempt: latest commitments across all classes
    // Fetch ALL matching athletes, then sort in JavaScript to ensure we get top 3
    const recentCommitmentsResult = await safeSupabaseQuery(
      () =>
        supabase
          .from("athletes")
          .select("*")
          .not("college", "is", null)
          .neq("college", "")
          .gte("graduationyear", new Date().getFullYear() + 1) // Filter 2026+ at query level
          .limit(500), // Fetch a large number to ensure we have enough to sort
      "Featured Athletes API - Recent Commitments",
    )

    let recentCommitmentAthletes: any[] = []

    if (recentCommitmentsResult.success && Array.isArray(recentCommitmentsResult.data) && recentCommitmentsResult.data.length > 0) {
      console.log(`📊 Featured Athletes API: Raw query returned ${recentCommitmentsResult.data.length} athletes`)
      
      const sortedCommitments = recentCommitmentsResult.data
        .filter((athlete: any) => {
          // Filter out 2025 and earlier (double-check even though we filtered in query)
          const gradYear = athlete.graduationyear || 0
          const currentYear = new Date().getFullYear()
          return gradYear >= currentYear + 1
        })
        .sort((a: any, b: any) => {
          // Sort by commitment_date if available, otherwise by updated_at
          const dateA = new Date(a.commitment_date || a.commitmentdate || a.updated_at || 0).getTime()
          const dateB = new Date(b.commitment_date || b.commitmentdate || b.updated_at || 0).getTime()
          return dateB - dateA
        })
        .slice(0, 3) // Take top 3 most recent

      console.log(`📊 Featured Athletes API: After filtering and sorting, found ${sortedCommitments.length} recent commits`)
      console.log(`📊 Featured Athletes API: Athlete names: ${sortedCommitments.map((a: any) => a.name).join(", ")}`)

      recentCommitmentAthletes = sortedCommitments.map((athlete: any) => ({
        id: athlete.id?.toString() || "",
        name: athlete.name || "Unknown",
        highschool: athlete.highschool || "Unknown High School",
        college: athlete.college || "Unknown College",
        division: athlete.division || "Unknown Division",
        graduationyear: athlete.graduationyear || targetYear,
        photourl: athlete.commitmentPhotoUrl || athlete.photourl || "/wrestler-silhouette.png",
        weightclass: athlete.weightclass || "Unknown",
        college_weight_class: athlete.college_weight_class ?? athlete.projected_weight ?? null,
        projected_weight: athlete.projected_weight ?? athlete.college_weight_class ?? null,
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
      }))

      console.log(`📊 Featured Athletes API: Processed ${recentCommitmentAthletes.length} commits, returning up to 3`)
      
      if (recentCommitmentAthletes.length > 0) {
        // If we have fewer than 3, log it for debugging
        if (recentCommitmentAthletes.length < 3) {
          console.log(`⚠️ Featured Athletes API: Only found ${recentCommitmentAthletes.length} recent commits (expected 3)`)
        }
        
        console.log(`✅ Featured Athletes API: Returning ${recentCommitmentAthletes.length} recent commitments`)

        // Always return what we have (up to 3)
        return NextResponse.json(
          {
            success: true,
            athletes: recentCommitmentAthletes, // Already sliced to 3 above
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
        college_weight_class: athlete.college_weight_class ?? athlete.projected_weight ?? null, // College weight only
        projected_weight: athlete.projected_weight ?? athlete.college_weight_class ?? null,
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
      }
    })

    console.log(`✅ Featured Athletes API: Successfully mapped ${mappedAthletes.length} athletes`)
    console.log("[v0] ===== API RESPONSE DEBUG =====")
    console.log("[v0] First athlete in response:", JSON.stringify(mappedAthletes[0], null, 2))
    console.log("[v0] ===== API RESPONSE DEBUG END =====")

    // Only use rankings as fallback if no recent commitments are available
    // This prevents mixing ranked prospects with actual latest commitments
    const finalAthletes = recentCommitmentAthletes.length > 0 
      ? recentCommitmentAthletes 
      : mappedAthletes

    return NextResponse.json(
      {
        success: true,
        athletes: finalAthletes.slice(0, 3),
      },
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
