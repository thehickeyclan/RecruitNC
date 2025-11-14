import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log("Authentication failed:", userError?.message)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("Authenticated user:", user.email)

    // First check if the user_profiles table exists
    const { data: tableExists, error: tableError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "user_profiles")

    if (tableError || !tableExists || tableExists.length === 0) {
      console.log("user_profiles table does not exist")
      return NextResponse.json(
        {
          error: "user_profiles table does not exist",
          needsSetup: true,
        },
        { status: 404 },
      )
    }

    // Check if user profile exists and get admin status
    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin, full_name, email")
      .eq("user_id", user.id)
      .single()

    if (profileError) {
      console.log("User profile not found:", profileError.message)
      return NextResponse.json({ error: "User profile not found" }, { status: 403 })
    }

    console.log("User profile found:", userProfile)

    const { searchParams } = new URL(request.url)
    const signedUpToday = searchParams.get("signedUpToday") === "true"
    const loggedInToday = searchParams.get("loggedInToday") === "true"

    // Get all user profiles
    let query = supabase.from("user_profiles").select("*").order("created_at", { ascending: false })

    if (signedUpToday) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      query = query.gte("created_at", today.toISOString())
    }

    if (loggedInToday) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      query = query.gte("last_login_at", today.toISOString())
    }

    const { data: users, error } = await query

    if (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`Found ${users?.length || 0} users`)
    return NextResponse.json({ users: users || [] })
  } catch (error: any) {
    console.error("Users API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
