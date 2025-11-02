import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get the current user
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

    // Get total athlete count
    const { count, error: countError } = await supabase.from("athletes").select("*", { count: "exact", head: true })

    if (countError) {
      console.error("Error counting athletes:", countError)
      return NextResponse.json({ error: "Failed to count athletes" }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error("Error in athletes stats API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
