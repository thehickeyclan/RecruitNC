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

  if (athleteIds.length === 0) return NextResponse.json({ athletes: [], profileAthleteId: null as string | null })

  const { data: prof } = await admin.from("user_profiles").select("athlete_id").eq("user_id", user.id).maybeSingle()
  const profileAthleteId =
    typeof (prof as { athlete_id?: string | null } | null)?.athlete_id === "string"
      ? String((prof as { athlete_id: string }).athlete_id).trim() || null
      : null

  const { data: linkRows, error: linkErr } = await admin
    .from("parent_athlete_links")
    .select("athlete_id")
    .eq("user_id", user.id)

  if (linkErr && linkErr.code !== "42P01") {
    console.error("[profile/linked-athletes] links", linkErr)
  }

  const linkedViaFamilyTable = new Set(
    (linkRows ?? [])
      .map((r) => String((r as { athlete_id?: string }).athlete_id ?? "").trim())
      .filter(Boolean),
  )

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
    canUnlink: linkedViaFamilyTable.has(String(a.id)),
    isProfilePrimaryAthlete: profileAthleteId != null && String(a.id) === profileAthleteId,
  }))

  return NextResponse.json({ athletes: list, profileAthleteId })
}
