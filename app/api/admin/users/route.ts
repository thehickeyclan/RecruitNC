import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getCachedAdminCheck } from "@/lib/cached-auth-check"

export async function GET(request: Request) {
  try {
    // Use cached auth check to reduce Supabase API calls
    const authCheck = await getCachedAdminCheck()
    
    if (authCheck.response) {
      return authCheck.response
    }

    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    console.log("Authenticated user:", authCheck.user?.email, "(cached auth check)")

    const supabase = await createClient()

    // First check if the user_profiles table exists by trying to query it
    const { data: testQuery, error: tableError } = await supabase
      .from("user_profiles")
      .select("id")
      .limit(1)

    if (tableError && tableError.code === "42P01") {
      // Table doesn't exist (PostgreSQL error code for undefined table)
      console.log("user_profiles table does not exist")
      return NextResponse.json(
        {
          error: "user_profiles table does not exist",
          needsSetup: true,
          users: [],
        },
        { status: 200 }, // Return 200 with empty array instead of 404
      )
    }

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
