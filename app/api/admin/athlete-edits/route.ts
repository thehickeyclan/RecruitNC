import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const adminSupabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "500")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Get total count first
    const { count } = await adminSupabase
      .from("athlete_audit_log")
      .select("*", { count: "exact", head: true })
      .eq("change_type", "athlete_edit")

    // Get recent athlete edits
    const { data: edits, error: editsError } = await adminSupabase
      .from("athlete_audit_log")
      .select("*")
      .eq("change_type", "athlete_edit")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (editsError) {
      console.error("Error fetching athlete edits:", editsError)
      return NextResponse.json({ error: "Failed to fetch edits" }, { status: 500 })
    }

    // Get athlete and user info separately
    let enrichedEdits = edits || []
    if (edits && edits.length > 0) {
      const athleteIds = [...new Set(edits.map(e => e.athlete_id))]
      const userIds = [...new Set(edits.map(e => e.user_id))]

      const { data: athletes } = await adminSupabase
        .from("athletes")
        .select("id, name")
        .in("id", athleteIds)

      const { data: users } = await adminSupabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds)

      // Enrich edits with athlete and user info
      enrichedEdits = edits.map(edit => ({
        ...edit,
        athlete: athletes?.find(a => a.id === edit.athlete_id),
        editor: users?.find(u => u.user_id === edit.user_id),
      }))
    }

    return NextResponse.json({
      success: true,
      edits: enrichedEdits,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error in athlete edits API:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error as Error).message },
      { status: 500 }
    )
  }
}

