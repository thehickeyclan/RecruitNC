import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { athleteId } = await request.json()

    console.log("✅ VERIFY PROFILE: Starting for athlete ID:", athleteId)

    const supabase = createClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("✅ VERIFY PROFILE: Authentication failed:", userError)
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        { status: 401 },
      )
    }

    // Check if the user has claimed this profile
    const { data: athlete, error: athleteError } = await supabase
      .from("athletes")
      .select("id, name, claimed_by_user_id, profile_verified")
      .eq("id", athleteId)
      .single()

    if (athleteError || !athlete) {
      console.error("✅ VERIFY PROFILE: Athlete not found:", athleteError)
      return NextResponse.json(
        {
          error: "Athlete profile not found",
        },
        { status: 404 },
      )
    }

    if (athlete.claimed_by_user_id !== user.id) {
      console.error("✅ VERIFY PROFILE: User doesn't own this profile")
      return NextResponse.json(
        {
          error: "You can only verify profiles you have claimed",
        },
        { status: 403 },
      )
    }

    if (athlete.profile_verified) {
      return NextResponse.json({
        success: true,
        message: "Profile is already verified",
        alreadyVerified: true,
      })
    }

    // Mark the profile as verified
    const { error: updateError } = await supabase
      .from("athletes")
      .update({
        profile_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq("id", athleteId)

    if (updateError) {
      console.error("✅ VERIFY PROFILE: Error updating athlete:", updateError)
      return NextResponse.json(
        {
          error: "Failed to verify profile",
        },
        { status: 500 },
      )
    }

    console.log("✅ VERIFY PROFILE: Success! Profile verified by:", user.email)
    return NextResponse.json({
      success: true,
      message: "Profile verified successfully!",
      athleteId,
      athleteName: athlete.name,
      userId: user.id,
    })
  } catch (error) {
    console.error("✅ VERIFY PROFILE: Exception:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
