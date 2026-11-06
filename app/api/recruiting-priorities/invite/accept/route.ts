import { NextResponse, type NextRequest } from "next/server"

import { loadClaimAccount, relationshipForRole } from "@/lib/account-claim-role"
import { siteFromRequest } from "@/lib/analytics-site"
import { claimProfile } from "@/lib/profile-claim"
import { joinState, verifyInviteToken } from "@/lib/recruiting/priorities/invite-link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * The wrestler accepts their parent's invite: { a, t, consent: true }. Their own signed-in wrestler
 * account takes the profile as "self" through claimProfile (consent row, review flags, waiting
 * coach messages), the same as every other claim. A parent's account is refused: the athlete set
 * must be the wrestler's own view.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { a?: unknown; t?: unknown; consent?: unknown } | null
  const athleteId = typeof body?.a === "string" ? body.a : ""
  const validLink = verifyInviteToken(athleteId, typeof body?.t === "string" ? body.t : null)
  const admin = createAdminClient()
  const { data: auth } = await (await createClient()).auth.getUser()
  const userId = auth.user?.id ?? null
  const [account, link, athlete] = await Promise.all([
    userId ? loadClaimAccount(admin, userId) : Promise.resolve(null),
    userId && validLink ? admin.from("parent_athlete_links").select("athlete_id").eq("user_id", userId).eq("athlete_id", athleteId).maybeSingle().then((r) => r.data) : Promise.resolve(null),
    validLink ? admin.from("athletes").select("claimed_by_user_id").eq("id", athleteId).maybeSingle().then((r) => r.data) : Promise.resolve(null),
  ])
  const state = joinState({
    validLink,
    userId,
    relationship: account ? relationshipForRole({ role: account.role, profile_type: account.profileType }, null) : null,
    linkedParent: Boolean(link),
    claimedBy: athlete?.claimed_by_user_id ? String(athlete.claimed_by_user_id) : null,
  })
  if (state === "already_yours") return NextResponse.json({ ok: true })
  if (state !== "ready") return NextResponse.json({ error: state }, { status: state === "sign_in" ? 401 : 403 })
  if (body?.consent !== true) return NextResponse.json({ error: "Tick the box to confirm." }, { status: 400 })

  const result = await claimProfile(admin, {
    userId: userId!,
    athleteId,
    relationship: "self",
    viewerName: account?.fullName ?? null,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
    reviewNote: "joined from a parent's What matters invite",
    site: siteFromRequest(request),
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ ok: true })
}
