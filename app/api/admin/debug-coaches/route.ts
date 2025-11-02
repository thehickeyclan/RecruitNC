import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch ALL user_profiles without any filters
    const { data: allProfiles, error: allError } = await supabase.from("user_profiles").select("*")

    console.log("[v0] DEBUG: All profiles count:", allProfiles?.length)
    console.log("[v0] DEBUG: All profiles:", JSON.stringify(allProfiles, null, 2))

    // Fetch profiles with role = 'coach'
    const { data: coaches, error: coachError } = await supabase.from("user_profiles").select("*").eq("role", "coach")

    console.log("[v0] DEBUG: Coaches with role=coach:", coaches?.length)
    console.log("[v0] DEBUG: Coaches:", JSON.stringify(coaches, null, 2))

    // Fetch all schools
    const { data: schools, error: schoolsError } = await supabase.from("schools").select("*")

    console.log("[v0] DEBUG: Schools:", JSON.stringify(schools, null, 2))

    return NextResponse.json({
      allProfilesCount: allProfiles?.length || 0,
      coachesCount: coaches?.length || 0,
      schoolsCount: schools?.length || 0,
      allProfiles: allProfiles || [],
      coaches: coaches || [],
      schools: schools || [],
      errors: {
        allError,
        coachError,
        schoolsError,
      },
    })
  } catch (error) {
    console.error("[v0] DEBUG: Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
