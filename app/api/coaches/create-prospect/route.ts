import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a verified coach or admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("verified_coach, is_admin")
      .eq("user_id", session.user.id)
      .single()

    if (!profile?.verified_coach && !profile?.is_admin) {
      return NextResponse.json(
        { error: "Only verified coaches can create custom prospects" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      state,
      highschool,
      graduationyear,
      weightclass,
      gender,
      email,
      phone,
      instagram,
      notes,
    } = body

    // Validation
    if (!name || !state || !graduationyear) {
      return NextResponse.json(
        { error: "Name, state, and graduation year are required" },
        { status: 400 }
      )
    }

    // Determine if this is an NC athlete
    const isNCathlete = state === "NC"

    // Create the athlete record
    const { data: athlete, error: athleteError } = await supabase
      .from("athletes")
      .insert({
        name: name.trim(),
        state: state,
        highschool: highschool || null,
        graduationyear: graduationyear,
        weightclass: weightclass || null,
        gender: gender || "Male",
        contactemail: email || null,
        phone: phone || null,
        instagram: instagram || null,
        recruiting_status: "Prospect",
        is_nc_athlete: isNCathlete,
        added_by_coach_id: session.user.id,
        bio: notes || null, // Store notes in bio field for now
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (athleteError) {
      console.error("Error creating athlete:", athleteError)
      return NextResponse.json(
        { error: `Failed to create prospect: ${athleteError.message}` },
        { status: 500 }
      )
    }

    // Auto-star this athlete for the coach
    const { error: starError } = await supabase
      .from("coach_starred_athletes")
      .insert({
        coach_id: session.user.id,
        athlete_id: athlete.id,
        pipeline_stage: "Prospect",
        notes: notes || null,
        created_at: new Date().toISOString(),
      })

    if (starError) {
      console.error("Error starring athlete:", starError)
      // Don't fail the whole operation if starring fails
    }

    console.log("[v0] Custom prospect created:", {
      athleteId: athlete.id,
      name: athlete.name,
      state: athlete.state,
      isNCathlete,
      coachId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      athlete: {
        id: athlete.id,
        name: athlete.name,
        state: athlete.state,
        isNCathlete,
      },
    })
  } catch (error) {
    console.error("Error in create-prospect API:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

