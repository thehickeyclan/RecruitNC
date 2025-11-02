import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    console.log(`[NC Recruits API] 🚀 API called at ${new Date().toISOString()}`)
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const schoolName = searchParams.get("schoolName")
    console.log(`[NC Recruits API] Request for school: ${schoolName}`)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to check permissions
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("verified_coach, role, is_admin")
      .eq("user_id", user.id)
      .single()

    if (!profile?.verified_coach && profile?.role !== "coach" && !profile?.is_admin) {
      return NextResponse.json({ error: "Coach access required" }, { status: 403 })
    }

    if (!schoolName) {
      return NextResponse.json({ error: "School name is required" }, { status: 400 })
    }

    // Get the school by name to find its ID
    const { data: schoolData } = await supabase
      .from("schools")
      .select("id, name")
      .ilike("name", `%${schoolName}%`)
      .limit(1)
      .single()

    if (!schoolData) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }

    // Get all coaches associated with this school
    const { data: schoolCoaches } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("school_id", schoolData.id)

    const coachUserIds = schoolCoaches?.map((c) => c.user_id) || []

    // Get all committed/signed athletes from coaches at this school
    let coachCommittedStars: any[] = []
    if (coachUserIds.length > 0) {
      const { data: coachStars } = await supabase
        .from("college_coach_stars")
        .select("athlete_id, pipeline_stage")
        .in("coach_user_id", coachUserIds)
        .in("pipeline_stage", ["Committed", "Signed", "committed", "signed"])

      coachCommittedStars = coachStars || []
      console.log(`[NC Recruits API] Found ${coachCommittedStars.length} committed athletes from ${coachUserIds.length} coaches at ${schoolName}`)
    } else {
      console.log(`[NC Recruits API] No coaches found for ${schoolName}, checking admin-added prospects...`)
    }

    // Also check for admin-added prospects (where notes mention this school)
    // This allows admins to add recruits even if no coaches are assigned yet
    let adminCommittedStars: any[] = []
    if (profile?.is_admin) {
      const { data: adminUsers } = await supabase
        .from("user_profiles")
        .select("user_id")
        .or("is_admin.eq.true,role.eq.admin")

      const adminUserIds = adminUsers?.map((u) => u.user_id) || []

      if (adminUserIds.length > 0) {
        // Match against both full school name and shortened name (e.g., "Lynchburg College" and "Lynchburg")
        const schoolNameVariations = [
          schoolData.name,
          schoolData.name.replace(/College|University|Institute/i, "").trim(),
          schoolData.name.split(" ")[0], // First word
        ].filter(Boolean)

        // Get all admin-committed stars with notes mentioning school
        const { data: adminStars } = await supabase
          .from("college_coach_stars")
          .select("athlete_id, pipeline_stage, notes")
          .in("coach_user_id", adminUserIds)
          .in("pipeline_stage", ["Committed", "Signed", "committed", "signed"])

        // Filter in memory to match any variation of school name
        if (adminStars) {
          adminCommittedStars = adminStars.filter((star) => {
            const notesLower = (star.notes || "").toLowerCase()
            const matches = schoolNameVariations.some((variation) =>
              notesLower.includes(variation.toLowerCase())
            )
            if (matches) {
              console.log(`[NC Recruits API] ✅ Admin-added recruit matches: notes="${star.notes?.substring(0, 50)}" matches variations:`, schoolNameVariations)
            }
            return matches
          })
          console.log(`[NC Recruits API] Found ${adminCommittedStars.length} admin-added committed athletes for ${schoolName} (from ${adminStars.length} total admin commits)`)
        }
      }
    }

    // ALSO check athletes table directly for athletes whose college field matches the school
    // This catches athletes committed via the admin athlete profile "college" tab
    // Check both recruiting_status AND college_coach_stars pipeline_stage
    let directCommittedAthletes: any[] = []
    
    // Get all athletes whose college field matches (regardless of recruiting_status)
    // We'll check pipeline_stage separately since that's where admin commitments might be stored
    let matchingCollegeAthletes: any[] = []
    
    // Try with schoolData.name
    const { data: exactMatch } = await supabase
      .from("athletes")
      .select("id, recruiting_status, college")
      .ilike("college", `%${schoolData.name}%`)
    
    if (exactMatch) {
      matchingCollegeAthletes.push(...exactMatch)
    }
    
    // Try with schoolName parameter if different
    if (schoolName && schoolName !== schoolData.name) {
      const { data: paramMatch } = await supabase
        .from("athletes")
        .select("id, recruiting_status, college")
        .ilike("college", `%${schoolName}%`)
      
      if (paramMatch) {
        const existingIds = new Set(matchingCollegeAthletes.map(a => a.id))
        matchingCollegeAthletes.push(...paramMatch.filter(a => !existingIds.has(a.id)))
      }
    }
    
    // Try shortened name variations (e.g., "Lynchburg" from "Lynchburg College")
    const shortName = schoolData.name.replace(/College|University|Institute|School/i, "").trim()
    if (shortName && shortName.length > 2 && shortName !== schoolData.name) {
      const { data: shortMatch } = await supabase
        .from("athletes")
        .select("id, recruiting_status, college")
        .ilike("college", `%${shortName}%`)
      
      if (shortMatch) {
        const existingIds = new Set(matchingCollegeAthletes.map(a => a.id))
        matchingCollegeAthletes.push(...shortMatch.filter(a => !existingIds.has(a.id)))
      }
    }
    
    // Now filter: include if recruiting_status is Committed/Signed OR if pipeline_stage in college_coach_stars is Committed/Signed
    if (matchingCollegeAthletes.length > 0) {
      const matchingAthleteIds = matchingCollegeAthletes.map(a => a.id)
      
      // Check which ones have Committed/Signed in recruiting_status
      const statusCommitted = matchingCollegeAthletes.filter(a => 
        a.recruiting_status && ["Committed", "Signed", "committed", "signed"].includes(a.recruiting_status)
      )
      directCommittedAthletes.push(...statusCommitted)
      
      // Also check college_coach_stars for those athletes - if pipeline_stage is Committed/Signed, include them
      const { data: starsForAthletes } = await supabase
        .from("college_coach_stars")
        .select("athlete_id, pipeline_stage")
        .in("athlete_id", matchingAthleteIds)
        .in("pipeline_stage", ["Committed", "Signed", "committed", "signed"])
      
      if (starsForAthletes && starsForAthletes.length > 0) {
        const starCommittedIds = new Set(starsForAthletes.map(s => s.athlete_id))
        const starCommittedAthletes = matchingCollegeAthletes.filter(a => 
          starCommittedIds.has(a.id) && !statusCommitted.some(sc => sc.id === a.id)
        )
        directCommittedAthletes.push(...starCommittedAthletes)
      }
    }
    
    console.log(`[NC Recruits API] Found ${matchingCollegeAthletes.length} athletes with matching college field, ${directCommittedAthletes.length} of which are committed/signed`)

    const directCommittedIds = directCommittedAthletes?.map((a) => ({
      athlete_id: a.id,
      pipeline_stage: a.recruiting_status || "Committed",
    })) || []

    // Debug: Check if Cameron Gue is in the results
    const cameronGue = directCommittedAthletes?.find(a => 
      a.college?.toLowerCase().includes("lynchburg") || 
      a.college?.toLowerCase().includes(schoolData.name.toLowerCase())
    )
    if (cameronGue) {
      console.log(`[NC Recruits API] ✅ Found Cameron Gue (or similar) in direct athletes query:`, {
        id: cameronGue.id,
        college: cameronGue.college,
        recruiting_status: cameronGue.recruiting_status
      })
    }

    console.log(`[NC Recruits API] Found ${directCommittedIds.length} committed athletes from athletes.college field matching "${schoolData.name}" or "${schoolName}"`)
    if (directCommittedAthletes && directCommittedAthletes.length > 0) {
      console.log(`[NC Recruits API] Direct committed athletes colleges:`, directCommittedAthletes.map(a => ({ id: a.id, college: a.college, status: a.recruiting_status })))
    }

    // Combine all sources: coach stars, admin stars, and direct athlete college field
    const allCommittedStars = [...coachCommittedStars, ...adminCommittedStars, ...directCommittedIds]
    const committedStars = Array.from(
      new Map(allCommittedStars.map((s) => [s.athlete_id, s])).values(),
    )

    if (!committedStars || committedStars.length === 0) {
      console.log(`[NC Recruits API] No committed athletes found from any source for ${schoolName}`)
      return NextResponse.json({ success: true, recruits: [] })
    }

    console.log(`[NC Recruits API] Total unique committed athletes (after deduplication): ${committedStars.length}`)

    // Get the athlete IDs from all committed sources
    const committedAthleteIds = [...new Set(committedStars.map((s) => s.athlete_id))]

    // Fetch athlete details
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, weightclass, highschool, college, division, location, recruiting_status")
      .in("id", committedAthleteIds.length > 0 ? committedAthleteIds : ["00000000-0000-0000-0000-000000000000"])
      .order("graduationyear", { ascending: false })
      .order("name", { ascending: true })

    if (athletesError || !athletes) {
      return NextResponse.json({ error: "Failed to fetch athletes" }, { status: 500 })
    }

    // Filter for North Carolina athletes (location or highschool contains NC/NC cities)
    const ncKeywords = [
      "North Carolina",
      "NC",
      "Charlotte",
      "Raleigh",
      "Greensboro",
      "Durham",
      "Winston-Salem",
      "Fayetteville",
      "Cary",
      "Wilmington",
      "High Point",
      "Concord",
      "Asheville",
      "Gastonia",
      "Huntersville",
      "Jacksonville",
      "Apex",
      "Burlington",
      "Kannapolis",
      "Mooresville",
      "Mount Pleasant", // Mount Pleasant, NC
      "Cabarrus", // Cabarrus County, NC
      "Cabarrus County",
      "Stanly",
      "Stanly County",
      "Matthews",
      "Davidson",
      "Cornelius",
      "Huntersville",
      "Mint Hill",
      "Harrisburg",
      "Midland",
      "Oakboro",
      "Albemarle",
      "Pineville",
      "Indian Trail",
    ]

    // Filter for North Carolina athletes
    const ncAthletes = (athletes || []).filter((athlete) => {
      const location = (athlete.location || "").toLowerCase()
      const highschool = (athlete.highschool || "").toLowerCase()

      const isNC = ncKeywords.some(
        (keyword) =>
          location.includes(keyword.toLowerCase()) ||
          highschool.includes(keyword.toLowerCase()) ||
          (location && location.includes("north carolina")) ||
          (highschool && highschool.includes("north carolina")),
      )

      // Debug logging for Cameron Gue specifically
      if (athlete.name?.toLowerCase().includes("cameron") && athlete.name?.toLowerCase().includes("gue")) {
        const matchingKeywords = ncKeywords.filter(k => 
          highschool.includes(k.toLowerCase()) || location.includes(k.toLowerCase())
        )
        console.log(`[NC Recruits API] 🔍 Cameron Gue DEBUG:`, {
          name: athlete.name,
          highschool,
          location,
          isNC,
          matchingKeywords,
          allKeywords: ncKeywords,
          highschoolLower: highschool,
          locationLower: location,
        })
      }

      return isNC
    })

    console.log(`[NC Recruits API] ✅ Final results: ${ncAthletes.length} NC athletes from ${athletes?.length || 0} total committed athletes for school: ${schoolName}`)
    console.log(`[NC Recruits API] Athlete names:`, ncAthletes.map(a => a.name))

    // Get pipeline_stage from college_coach_stars for each athlete
    const athletesWithStage = ncAthletes.map((athlete) => {
      const star = committedStars?.find((s) => s.athlete_id === athlete.id)
      const pipelineStage = star?.pipeline_stage || athlete.recruiting_status || "Committed"

      return {
        id: athlete.id,
        name: athlete.name,
        year: athlete.graduationyear,
        weight: athlete.weightclass,
        highschool: athlete.highschool,
        college: athlete.college,
        division: athlete.division,
        status: pipelineStage,
      }
    })

    // Sort by year (descending), then name
    athletesWithStage.sort((a, b) => {
      if (b.year !== a.year) {
        return (b.year || 0) - (a.year || 0)
      }
      return (a.name || "").localeCompare(b.name || "")
    })

    return NextResponse.json({ success: true, recruits: athletesWithStage })
  } catch (error: any) {
    console.error("Error fetching NC recruits:", error)
    return NextResponse.json({ error: "Failed to fetch recruits" }, { status: 500 })
  }
}

