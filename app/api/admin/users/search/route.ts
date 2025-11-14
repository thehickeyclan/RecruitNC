import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    console.log("[v0] Searching users with query:", query)

    // Get all auth users (with names from auth metadata)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error("[v0] Error fetching auth users:", authError)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    // Get all user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, user_id, email, full_name, first_name, last_name, role, school_id, institution")

    if (profilesError) {
      console.error("[v0] Error fetching profiles:", profilesError)
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }

    // Merge auth users with profiles
    const users = authUsers.users.map((authUser) => {
      const profile = profiles?.find((p) => p.user_id === authUser.id)

      // Get name from profile first, fallback to auth metadata
      const fullName =
        profile?.full_name ||
        authUser.user_metadata?.full_name ||
        `${authUser.user_metadata?.first_name || ""} ${authUser.user_metadata?.last_name || ""}`.trim() ||
        authUser.email?.split("@")[0] ||
        "Unnamed User"

      return {
        id: authUser.id,
        email: authUser.email,
        full_name: fullName,
        role: profile?.role || null,
        school_id: profile?.school_id || null,
        institution: profile?.institution || null,
        profile_id: profile?.id || null,
      }
    })

    // Filter by search query
    const filteredUsers = query
      ? users.filter(
          (user) =>
            user.email?.toLowerCase().includes(query.toLowerCase()) ||
            user.full_name?.toLowerCase().includes(query.toLowerCase()),
        )
      : users

    console.log("[v0] Found users:", filteredUsers.length)

    return NextResponse.json({ users: filteredUsers })
  } catch (error: any) {
    console.error("[v0] Error in user search:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
