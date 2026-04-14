import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** GET: List athletes linked to the current user (parent) via parent_athlete_links. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: links, error: linkError } = await supabase
    .from("parent_athlete_links")
    .select("athlete_id")
    .eq("user_id", user.id)

  if (linkError) {
    if (linkError.code === "42P01") return NextResponse.json({ athletes: [] })
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  const athleteIds = [...new Set((links ?? []).map((r) => r.athlete_id))]
  if (athleteIds.length === 0) return NextResponse.json({ athletes: [] })

  const { data: athletes, error: athleteError } = await supabase
    .from("athletes")
    .select("id, name, profile_verified, updated_at, claimed_by_user_id")
    .in("id", athleteIds)

  if (athleteError) return NextResponse.json({ error: athleteError.message }, { status: 500 })

  const list = (athletes ?? []).map((a) => ({
    id: a.id,
    name: a.name ?? "—",
    profileVerified: !!a.profile_verified,
    updatedAt: a.updated_at ?? null,
    claimedByUserId: (a as Record<string, unknown>).claimed_by_user_id as string | null ?? null,
  }))

  return NextResponse.json({ athletes: list })
}
