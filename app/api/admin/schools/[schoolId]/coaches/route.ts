import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { schoolId: string } }) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Count coaches for this school
    const { count, error } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("school_id", params.schoolId)
      .eq("role", "coach")

    if (error) {
      console.error("Error counting coaches:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error("Error in coaches count route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
