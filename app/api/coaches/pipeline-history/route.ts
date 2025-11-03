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

    // Get coaches for this school
    const { data: schoolCoaches } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("school_id", schoolData.id)

    const coachUserIds = schoolCoaches?.map((c) => c.user_id) || []

    // Also get admin users
    const { data: adminUsers } = await supabase
      .from("user_profiles")
      .select("user_id")
      .or("is_admin.eq.true,role.eq.admin")

    const adminUserIds = adminUsers?.map((u) => u.user_id) || []

    // Combine coach and admin IDs
    const allUserIds = [...coachUserIds, ...adminUserIds]

    if (allUserIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        history: [],
        message: "No users found for this school"
      })
    }

    // Find athletes with "College Athlete" status or similar
    const { data: collegeAthletes } = await supabase
      .from("college_coach_stars")
      .select("athlete_id, pipeline_stage, notes, created_at")
      .in("coach_user_id", allUserIds)
      .ilike("pipeline_stage", "%college%athlete%")

    console.log(`[Pipeline History API] Found ${collegeAthletes?.length || 0} college athletes`)

    if (!collegeAthletes || collegeAthletes.length === 0) {
      return NextResponse.json({ 
        success: true, 
        history: [],
        message: "No college athletes found"
      })
    }

    // Get athlete details
    const athleteIds = collegeAthletes.map((ca) => ca.athlete_id)
    
    const { data: athletes } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, weightclass, highschool, location, photourl")
      .in("id", athleteIds)

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
      "Mint Hill", "Harrisburg", "Midland", "Oakboro", "Albemarle", "Pineville"
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

    // Format the results
    const history = ncAthletes.map((athlete) => {
      const currentYear = new Date().getFullYear()
      const yearsOnTeam = athlete.graduationyear ? currentYear - athlete.graduationyear + 1 : null
      
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
        weight: athlete.weightclass,
        highschool: athlete.highschool,
        status,
        years_on_team: yearsOnTeam ? `${yearsOnTeam} year${yearsOnTeam > 1 ? 's' : ''}` : "Current"
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

