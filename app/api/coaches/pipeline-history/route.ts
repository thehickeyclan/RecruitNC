import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const schoolName = searchParams.get("schoolName")

    if (!schoolName) {
      return NextResponse.json({ error: "School name required" }, { status: 400 })
    }

    console.log(`[Pipeline History API] Fetching history for school: ${schoolName}`)

    // Get school data
    const { data: schoolData } = await supabase
      .from("schools")
      .select("id, name")
      .ilike("name", `%${schoolName}%`)
      .limit(1)
      .single()

    if (!schoolData) {
      return NextResponse.json({ 
        success: true, 
        history: [],
        message: "School not found"
      })
    }

    // Query athletes table directly for:
    // 1. recruiting_status = "College Athlete" (from main profile tab)
    // 2. college field matches school name (from college tab)
    
    // Try exact match first
    let { data: athletes } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, weightclass, college_weight_class, highschool, location, photourl, recruiting_status, college")
      .eq("recruiting_status", "College Athlete")
      .ilike("college", `%${schoolData.name}%`)

    // Also try shortened name (e.g., "Randolph" from "Randolph College")
    const shortName = schoolData.name.replace(/College|University|Institute|School/i, "").trim()
    if (shortName && shortName.length > 2 && shortName !== schoolData.name) {
      const { data: shortMatch } = await supabase
        .from("athletes")
        .select("id, name, graduationyear, weightclass, college_weight_class, highschool, location, photourl, recruiting_status, college")
        .eq("recruiting_status", "College Athlete")
        .ilike("college", `%${shortName}%`)
      
      if (shortMatch) {
        const existingIds = new Set(athletes?.map(a => a.id) || [])
        const newMatches = shortMatch.filter(a => !existingIds.has(a.id))
        athletes = [...(athletes || []), ...newMatches]
      }
    }

    console.log(`[Pipeline History API] Found ${athletes?.length || 0} college athletes with matching status and college`)

    if (!athletes) {
      return NextResponse.json({ 
        success: true, 
        history: []
      })
    }

    // Filter for NC athletes
    const ncKeywords = [
      "NC", "N.C.", "North Carolina", "Charlotte", "Raleigh", "Durham", "Greensboro",
      "Winston-Salem", "Fayetteville", "Cary", "Wilmington", "High Point", "Concord",
      "Asheville", "Gastonia", "Jacksonville", "Chapel Hill", "Rocky Mount", "Burlington",
      "Wilson", "Huntersville", "Kannapolis", "Apex", "Wake Forest", "Mooresville",
      "Hickory", "Goldsboro", "Kernersville", "Leland", "Monroe", "Indian Trail",
      "Mount Pleasant", "Cabarrus", "Stanly", "Matthews", "Davidson", "Cornelius",
      "Mint Hill", "Harrisburg", "Midland", "Oakboro", "Albemarle", "Pineville",
      "Hoke County", "Hoke", "Wake County", "Mecklenburg", "Guilford", "Forsyth",
      "Cumberland", "New Hanover", "Union County", "Rowan", "Onslow", "Iredell",
      "Lexington", "Chase", "Pisgah", "Haywood", "Haywood County", "Canton"
    ]

    const ncAthletes = athletes.filter((athlete) => {
      const location = (athlete.location || "").toLowerCase()
      const highschool = (athlete.highschool || "").toLowerCase()

      return ncKeywords.some(
        (keyword) =>
          location.includes(keyword.toLowerCase()) || highschool.includes(keyword.toLowerCase())
      )
    })

    console.log(`[Pipeline History API] Filtered to ${ncAthletes.length} NC athletes`)

    // Get roster status from college_coach_stars if exists
    const athleteIds = ncAthletes.map(a => a.id)
    const { data: rosterData } = await supabase
      .from("college_coach_stars")
      .select("athlete_id, roster_status, roster_notes")
      .in("athlete_id", athleteIds)

    const rosterMap = new Map(rosterData?.map(r => [r.athlete_id, r]) || [])

    // Format the results
    const history = ncAthletes.map((athlete) => {
      const currentYear = new Date().getFullYear()
      const yearsOnTeam = athlete.graduationyear ? currentYear - athlete.graduationyear + 1 : null
      
      const rosterInfo = rosterMap.get(athlete.id)
      
      // Determine current status based on years
      let status = "Enrolled"
      if (yearsOnTeam) {
        if (yearsOnTeam === 1) status = "Freshman"
        else if (yearsOnTeam === 2) status = "Sophomore"
        else if (yearsOnTeam === 3) status = "Junior"
        else if (yearsOnTeam === 4) status = "Senior"
        else if (yearsOnTeam > 4) status = "Graduate/Alumni"
      }

      return {
        id: athlete.id,
        name: athlete.name,
        year: athlete.graduationyear,
        weight: athlete.college_weight_class || athlete.weightclass, // Use college weight if available, fallback to HS weight
        highschool: athlete.highschool,
        status,
        years_on_team: yearsOnTeam ? `${yearsOnTeam} year${yearsOnTeam > 1 ? 's' : ''}` : "Current",
        roster_status: rosterInfo?.roster_status || "Active",
        roster_notes: rosterInfo?.roster_notes || null
      }
    })

    // Sort by graduation year (most recent first)
    history.sort((a, b) => (b.year || 0) - (a.year || 0))

    return NextResponse.json({
      success: true,
      history,
      count: history.length
    })
  } catch (error: any) {
    console.error("[Pipeline History API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    )
  }
}

