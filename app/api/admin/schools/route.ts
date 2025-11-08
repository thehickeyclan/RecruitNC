import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    console.log("[v0] === SCHOOLS API CALLED (using service role) ===")

    // Fetch all schools
    const { data: schools, error: schoolsError } = await supabase.from("schools").select("*").order("name")

    if (schoolsError) {
      console.error("[v0] Error fetching schools:", schoolsError)
      return NextResponse.json({ error: "Failed to fetch schools" }, { status: 500 })
    }

    console.log("[v0] Schools fetched:", schools?.length || 0)

    // Fetch ALL user profiles (service role bypasses RLS)
    const { data: allProfiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, user_id, full_name, email, school_id, role")

    if (profilesError) {
      console.error("[v0] Error fetching profiles:", profilesError)
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }

    console.log("[v0] ALL user profiles fetched:", allProfiles?.length || 0)

    // Filter coaches
    const coaches = (allProfiles || []).filter((p) => {
      const hasCoachRole = p.role === "coach" || p.role === "college_coach" || p.role === "admin"
      const hasSchoolId = p.school_id !== null && p.school_id !== undefined
      return hasCoachRole && hasSchoolId
    })

    console.log("[v0] Coaches with school_id:", coaches.length)
    coaches.forEach((c) => {
      console.log(`[v0]   - ${c.full_name} (${c.email}) - School ID: ${c.school_id}`)
    })

    // Fetch recruiter counts for each coach
    const coachUserIds = coaches.map((coach) => coach.user_id).filter(Boolean)
    const coachAthleteMap = new Map<string, Set<string>>()

    if (coachUserIds.length > 0) {
      const { data: coachStars, error: starError } = await supabase
        .from("college_coach_stars")
        .select("coach_user_id, athlete_id")
        .in("coach_user_id", coachUserIds as string[])

      if (starError) {
        console.error("[v0] Error fetching coach stars:", starError)
      } else if (coachStars) {
        coachStars.forEach((star) => {
          if (!star.coach_user_id || !star.athlete_id) return
          if (!coachAthleteMap.has(star.coach_user_id)) {
            coachAthleteMap.set(star.coach_user_id, new Set<string>())
          }
          coachAthleteMap.get(star.coach_user_id)!.add(star.athlete_id)
        })
      }
    }

    // Map schools with their coaches
    const schoolsWithCoaches = schools.map((school) => {
      const schoolCoaches = coaches.filter((coach) => coach.school_id === school.id)
      const schoolAthletes = new Set<string>()

      schoolCoaches.forEach((coach) => {
        const athleteIds = coachAthleteMap.get(coach.user_id) || new Set()
        athleteIds.forEach((athleteId) => schoolAthletes.add(athleteId))
      })

      return {
        ...school,
        coach_count: schoolCoaches.length,
        total_recruits: schoolAthletes.size,
        coaches: schoolCoaches.map((c) => ({
          id: c.id,
          user_id: c.user_id,
          full_name: c.full_name,
          email: c.email,
        })),
      }
    })

    console.log("[v0] === RETURNING SCHOOLS WITH COACHES ===")
    schoolsWithCoaches.forEach((s) => {
      console.log(`[v0] ${s.name}: ${s.coach_count} coaches`)
    })

    // Filter out test schools - only production schools should be available for coach assignment
    const customSchools = schoolsWithCoaches.filter((school) => !school.is_test)

    console.log("[v0] Filtered schools (excluding test schools):", customSchools.length)

    return NextResponse.json(
      { success: true, schools: customSchools },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error: any) {
    console.error("[v0] ERROR in schools API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
