import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** GET: Search athletes by name for parent linking. Query: q= (min 2 chars). Auth required. */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") ?? "").trim()
  if (q.length < 2) {
    return NextResponse.json({ athletes: [] })
  }

  const { data: links } = await supabase
    .from("parent_athlete_links")
    .select("athlete_id")
    .eq("user_id", user.id)
  const linkedIds = new Set((links ?? []).map((r) => r.athlete_id))

  const { data: athletes, error } = await supabase
    .from("athletes")
    .select("id, name, highschool, graduationyear")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(15)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = (athletes ?? []).map((a) => ({
    id: a.id,
    name: a.name ?? "—",
    highschool: a.highschool ?? null,
    graduationyear: a.graduationyear ?? null,
    alreadyLinked: linkedIds.has(a.id),
  }))
  return NextResponse.json({ athletes: list })
}
