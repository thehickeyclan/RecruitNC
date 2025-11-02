import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("[v0] Fetching user profiles...")
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      console.log("[v0] No session found, returning 401")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", session.user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    console.log("[v0] Admin verified, fetching all users with service role...")

    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      console.error("[v0] Error fetching auth users:", authError)
      return NextResponse.json(
        {
          error: "Failed to fetch users",
          details: authError.message,
        },
        { status: 500 },
      )
    }

    const { data: userProfiles, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, full_name, role, profile_type, cell_phone, is_admin")

    if (profileError) {
      console.error("[v0] Error fetching user profiles:", profileError)
    }

    // Create a map of user profiles for quick lookup
    const profileMap = new Map(userProfiles?.map((p) => [p.user_id, p]) || [])

    // Combine auth users with profile data
    const combinedProfiles = authUsers.users.map((user) => {
      const profile = profileMap.get(user.id)
      return {
        user_id: user.id,
        email: user.email || "",
        name: profile?.full_name || user.email?.split("@")[0] || "Unknown",
        full_name: profile?.full_name || user.email?.split("@")[0] || "Unknown",
        role: profile?.role || profile?.profile_type || "fan",
        cell_phone: profile?.cell_phone || null,
        is_admin: profile?.is_admin || false,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || null,
      }
    })

    console.log(`[v0] Successfully fetched ${combinedProfiles.length} user profiles`)
    console.log(`[v0] Sample profile:`, combinedProfiles[0])

    return NextResponse.json({
      success: true,
      profiles: combinedProfiles,
      count: combinedProfiles.length,
    })
  } catch (error: any) {
    console.error("[v0] Exception in profiles API:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
