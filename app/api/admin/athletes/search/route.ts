import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isRecruitNCAdmin } from "@/lib/admin"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await isRecruitNCAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const limit = parseInt(searchParams.get("limit") || "10", 10)

    if (query.length < 2) {
      return NextResponse.json({ athletes: [] })
    }

    const admin = createAdminClient()

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

    return NextResponse.json({
      athletes: (athletes || []).map((a) => ({
        id: a.id,
        name: a.name,
        photourl: a.photourl,
        graduationyear: a.graduationyear,
        weightclass: a.weightclass,
        highschool: a.highschool,
      })),
    })
  } catch (err) {
    console.error("[admin/athletes/search] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
