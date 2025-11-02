import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile with school info
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("school_id, institution")
      .eq("user_id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // If school_id exists, fetch from schools table
    if (profile.school_id) {
      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("school_name, logo_url, banner_url, primary_color, secondary_color")
        .eq("id", profile.school_id)
        .single()

      if (!schoolError && school) {
        return NextResponse.json({ school })
      }
    }

    // Fallback: try to match by institution name
    if (profile.institution) {
      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("school_name, logo_url, banner_url, primary_color, secondary_color")
        .ilike("school_name", profile.institution)
        .single()

      if (!schoolError && school) {
        return NextResponse.json({ school })
      }
    }

    // No school branding found
    return NextResponse.json({ school: null })
  } catch (error) {
    console.error("Error fetching school branding:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
