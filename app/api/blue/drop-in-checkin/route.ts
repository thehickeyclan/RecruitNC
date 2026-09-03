import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { collectLinkedAthleteIdsForParentUser } from "@/lib/parent-spartan-fundraising-totals"
import { buildMembershipCard, DROP_IN_WINDOW_DAYS, type MembershipRow } from "@/lib/blue/membership-card"

export const dynamic = "force-dynamic"

/**
 * A partner club recording that a Blue member took their free drop-in.
 *
 * The coach taps the member's own card — no scanner, nothing for the club to install, and the
 * person recording the visit is the one who watched it happen. Location was considered and
 * rejected: it would have meant tracking children's whereabouts to catch something a tap catches
 * for free, and being near a club is not the same as training there.
 *
 * The record is evidence, not a turnstile. A busy door that forgets to tap leaves no row, so an
 * empty log proves nothing about attendance — it supports a conversation with a partner club
 * rather than settling one.
 */
export async function POST(request: NextRequest) {
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

  const body = (await request.json().catch(() => null)) as { athleteId?: unknown; clubName?: unknown } | null
  const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : ""
  const clubName = typeof body?.clubName === "string" ? body.clubName.trim().slice(0, 120) : ""
  if (!athleteId || !clubName) {
    return NextResponse.json({ error: "Which athlete, and which club?" }, { status: 400 })
  }

  const admin = createAdminClient()

  /** The card being tapped must belong to the account showing it. */
  const linked = await collectLinkedAthleteIdsForParentUser(admin, user.id)
  if (!linked.includes(athleteId)) {
    return NextResponse.json({ error: "That is not your card." }, { status: 403 })
  }

  const [{ data: stripeRows }, { data: wiqRows }, { data: existing }] = await Promise.all([
    admin.from("blue_memberships").select("status, started_at, next_billing_at, updated_at").eq("athlete_id", athleteId),
    admin
      .from("blue_wiq_subscriptions")
      .select("status, member_since, next_due_at, active_until, last_import_at")
      .eq("athlete_id", athleteId),
    admin
      .from("blue_drop_in_checkins")
      .select("checked_in_at, club_name")
      .eq("athlete_id", athleteId)
      .order("checked_in_at", { ascending: false }),
  ])

  const memberships: MembershipRow[] = [
    ...(stripeRows ?? []).map((row) => ({
      source: "stripe" as const,
      status: row.status,
      startedAt: row.started_at,
      nextBillingAt: row.next_billing_at,
      lastSyncedAt: row.updated_at,
    })),
    ...(wiqRows ?? []).map((row) => ({
      source: "wiq" as const,
      status: row.status,
      startedAt: row.member_since,
      nextBillingAt: row.next_due_at,
      activeUntil: row.active_until,
      lastSyncedAt: row.last_import_at,
    })),
  ]

  const card = buildMembershipCard({
    memberships,
    checkIns: (existing ?? []).map((row) => ({ checkedInAt: row.checked_in_at, clubName: row.club_name })),
    now: new Date(),
  })

  /** Checked on the server too: the card in front of the coach could be an old render. */
  if (!card.dropInEligible) {
    return NextResponse.json(
      {
        error:
          card.status !== "active"
            ? "This membership is not active."
            : `Already used in the last ${DROP_IN_WINDOW_DAYS} days.`,
        card,
      },
      { status: 409 },
    )
  }

  const { error } = await admin.from("blue_drop_in_checkins").insert({
    athlete_id: athleteId,
    club_name: clubName,
    checked_in_at: new Date().toISOString(),
    recorded_by_user_id: user.id,
  })
  if (error) {
    console.error("[blue/drop-in-checkin]", error.message)
    return NextResponse.json({ error: "Could not record that. Try again." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
