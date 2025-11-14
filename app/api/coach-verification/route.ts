import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const {
      fullName,
      institution,
      coachingPosition,
      yearsExperience,
      coachingCredentials,
      referencesContact,
      additionalInfo,
    } = body

    // Create coach verification request
    const { data, error } = await supabase
      .from("coach_verification_requests")
      .insert({
        user_id: user.id,
        full_name: fullName,
        email: user.email,
        institution,
        coaching_position: coachingPosition,
        years_experience: yearsExperience ? Number.parseInt(yearsExperience) : null,
        coaching_credentials: coachingCredentials,
        references_contact: referencesContact,
        additional_info: additionalInfo,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating verification request:", error)
      return NextResponse.json({ error: "Failed to submit verification request" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Coach verification request submitted successfully",
      data,
    })
  } catch (error) {
    console.error("Coach verification API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get all verification requests
    const { data: requests, error } = await supabase
      .from("coach_verification_requests")
      .select(`
        *,
        user_profiles!inner(full_name, email)
      `)
      .order("submitted_at", { ascending: false })

    if (error) {
      console.error("Error fetching verification requests:", error)
      return NextResponse.json({ error: "Failed to fetch verification requests" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      requests: requests || [],
    })
  } catch (error) {
    console.error("Coach verification GET API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
