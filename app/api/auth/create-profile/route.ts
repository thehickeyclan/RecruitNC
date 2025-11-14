import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, email, cellPhone, role } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !cellPhone || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
        cell_phone: cellPhone,
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (profileError) {
      console.error("Profile creation error:", profileError)
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile,
      message: "Profile created successfully",
    })
  } catch (error) {
    console.error("Create profile error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
