import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get specific athletes to check
    const athletesToCheck = ["Colt Campbell", "Liam Hickey", "Lorenzo Alston", "Anna Ockerman", "Bentley Sly"]

    const results = []

    for (const athleteName of athletesToCheck) {
      console.log(`\n=== CHECKING ${athleteName} ===`)

      // Get athlete data
      const { data: athlete, error: athleteError } = await supabase
        .from("athletes")
        .select("*")
        .ilike("name", athleteName)
        .maybeSingle()

      if (athleteError || !athlete) {
        results.push({
          athlete_name: athleteName,
          found: false,
          error: athleteError?.message || "Athlete not found",
        })
        continue
      }

      console.log(`Found athlete:`, {
        name: athlete.name,
        college: athlete.college,
        highschool: athlete.highschool,
        wrestlingClub: athlete.wrestlingClub,
      })

      // Check each logo mapping
      const logoChecks = []

      // College logo check
      if (athlete.college) {
        console.log(`Checking college logo for: "${athlete.college}"`)

        const { data: collegeLogo, error: collegeError } = await supabase
          .from("logo_mappings")
          .select("*")
          .eq("entity_type", "college")
          .ilike("entity_name", athlete.college)
          .maybeSingle()

        console.log(`College logo result:`, collegeLogo ? "FOUND" : "NOT FOUND")
        if (collegeLogo) console.log(`College logo URL:`, collegeLogo.logo_url)

        logoChecks.push({
          type: "college",
          entity_name: athlete.college,
          logo_found: !!collegeLogo,
          logo_url: collegeLogo?.logo_url || null,
          exact_match: collegeLogo?.entity_name || null,
        })
      }

      // High school logo check
      if (athlete.highschool) {
        console.log(`Checking high school logo for: "${athlete.highschool}"`)

        // Try multiple entity_type variations for high schools
        const highSchoolTypes = ["highschool", "high_school", "High-School"]
        let highSchoolLogo = null

        for (const hsType of highSchoolTypes) {
          const { data: hsLogo } = await supabase
            .from("logo_mappings")
            .select("*")
            .eq("entity_type", hsType)
            .ilike("entity_name", athlete.highschool)
            .maybeSingle()

          if (hsLogo) {
            highSchoolLogo = hsLogo
            break
          }
        }

        console.log(`High school logo result:`, highSchoolLogo ? "FOUND" : "NOT FOUND")
        if (highSchoolLogo) console.log(`High school logo URL:`, highSchoolLogo.logo_url)

        logoChecks.push({
          type: "highschool",
          entity_name: athlete.highschool,
          logo_found: !!highSchoolLogo,
          logo_url: highSchoolLogo?.logo_url || null,
          exact_match: highSchoolLogo?.entity_name || null,
        })
      }

      // Wrestling club logo check
      if (athlete.wrestlingClub && athlete.wrestlingClub !== "none") {
        console.log(`Checking club logo for: "${athlete.wrestlingClub}"`)

        const { data: clubLogo, error: clubError } = await supabase
          .from("logo_mappings")
          .select("*")
          .eq("entity_type", "club")
          .ilike("entity_name", athlete.wrestlingClub)
          .maybeSingle()

        console.log(`Club logo result:`, clubLogo ? "FOUND" : "NOT FOUND")
        if (clubLogo) console.log(`Club logo URL:`, clubLogo.logo_url)

        logoChecks.push({
          type: "club",
          entity_name: athlete.wrestlingClub,
          logo_found: !!clubLogo,
          logo_url: clubLogo?.logo_url || null,
          exact_match: clubLogo?.entity_name || null,
        })
      }

      results.push({
        athlete_name: athleteName,
        found: true,
        raw_data: athlete,
        college: athlete.college,
        high_school: athlete.highschool,
        club: athlete.wrestlingClub,
        logo_checks: logoChecks,
        college_logo_exists: logoChecks.find((c) => c.type === "college")?.logo_found || false,
        high_school_logo_exists: logoChecks.find((c) => c.type === "highschool")?.logo_found || false,
        club_logo_exists: logoChecks.find((c) => c.type === "club")?.logo_found || false,
      })
    }

    // Also get a sample of all logo mappings to see what we have
    const { data: allLogos } = await supabase
      .from("logo_mappings")
      .select("entity_name, entity_type, logo_url")
      .order("entity_type", { ascending: true })

    return NextResponse.json({
      success: true,
      results,
      total_logo_mappings: allLogos?.length || 0,
      logo_mappings_sample: allLogos?.slice(0, 20) || [],
      all_logo_mappings: allLogos || [],
    })
  } catch (error) {
    console.error("Error checking athlete logos:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
