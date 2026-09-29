import { type NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { canonicalRole } from "@/lib/coach-auto-approve"
import { normalizePhoneForStorage } from "@/lib/phone-format"
import { notifyStaffCoachSignup } from "@/lib/staff-alerts-sms"

export const dynamic = "force-dynamic"

/**
 * College coach sign-up: first name, last name, email, cell, college, password. Nothing else.
 *
 * The old form asked for a password twice, years of experience, credentials, references and
 * "additional information" - and saved none of the last four. Coaches were being asked to write
 * references for a free account, and the general sign-up then held them behind an email link.
 *
 * Access first, review after. The coach is let straight in: the account is created with the
 * password they chose, already confirmed - no email link to click - and with `verified_coach` on,
 * which is what opens rankings and athlete profiles. The page then signs them in through
 * /api/auth/signin. `verification_status` stays "pending", so the users dashboard shows them as
 * Unreviewed until staff confirm or reject, and a text goes to staff the moment they sign up.
 * Rejecting turns `verified_coach` off.
 *
 * An existing account is never touched. Without an email check, taking an address that already
 * has an account would let anybody attach a coach request to someone else's login.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Honeypot: a field people never see. Bots fill it; answer as if it worked and do nothing.
  if (String(body.website ?? "").trim()) {
    return NextResponse.json({ success: true })
  }

  const firstName = String(body.firstName ?? "").trim()
  const lastName = String(body.lastName ?? "").trim()
  const email = String(body.email ?? "").trim().toLowerCase()
  const college = String(body.college ?? "").trim()
  const cellRaw = String(body.cellPhone ?? "").trim()
  const password = String(body.password ?? "")

  if (!firstName || !lastName || !email || !college || !cellRaw || !password) {
    return NextResponse.json({ error: "Please fill in every field." }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 })
  }
  if (cellRaw.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Enter a 10-digit cell number." }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 })
  }
  if ([firstName, lastName, college].some((v) => v.length > 120)) {
    return NextResponse.json({ error: "One of those fields is too long." }, { status: 400 })
  }

  const fullName = `${firstName} ${lastName}`
  const cellPhone = normalizePhoneForStorage(cellRaw)
  const admin = createAdminClient()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      profile_type: "college-coach",
      institution: college,
    },
  })

  if (createError || !created?.user) {
    const message = createError?.message ?? ""
    if (/already|registered|exists/i.test(message) || (createError as { status?: number })?.status === 422) {
      return NextResponse.json(
        {
          error:
            "There's already an account for that email. Sign in with it, or email info@ncwrestlingunited.com and we'll switch it to a coach account.",
        },
        { status: 409 },
      )
    }
    console.error("[coach-signup] createUser failed:", message)
    return NextResponse.json({ error: "We couldn't create the account. Please try again." }, { status: 500 })
  }

  const { error: profileError } = await admin.from("user_profiles").upsert(
    {
      user_id: created.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      cell_phone: cellPhone,
      role: canonicalRole("college-coach"),
      profile_type: "college-coach",
      institution: college,
      is_admin: false,
      verified_coach: true,
      verified_method: "coach_signup_form",
      verification_status: "pending",
      verification_requested_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )

  if (profileError) {
    // Without the profile row the coach never reaches the approval queue, so undo the login
    // rather than leave an account nobody can see.
    console.error("[coach-signup] profile upsert failed:", profileError.message)
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined)
    return NextResponse.json({ error: "We couldn't create the account. Please try again." }, { status: 500 })
  }

  await notifyStaffCoachSignup({ name: fullName, college, email }).catch(() => 0)

  return NextResponse.json({ success: true })
}
