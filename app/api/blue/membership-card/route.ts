import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { collectLinkedAthleteIdsForParentUser } from "@/lib/parent-spartan-fundraising-totals"
import { buildMembershipCard, type MembershipRow } from "@/lib/blue/membership-card"

export const dynamic = "force-dynamic"

/**
 * The Blue membership card for whoever is signed in.
 *
 * One card per athlete they are linked to, because a parent with two wrestlers needs to show two
 * cards at a door. Membership is read from both billing systems and collapsed by
 * {@link buildMembershipCard}, so a family cannot tell — and does not need to — which one they are
 * on.
 *
 * The app sends a bearer token; the website sends a cookie. Both land here.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  let {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (token) {
      const { data } = await supabase.auth.getUser(token)
      user = data.user
    }
  }
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const admin = createAdminClient()

  let athleteIds: string[]
  try {
    athleteIds = await collectLinkedAthleteIdsForParentUser(admin, user.id)
  } catch (e) {
    console.error("[blue/membership-card] linked athletes:", e)
    return NextResponse.json({ error: "Could not load your athletes." }, { status: 500 })
  }
  if (athleteIds.length === 0) return NextResponse.json({ cards: [] })

  const [{ data: athletes }, { data: stripeRows }, { data: wiqRows }, { data: checkIns }] = await Promise.all([
    admin.from("athletes").select("id, name, photourl, graduationyear").in("id", athleteIds),
    admin
      .from("blue_memberships")
      .select("athlete_id, status, started_at, next_billing_at, updated_at")
      .in("athlete_id", athleteIds),
    admin
      .from("blue_wiq_subscriptions")
      .select("athlete_id, status, member_since, next_due_at, active_until, last_import_at, updated_at")
      .in("athlete_id", athleteIds),
    admin
      .from("blue_drop_in_checkins")
      .select("athlete_id, checked_in_at, club_name")
      .in("athlete_id", athleteIds)
      .order("checked_in_at", { ascending: false }),
  ])

  const now = new Date()
  const cards = (athletes ?? []).map((athlete) => {
    const memberships: MembershipRow[] = [
      ...(stripeRows ?? [])
        .filter((row) => row.athlete_id === athlete.id)
        .map((row) => {
          return {
            source: "stripe" as const,
            status: row.status,
            startedAt: row.started_at,
            nextBillingAt: row.next_billing_at,
            lastSyncedAt: row.updated_at,
          }
        }),
      ...(wiqRows ?? [])
        .filter((row) => row.athlete_id === athlete.id)
        .map((row) => {
          return {
            source: "wiq" as const,
            status: row.status,
            startedAt: row.member_since,
            nextBillingAt: row.next_due_at,
            activeUntil: row.active_until,
            /** The import stamp, not updated_at: a row can be rewritten without being re-confirmed. */
            lastSyncedAt: row.last_import_at,
          }
        }),
    ]

    const athleteCheckIns = (checkIns ?? [])
      .filter((row) => row.athlete_id === athlete.id)
      .map((row) => ({ checkedInAt: row.checked_in_at, clubName: row.club_name }))

    return {
      athleteId: athlete.id,
      name: athlete.name,
      photoUrl: athlete.photourl,
      graduationYear: athlete.graduationyear,
      ...buildMembershipCard({ memberships, checkIns: athleteCheckIns, now }),
    }
  })

  /** An athlete with no Blue membership at all has no card to show. */
  return NextResponse.json({ cards: cards.filter((c) => c.status !== "inactive" || c.memberSince) })
}
