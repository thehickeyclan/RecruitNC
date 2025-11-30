import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function PUT(request: Request) {
  try {
    const supabase = createClient()

    // Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminCheck, error: adminError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()

    if (adminError || !adminCheck?.is_admin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    const { id, is_admin } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Use service role client to bypass RLS for admin operations
    const supabaseAdmin = createServiceRoleClient()

    // Update admin status
    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        is_admin,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("Error updating admin status:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Toggle admin error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
