import { NextResponse, type NextRequest } from "next/server"
import { parseCoachProgram, programPhrase } from "@/lib/recruiting/coach-program"
import { setCoachProgram } from "@/lib/recruiting/coach-program-server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { decideCompleteProfile } from "@/lib/complete-profile"
import { notifyStaffCoachSignup } from "@/lib/staff-alerts-sms"
import { assignCoachCollege, collegeResultNote } from "@/lib/coach-college"

/**
 * "Who are you?", for accounts that arrived without saying.
 *
 * The password form asks for a profile type on the way in. The Google button asks nothing — one
 * tap and you are signed in — so a Google account lands with no role at all: not an athlete, not
 * a parent, and in particular not a college coach. A coach who signs in that way is invisible to
 * the approval queue and gets none of the access they came for.
 *
 * So this is the same question, asked once, afterwards. Every rule about what an answer earns
 * lives in `lib/complete-profile.ts`, where it is tested; this route only carries it out.
 */

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("user_profiles")
    .select("user_id, role, verified_coach, is_admin, full_name")
    .eq("user_id", user.id)
    .maybeSingle()

  // An admin arriving here would be demoted by the write below. Send them on untouched.
  if (existing?.is_admin) {
    return NextResponse.json({ ok: true, role: existing.role, verifiedCoach: true, redirectTo: "/admin" })
  }

  const decision = decideCompleteProfile({
    requestedType: String(body?.profileType ?? ""),
    existingRole: existing?.role,
    email: user.email,
  })
  if (!decision.ok) {
    return NextResponse.json({ ok: false, error: decision.error }, { status: decision.status })
  }

  const patch: Record<string, unknown> = {
    role: decision.role,
    profile_type: String(body?.profileType ?? "").trim(),
  }
  const cellPhone = String(body?.cellPhone ?? "").trim()
  if (cellPhone) patch.cell_phone = cellPhone
  const institution = String(body?.institution ?? "").trim()
  if (institution) patch.institution = institution
  if (decision.verifiedCoach) {
    patch.verified_coach = true
    // Let in by the rule, not by a person. Stays on the review list until one looks.
    patch.verification_status = "pending"
  }

  const { error } = await admin.from("user_profiles").update(patch).eq("user_id", user.id)
  if (error) {
    console.error("[complete-profile] update failed:", error.message)
    return NextResponse.json({ ok: false, error: "Could not save that." }, { status: 500 })
  }

  console.log(
    `[complete-profile] ${user.email} -> role=${decision.role} verified_coach=${decision.verifiedCoach}`,
  )

  // A college coach is in before anybody has looked, so tell staff now - the same text the coach
  // sign-up form sends.
  // Which program a coach works with sets what they see first. Coaches only: nobody else has one.
  const program = decision.verifiedCoach ? parseCoachProgram(body?.program) : null
  if (program) {
    const failed = await setCoachProgram(admin, user.id, program)
    if (failed) console.error("[complete-profile] coach program not saved:", failed)
  }

  if (decision.verifiedCoach) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    const name =
      String(existing?.full_name ?? "").trim() ||
      String(meta.full_name ?? meta.name ?? "").trim() ||
      String(user.email ?? "")
    const assigned = await assignCoachCollege(admin, { userId: user.id, institution, email: user.email })
    await notifyStaffCoachSignup({
      name,
      college: institution || "college not given",
      email: String(user.email ?? ""),
      collegeNote: collegeResultNote(assigned),
      programLabel: programPhrase(program),
    }).catch(() => 0)
  }

  return NextResponse.json({
    ok: true,
    role: decision.role,
    verifiedCoach: decision.verifiedCoach,
    redirectTo: decision.redirectTo,
  })
}
