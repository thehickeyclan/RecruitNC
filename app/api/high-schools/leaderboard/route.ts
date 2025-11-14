import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get("metric") || "total_commits"
    const gender = searchParams.get("gender") || "all"
    const year = searchParams.get("year") || "all"

    console.log(`Leaderboard API called with: metric=${metric}, gender=${gender}, year=${year}`)

    let query = supabase
      .from("athletes")
      .select("highschool, college, gender, graduationyear, commitmentdate, rankings")
      .not("highschool", "is", null)
      .not("college", "is", null)
      .not("commitmentdate", "is", null) // Only include athletes with commitment dates
      .neq("college", "") // Exclude athletes with empty college field
      .neq("college", "Uncommitted") // Exclude athletes with Uncommitted college
      .neq("college", "TBD") // Exclude athletes with TBD college

    // Apply gender filter with case-insensitive matching
    if (gender !== "all") {
      if (gender === "male") {
        query = query.or("gender.ilike.male,gender.ilike.m,gender.ilike.men")
      } else if (gender === "female") {
        query = query.or("gender.ilike.female,gender.ilike.f,gender.ilike.women")
      }
    }

    // Apply year filter
    if (year !== "all") {
      query = query.eq("graduationyear", Number.parseInt(year))
    }

    const { data: athletes, error } = await query

    if (error) {
      console.error("Supabase query error:", error)
      return NextResponse.json(
        {
          error: "Failed to fetch athlete data",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log(`Leaderboard API found ${athletes?.length || 0} athletes`)

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({
        schools: [],
        total: 0,
        message: "No athlete data found for the selected filters",
      })
    }

    // Process athlete data to create school statistics
    const schoolStats = new Map<
      string,
      {
        school_name: string
        total_commits: number
        d1_commits: number
        d2_commits: number
        d3_commits: number
        naia_commits: number
        recent_commits: number
        ranked_commits: number
        male_commits: number
        female_commits: number
      }
    >()

    const currentYear = new Date().getFullYear()
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(currentYear - 1)

    athletes.forEach((athlete) => {
      const schoolName = athlete.highschool
      if (!schoolName) return

      const normalizedSchoolName = schoolName.toLowerCase().trim()

      // Find existing school entry using partial matching
      let existingSchool = null
      let existingKey = null

      for (const [key, stats] of schoolStats.entries()) {
        if (normalizedSchoolName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedSchoolName)) {
          existingSchool = stats
          existingKey = key
          break
        }
      }

      // Use the first occurrence as the canonical name
      const canonicalName = existingKey || schoolName

      if (!schoolStats.has(canonicalName)) {
        schoolStats.set(canonicalName, {
          school_name: canonicalName,
          total_commits: 0,
          d1_commits: 0,
          d2_commits: 0,
          d3_commits: 0,
          naia_commits: 0,
          recent_commits: 0,
          ranked_commits: 0,
          male_commits: 0,
          female_commits: 0,
        })
      }

      const stats = schoolStats.get(canonicalName)!
      stats.total_commits++

      // Track gender-specific commits with case-insensitive matching
      const athleteGender = athlete.gender?.toLowerCase()
      if (athleteGender === "male" || athleteGender === "m" || athleteGender === "men") {
        stats.male_commits++
      } else if (athleteGender === "female" || athleteGender === "f" || athleteGender === "women") {
        stats.female_commits++
      }

      // Enhanced D1 detection with more colleges
      const college = athlete.college?.toLowerCase() || ""
      if (
        college.includes("duke") ||
        college.includes("nc state") ||
        college.includes("unc") ||
        college.includes("virginia tech") ||
        college.includes("penn state") ||
        college.includes("iowa") ||
        college.includes("ohio state") ||
        college.includes("michigan") ||
        college.includes("wisconsin") ||
        college.includes("minnesota") ||
        college.includes("oklahoma state") ||
        college.includes("nebraska") ||
        college.includes("northwestern") ||
        college.includes("purdue") ||
        college.includes("rutgers") ||
        college.includes("maryland") ||
        college.includes("illinois") ||
        college.includes("indiana") ||
        college.includes("michigan state") ||
        college.includes("stanford") ||
        college.includes("arizona state") ||
        college.includes("oregon state") ||
        college.includes("cal poly") ||
        college.includes("fresno state") ||
        college.includes("wyoming") ||
        college.includes("air force") ||
        college.includes("navy") ||
        college.includes("army")
      ) {
        stats.d1_commits++
      }

      // Track recent commits (last 12 months)
      if (athlete.commitmentdate) {
        const commitDate = new Date(athlete.commitmentdate)
        if (commitDate >= oneYearAgo) {
          stats.recent_commits++
        }
      }

      // Track ranked commits (athletes with rankings data)
      if (athlete.rankings && typeof athlete.rankings === "object" && Object.keys(athlete.rankings).length > 0) {
        stats.ranked_commits++
      }
    })

    const schoolNames = Array.from(schoolStats.keys())
    let logoMappings: any[] = []

    if (schoolNames.length > 0) {
      const { data: allLogos, error: logoError } = await supabase
        .from("logo_mappings")
        .select("entity_name, logo_url, aliases")
        .eq("entity_type", "highschool")

      if (logoError) {
        console.warn("Logo mappings query error:", logoError)
      } else {
        logoMappings = allLogos || []
        console.log(`Found ${logoMappings.length} high school logo mappings`)
      }
    }

    // Enhanced logo matching with better normalization
    const schoolsWithLogos = Array.from(schoolStats.values()).map((school) => {
      const schoolNameLower = school.school_name.toLowerCase()
      const schoolNameNormalized = schoolNameLower
        .replace(/\b(high|school|hs)\b/g, "")
        .replace(/[^\w\s]/g, "")
        .trim()

      const logoMapping = logoMappings.find((logo) => {
        const logoNameLower = logo.entity_name.toLowerCase()
        const logoNameNormalized = logoNameLower
          .replace(/\b(high|school|hs)\b/g, "")
          .replace(/[^\w\s]/g, "")
          .trim()

        // Exact match
        if (logoNameLower === schoolNameLower) return true

        // Normalized match
        if (logoNameNormalized === schoolNameNormalized) return true

        // Partial match (either direction)
        if (schoolNameLower.includes(logoNameLower) || logoNameLower.includes(schoolNameLower)) return true
        if (schoolNameNormalized.includes(logoNameNormalized) || logoNameNormalized.includes(schoolNameNormalized))
          return true

        // Alias matching
        if (logo.aliases) {
          const aliases = logo.aliases
            .toLowerCase()
            .split(",")
            .map((a: string) => a.trim())

          if (
            aliases.some(
              (alias: string) =>
                alias === schoolNameLower ||
                alias === schoolNameNormalized ||
                schoolNameLower.includes(alias) ||
                schoolNameNormalized.includes(alias) ||
                alias.includes(schoolNameNormalized),
            )
          )
            return true
        }

        return false
      })

      if (!logoMapping) {
        console.log(`No logo found for school: "${school.school_name}"`)
      } else {
        console.log(`Logo found for school: "${school.school_name}" -> ${logoMapping.logo_url}`)
      }

      return {
        ...school,
        logo_url: logoMapping?.logo_url || null,
      }
    })

    // Sort schools by selected metric
    const sortedSchools = [...schoolsWithLogos]

    switch (metric) {
      case "d1_commits":
        sortedSchools.sort((a, b) => b.d1_commits - a.d1_commits)
        break
      case "recent_commits":
        sortedSchools.sort((a, b) => b.recent_commits - a.recent_commits)
        break
      case "ranked_commits":
        sortedSchools.sort((a, b) => b.ranked_commits - a.ranked_commits)
        break
      case "emerging_programs":
        sortedSchools.sort((a, b) => b.female_commits - a.female_commits)
        break
      default: // total_commits
        if (gender === "male") {
          sortedSchools.sort((a, b) => b.male_commits - a.male_commits)
        } else if (gender === "female") {
          sortedSchools.sort((a, b) => b.female_commits - a.female_commits)
        } else {
          sortedSchools.sort((a, b) => b.total_commits - a.total_commits)
        }
    }

    console.log(`Leaderboard API returning ${sortedSchools.length} schools`)

    return NextResponse.json(
      {
        schools: sortedSchools,
        total: sortedSchools.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
          "CDN-Cache-Control": "public, s-maxage=900",
          "Vercel-CDN-Cache-Control": "public, s-maxage=900",
        },
      },
    )
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
