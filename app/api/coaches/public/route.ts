import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Fetch verified coaches with public profiles
    const { data: coaches, error } = await supabase
      .from("user_profiles")
      .select(`
        id,
        user_id,
        full_name,
        institution,
        coaching_position,
        years_experience,
        division,
        location,
        bio,
        achievements,
        contact_email,
        contact_phone,
        website,
        social_media,
        recruiting_focus,
        program_highlights,
        verified_coach,
        created_at
      `)
      .eq("verified_coach", true)
      .eq("public_profile", true)
      .order("full_name", { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch coaches" }, { status: 500 })
    }

    // Format the response
    const formattedCoaches = (coaches || []).map((coach) => ({
      id: coach.user_id,
      full_name: coach.full_name,
      institution: coach.institution,
      coaching_position: coach.coaching_position,
      years_experience: coach.years_experience,
      division: coach.division,
      location: coach.location,
      bio: coach.bio,
      achievements: coach.achievements || [],
      contact_email: coach.contact_email,
      contact_phone: coach.contact_phone,
      website: coach.website,
      social_media: coach.social_media || {},
      recruiting_focus: coach.recruiting_focus || [],
      program_highlights: coach.program_highlights || [],
      verified: coach.verified_coach,
      created_at: coach.created_at,
    }))

    return NextResponse.json({ coaches: formattedCoaches })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
