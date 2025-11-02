import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function normalizeDivision(division: string | null): string {
  if (!division) return "Unknown"

  const div = division.trim()

  if (div === "DI" || div === "D1") return "NCAA Division I"

  if (div === "DII" || div === "D2") return "NCAA Division II"

  if (div === "DIII" || div === "D3") return "NCAA Division III"

  return div
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get("metric") || "total_commits"
    const gender = searchParams.get("gender") || "all"
    const year = searchParams.get("year") || "all"
    const division = searchParams.get("division") || "all"

    console.log(
      `College Leaderboard API called with: metric=${metric}, gender=${gender}, year=${year}, division=${division}`,
    )

    let query = supabase
      .from("athletes")
      .select("college, highschool, gender, graduationyear, commitmentdate, rankings, division")
      .not("college", "is", null)
      .not("highschool", "is", null)

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

    console.log(`College Leaderboard API found ${athletes?.length || 0} athletes`)

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({
        colleges: [],
        total: 0,
        message: "No athlete data found for the selected filters",
      })
    }

    // Process athlete data to create college statistics
    const collegeStats = new Map<
      string,
      {
        college_name: string
        total_commits: number
        d1_commits: number
        d2_commits: number
        d3_commits: number
        naia_commits: number
        recent_commits: number
        ranked_commits: number
        male_commits: number
        female_commits: number
        division: string
        nc_commits: number
        out_of_state_commits: number
      }
    >()

    const currentYear = new Date().getFullYear()
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(currentYear - 1)

    const { data: allLogos, error: logoError } = await supabase
      .from("logo_mappings")
      .select("entity_name, logo_url, aliases")
      .eq("entity_type", "college")

    if (logoError) {
      console.warn("College logo mappings query error:", logoError)
    }

    const logoMappings = allLogos || []
    console.log(`Found ${logoMappings.length} college logo mappings`)

    // Define NC colleges
    const ncColleges = new Set([
      "duke",
      "nc state",
      "unc",
      "wake forest",
      "davidson",
      "elon",
      "high point",
      "campbell",
      "gardner-webb",
      "western carolina",
      "east carolina",
      "appalachian state",
      "charlotte",
      "greensboro",
      "asheville",
      "wilmington",
      "pembroke",
    ])

    const findLogoMapping = (collegeName: string) => {
      const collegeNameLower = collegeName.toLowerCase()
      const collegeNameNormalized = collegeNameLower
        .replace(/\b(university|college|state|tech|of)\b/g, "")
        .replace(/[^\w\s]/g, "")
        .trim()

      const result = logoMappings.find((logo) => {
        const logoNameLower = logo.entity_name.toLowerCase()
        const logoNameNormalized = logoNameLower
          .replace(/\b(university|college|state|tech|of)\b/g, "")
          .replace(/[^\w\s]/g, "")
          .trim()

        if (logoNameLower === collegeNameLower) return true
        if (logoNameNormalized === collegeNameNormalized) return true

        const collegeVariations = [
          collegeNameLower,
          collegeNameNormalized,
          collegeNameLower.replace(/\bnc\b/g, "north carolina"),
          collegeNameLower.replace(/\bnorth carolina\b/g, "nc"),
          collegeNameLower.replace(/\bunc\b/g, "university of north carolina"),
          collegeNameLower.replace(/\buniversity of north carolina\b/g, "unc"),
          collegeNameLower.replace(/\bnc state\b/g, "north carolina state"),
          collegeNameLower.replace(/\bnorth carolina state\b/g, "nc state"),
        ]

        const logoVariations = [
          logoNameLower,
          logoNameNormalized,
          logoNameLower.replace(/\bnc\b/g, "north carolina"),
          logoNameLower.replace(/\bnorth carolina\b/g, "nc"),
          logoNameLower.replace(/\bunc\b/g, "university of north carolina"),
          logoNameLower.replace(/\buniversity of north carolina\b/g, "unc"),
          logoNameLower.replace(/\bnc state\b/g, "north carolina state"),
          logoNameLower.replace(/\bnorth carolina state\b/g, "nc state"),
        ]

        for (const collegeVar of collegeVariations) {
          for (const logoVar of logoVariations) {
            if (collegeVar === logoVar) return true
            if (collegeVar.includes(logoVar) || logoVar.includes(collegeVar)) return true
          }
        }

        if (logo.aliases) {
          const aliases = logo.aliases
            .toLowerCase()
            .split(",")
            .map((a: string) => a.trim())

          for (const alias of aliases) {
            for (const collegeVar of collegeVariations) {
              if (alias === collegeVar || alias.includes(collegeVar) || collegeVar.includes(alias)) return true
            }
          }
        }

        return false
      })

      return result
    }

    athletes.forEach((athlete) => {
      const collegeName = athlete.college
      if (!collegeName) return

      const normalizedCollegeName = collegeName.toLowerCase().trim()

      let existingCollege = null
      let existingKey = null

      for (const [key, stats] of collegeStats.entries()) {
        if (normalizedCollegeName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedCollegeName)) {
          existingCollege = stats
          existingKey = key
          break
        }
      }

      const canonicalName = existingKey || collegeName

      if (!collegeStats.has(canonicalName)) {
        collegeStats.set(canonicalName, {
          college_name: canonicalName,
          total_commits: 0,
          d1_commits: 0,
          d2_commits: 0,
          d3_commits: 0,
          naia_commits: 0,
          recent_commits: 0,
          ranked_commits: 0,
          male_commits: 0,
          female_commits: 0,
          division: "Unknown",
          nc_commits: 0,
          out_of_state_commits: 0,
        })
      }

      const stats = collegeStats.get(canonicalName)!
      stats.total_commits++

      if (athlete.division) {
        // If this is the first athlete or division is still Unknown, set it
        if (stats.division === "Unknown") {
          stats.division = normalizeDivision(athlete.division)
        }
        // Otherwise, keep the most common division (simple approach: first one wins for now)
      }

      // Track gender-specific commits
      const athleteGender = athlete.gender?.toLowerCase()
      if (athleteGender === "male" || athleteGender === "m" || athleteGender === "men") {
        stats.male_commits++
      } else if (athleteGender === "female" || athleteGender === "f" || athleteGender === "women") {
        stats.female_commits++
      }

      const athleteDivision = athlete.division
      if (athleteDivision === "NCAA Division I" || athleteDivision === "DI") {
        stats.d1_commits++
      } else if (athleteDivision === "NCAA Division II" || athleteDivision === "DII") {
        stats.d2_commits++
      } else if (athleteDivision === "NCAA Division III" || athleteDivision === "DIII") {
        stats.d3_commits++
      } else if (athleteDivision === "NAIA") {
        stats.naia_commits++
      }

      // Track NC vs out-of-state commits
      if (
        ncColleges.has(normalizedCollegeName) ||
        normalizedCollegeName.includes("north carolina") ||
        normalizedCollegeName.includes("nc ")
      ) {
        stats.nc_commits++
      } else {
        stats.out_of_state_commits++
      }

      // Track recent commits (last 12 months)
      if (athlete.commitmentdate) {
        const commitDate = new Date(athlete.commitmentdate)
        if (commitDate >= oneYearAgo) {
          stats.recent_commits++
        }
      }

      if (athlete.rankings && typeof athlete.rankings === "object") {
        const rankings = athlete.rankings as Record<string, any>
        // Check if any ranking value is <= 30
        const hasTop30Ranking = Object.values(rankings).some((rank) => {
          if (typeof rank === "number") return rank <= 30
          if (typeof rank === "string") {
            const numRank = Number.parseInt(rank)
            return !isNaN(numRank) && numRank <= 30
          }
          return false
        })
        if (hasTop30Ranking) {
          stats.ranked_commits++
        }
      }
    })

    const collegesWithLogos = Array.from(collegeStats.values()).map((college) => {
      const logoMapping = findLogoMapping(college.college_name)

      return {
        ...college,
        logo_url: logoMapping?.logo_url || null,
      }
    })

    // Sort colleges by selected metric
    let sortedColleges = [...collegesWithLogos]

    if (division !== "all") {
      sortedColleges = sortedColleges.filter((college) => {
        // Normalize division for comparison
        const collegeDivision = college.division
        if (division === "DI") {
          return collegeDivision === "NCAA Division I" || collegeDivision === "DI"
        } else if (division === "DII") {
          return collegeDivision === "NCAA Division II" || collegeDivision === "DII"
        } else if (division === "DIII") {
          return collegeDivision === "NCAA Division III" || collegeDivision === "DIII"
        } else {
          return collegeDivision === division
        }
      })
      console.log(`Filtered to ${sortedColleges.length} colleges for division: ${division}`)
    }

    switch (metric) {
      case "d1_commits":
        sortedColleges.sort((a, b) => b.d1_commits - a.d1_commits)
        break
      case "recent_commits":
        sortedColleges.sort((a, b) => b.recent_commits - a.recent_commits)
        break
      case "ranked_commits":
        sortedColleges = sortedColleges.filter((c) => c.ranked_commits > 0)
        sortedColleges.sort((a, b) => b.ranked_commits - a.ranked_commits)
        break
      case "nc_commits":
        sortedColleges = sortedColleges.filter((c) => c.nc_commits > 0)
        sortedColleges.sort((a, b) => b.nc_commits - a.nc_commits)
        break
      default: // total_commits
        if (gender === "male") {
          sortedColleges.sort((a, b) => b.male_commits - a.male_commits)
        } else if (gender === "female") {
          sortedColleges.sort((a, b) => b.female_commits - a.female_commits)
        } else {
          sortedColleges.sort((a, b) => b.total_commits - a.total_commits)
        }
    }

    console.log(`College Leaderboard API returning ${sortedColleges.length} colleges`)

    return NextResponse.json(
      {
        colleges: sortedColleges,
        total: sortedColleges.length,
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
    console.error("College API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
