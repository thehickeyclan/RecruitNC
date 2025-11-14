import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated and is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { coachId, schoolId } = await request.json()

    if (!coachId || !schoolId) {
      return NextResponse.json({ error: "Coach ID and School ID are required" }, { status: 400 })
    }

    const adminSupabase = createServiceRoleClient()

    // Update the coach's school_id
    const { error: updateError } = await adminSupabase
      .from("user_profiles")
      .update({ school_id: schoolId })
      .eq("id", coachId)

    if (updateError) {
      console.error("[v0] Error updating coach school:", updateError)
      return NextResponse.json({ error: "Failed to update school assignment" }, { status: 500 })
    }

    console.log(`[v0] Successfully updated coach ${coachId} with school ${schoolId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
