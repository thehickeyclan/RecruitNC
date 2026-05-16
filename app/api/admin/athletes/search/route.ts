import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    // Verify admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    if (query.length < 2) {
      return NextResponse.json({ athletes: [] })
    }

    const admin = createAdminClient()

    // Search athletes by name (case insensitive)
    const { data: athletes, error } = await admin
      .from("athletes")
      .select("id, name, photourl, graduationyear, weightclass, highschool")
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(limit)

    if (error) {
      console.error("[admin/athletes/search] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ athletes: athletes || [] })
  } catch (err) {
    console.error("[admin/athletes/search] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
