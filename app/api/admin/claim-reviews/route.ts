import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Claims that looked wrong, and what happened to them.
 *
 * Flagging without a queue is theatre: the reason was written to the row and nothing ever read
 * it. A claim is allowed through because stopping a parent at a wall loses the parent, so the
 * only thing that makes the flag mean anything is somebody seeing it afterwards.
 */

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const all = new URL(request.url).searchParams.get("all") === "1"
  const db = createAdminClient()

  let q = db
    .from("profile_claim_consents")
    .select("id, athlete_id, user_id, relationship, signed_name, consent_version, ip_address, needs_review, review_reason, created_at")
    .order("created_at", { ascending: false })
    .limit(200)
  if (!all) q = q.eq("needs_review", true)

  const { data: rows, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const athleteIds = [...new Set((rows ?? []).map((r) => String(r.athlete_id)))]
  const userIds = [...new Set((rows ?? []).map((r) => String(r.user_id)))]
  const [{ data: athletes }, { data: users }] = await Promise.all([
    athleteIds.length
      ? db.from("athletes").select("id, name, graduationyear, highschool, claimed_by_user_id").in("id", athleteIds)
      : Promise.resolve({ data: [] as never[] }),
    userIds.length
      ? db.from("user_profiles").select("user_id, email, full_name").in("user_id", userIds)
      : Promise.resolve({ data: [] as never[] }),
  ])
  const A = new Map((athletes ?? []).map((a) => [String(a.id), a]))
  const U = new Map((users ?? []).map((u) => [String(u.user_id), u]))

  return NextResponse.json({
    claims: (rows ?? []).map((r) => {
      const a = A.get(String(r.athlete_id))
      const u = U.get(String(r.user_id))
      return {
        id: r.id,
        athleteId: r.athlete_id,
        athleteName: (a as { name?: string } | undefined)?.name ?? "(profile removed)",
        athleteClass: (a as { graduationyear?: number } | undefined)?.graduationyear ?? null,
        athleteSchool: (a as { highschool?: string } | undefined)?.highschool ?? null,
        stillClaimed: Boolean((a as { claimed_by_user_id?: string } | undefined)?.claimed_by_user_id),
        claimerEmail: (u as { email?: string } | undefined)?.email ?? r.user_id,
        claimerName: (u as { full_name?: string } | undefined)?.full_name ?? null,
        relationship: r.relationship,
        signedName: r.signed_name,
        reason: r.review_reason,
        needsReview: r.needs_review,
        ip: r.ip_address,
        at: r.created_at,
      }
    }),
  })
}

/** Clear a flag once a human has looked. The claim itself is untouched. */
export async function PATCH(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const body = (await request.json().catch(() => null)) as { id?: string } | null
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const { error } = await createAdminClient()
    .from("profile_claim_consents")
    .update({ needs_review: false })
    .eq("id", body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
