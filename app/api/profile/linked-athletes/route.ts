import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getWalletAthleteIdsForParentUser } from "@/lib/parent-spartan-fundraising-totals"

export const dynamic = "force-dynamic"

/** GET: Athletes linked to this account (profile athlete_id + parent_athlete_links), same scope as the digital wallet. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()
  let athleteIds: string[]
  try {
    athleteIds = await getWalletAthleteIdsForParentUser(admin, user.id)
  } catch (e) {
    console.error("[profile/linked-athletes]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 })
  }

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
