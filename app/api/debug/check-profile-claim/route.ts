import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const userId = searchParams.get("userId")

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    let athletes = []

    if (query) {
      // Search for specific athlete
      const { data, error } = await supabase
        .from("athletes")
        .select(
          `
          id,
          name,
          college,
          highschool,
          graduationyear,
          weightclass,
          gender,
          commitmentdate,
          photourl,
          claimed_by_user_id,
          claimed_at,
          profile_verified
        `,
        )
        .or(`name.ilike.%${query}%,college.ilike.%${query}%,highschool.ilike.%${query}%`)
        .order("name")

      if (error) {
        console.error("Database error:", error)
        return NextResponse.json({ error: "Database query failed" }, { status: 500 })
      }

      athletes = data || []
    }

    // Get user's claimed profiles if userId provided
    let userClaimedProfiles = []
    if (userId) {
      const { data: claimedData, error: claimedError } = await supabase
        .from("athletes")
        .select(
          `
          id,
          name,
          college,
          highschool,
          graduationyear,
          weightclass,
          gender,
          commitmentdate,
          photourl,
          claimed_by_user_id,
          claimed_at,
          profile_verified
        `,
        )
        .eq("claimed_by_user_id", userId)
        .order("claimed_at", { ascending: false })

      if (!claimedError) {
        userClaimedProfiles = claimedData || []
      }
    }

    return NextResponse.json({
      athletes,
      userClaimedProfiles,
      currentUserId: user.id,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
