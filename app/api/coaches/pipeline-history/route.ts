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
    const { data: schoolData, error: schoolError } = await supabase
      .from("schools")
      .select("id, name")
      .ilike("name", `%${schoolName}%`)
      .limit(1)
      .single()

    console.log(`[Pipeline History API] School lookup result:`, { schoolData, schoolError })

    if (!schoolData) {
      console.error(`[Pipeline History API] School not found for name: ${schoolName}`)
      return NextResponse.json({ 
        success: true, 
        history: [],
        message: "School not found"
      })
    }

    console.log(`[Pipeline History API] Found school:`, schoolData.name, `(ID: ${schoolData.id})`)

    // Query athletes table directly for:
    // 1. recruiting_status = "College Athlete" (from main profile tab)
    // 2. college field matches school name (from college tab)
    
    // Try exact match first
    console.log(`[Pipeline History API] Searching for athletes with college ILIKE '%${schoolData.name}%'`)
    let { data: athletes } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, weightclass, college_weight_class, highschool, location, photourl, recruiting_status, college")
      .eq("recruiting_status", "College Athlete")
      .ilike("college", `%${schoolData.name}%`)

    console.log(`[Pipeline History API] Exact match found ${athletes?.length || 0} athletes`)
    if (athletes && athletes.length > 0) {
      console.log(`[Pipeline History API] Sample athlete college values:`, athletes.slice(0, 3).map(a => a.college))
    }

    // Also try shortened name (e.g., "Randolph" from "Randolph College")
    const shortName = schoolData.name.replace(/College|University|Institute|School/i, "").trim()
    console.log(`[Pipeline History API] Trying shortened name: "${shortName}"`)
    
    if (shortName && shortName.length > 2 && shortName !== schoolData.name) {
      const { data: shortMatch } = await supabase
        .from("athletes")
        .select("id, name, graduationyear, weightclass, college_weight_class, highschool, location, photourl, recruiting_status, college")
        .eq("recruiting_status", "College Athlete")
        .ilike("college", `%${shortName}%`)
      
      console.log(`[Pipeline History API] Shortened name match found ${shortMatch?.length || 0} athletes`)
      
      if (shortMatch) {
        const existingIds = new Set(athletes?.map(a => a.id) || [])
        const newMatches = shortMatch.filter(a => !existingIds.has(a.id))
        console.log(`[Pipeline History API] Adding ${newMatches.length} new athletes from shortened name search`)
        athletes = [...(athletes || []), ...newMatches]
      }
    }

    console.log(`[Pipeline History API] Total found: ${athletes?.length || 0} college athletes with matching status and college`)

    if (!athletes) {
      return NextResponse.json({ 
        success: true, 
        history: []
      })
    }

    // No filtering needed - if they're "College Athlete" at this school, they should show
    // The section name can be changed on the frontend if desired
    console.log(`[Pipeline History API] Returning ${athletes.length} enrolled athletes`)

    // Get roster status from college_coach_stars if exists
    const athleteIds = athletes.map(a => a.id)
    const { data: rosterData } = await supabase
      .from("college_coach_stars")
      .select("athlete_id, roster_status, roster_notes")
      .in("athlete_id", athleteIds)

    const rosterMap = new Map(rosterData?.map(r => [r.athlete_id, r]) || [])
    
    // Filter out athletes marked as "Left Program" in college_coach_stars
    athletes = athletes.filter(athlete => {
      const rosterInfo = rosterMap.get(athlete.id)
      return !rosterInfo || rosterInfo.roster_status !== "Left Program"
    })

    // Format the results
    const history = athletes.map((athlete) => {
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
