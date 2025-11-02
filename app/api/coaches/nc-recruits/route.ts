import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const schoolName = searchParams.get("schoolName")

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

    // Fetch all athletes who are committed or signed
    // Check both recruiting_status and pipeline_stage from college_coach_stars
    const { data: athletesByStatus, error: statusError } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, weightclass, highschool, college, division, location, recruiting_status")
      .or("recruiting_status.ilike.%committed%,recruiting_status.ilike.%signed%")
      .not("college", "is", null)
      .neq("college", "")
      .order("graduationyear", { ascending: false })
      .order("name", { ascending: true })

    // Also get athletes from college_coach_stars with Committed or Signed pipeline_stage
    const { data: allStars } = await supabase
      .from("college_coach_stars")
      .select("athlete_id, pipeline_stage")
      .in("pipeline_stage", ["Committed", "Signed", "committed", "signed"])

    const starredAthleteIds = [...new Set((allStars || []).map((s) => s.athlete_id))]

    const { data: athletesByPipeline, error: pipelineError } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, weightclass, highschool, college, division, location, recruiting_status")
      .in("id", starredAthleteIds.length > 0 ? starredAthleteIds : ["00000000-0000-0000-0000-000000000000"])
      .order("graduationyear", { ascending: false })
      .order("name", { ascending: true })

    // Combine and deduplicate athletes
    const allAthletes = [...(athletesByStatus || []), ...(athletesByPipeline || [])]
    const uniqueAthletes = Array.from(
      new Map(allAthletes.map((athlete) => [athlete.id, athlete])).values(),
    )

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
    ]

    // First filter for North Carolina athletes
    const ncAthletes = uniqueAthletes.filter((athlete) => {
      const location = (athlete.location || "").toLowerCase()
      const highschool = (athlete.highschool || "").toLowerCase()

      return ncKeywords.some(
        (keyword) =>
          location.includes(keyword.toLowerCase()) ||
          highschool.includes(keyword.toLowerCase()) ||
          (location && location.includes("north carolina")) ||
          (highschool && highschool.includes("north carolina")),
      )
    })

    // Then filter by school name - match against the athlete's college field
    const ncRecruits = ncAthletes.filter((athlete) => {
      const athleteCollege = (athlete.college || "").toLowerCase()
      const targetSchoolName = schoolName.toLowerCase()
      
      // Exact match or contains check
      return athleteCollege === targetSchoolName || 
             athleteCollege.includes(targetSchoolName) ||
             targetSchoolName.includes(athleteCollege)
    })

    // Get pipeline_stage from college_coach_stars for each athlete
    const athletesWithStage = ncRecruits.map((athlete) => {
      const star = allStars?.find((s) => s.athlete_id === athlete.id)
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

