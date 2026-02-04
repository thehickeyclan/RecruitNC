import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
    }

    const adminSupabase = createAdminClient()
    // Delete/update related records first (avoid FK violations)
    const relatedTables = [
      { table: "matches", column: "athlete_id" },
      { table: "likes", column: "athlete_id" },
      { table: "edit_requests", column: "athlete_id" },
      { table: "recruiting_actions", column: "athlete_id" },
      { table: "college_coach_stars", column: "athlete_id" },
      { table: "athlete_confirmations", column: "athlete_id" },
    ]
    for (const { table, column } of relatedTables) {
      const { error: relErr } = await adminSupabase.from(table).delete().eq(column, id)
      if (relErr) {
        console.warn(`[DELETE athlete] Could not clean ${table}:`, relErr.message)
        // Continue - table might not exist or column name may differ
      }
    }
    // Unlink user_profiles that reference this athlete
    await adminSupabase.from("user_profiles").update({ athlete_id: null }).eq("athlete_id", id)

    const { error } = await adminSupabase.from("athletes").delete().eq("id", id)

    if (error) {
      console.error("Error deleting athlete:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/athletes/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminSupabase = createAdminClient()

    // Use admin client to bypass RLS for public profile access
    const { data: athlete, error } = await adminSupabase
      .from("athletes")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    return NextResponse.json(athlete)
  } catch (error) {
    console.error("Error fetching athlete:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error as Error).message },
      { status: 500 }
    )
  }
}
