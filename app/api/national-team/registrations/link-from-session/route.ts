import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

/**
 * POST: Link the registration from a completed Stripe checkout session to the current user.
 * Called from the success page when the user lands with session_id and is logged in.
 * Ensures they have hub access (parent_user_id set) without waiting for webhook or hub visit.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !authUser?.id || !authUser?.email) {
    return NextResponse.json({ linked: false, reason: "signed_out" }, { status: 401 })
  }

  let body: { session_id?: string }
  try {
    body = await request.json().catch(() => ({}))
  } catch {
    return NextResponse.json({ linked: false, reason: "invalid_body" }, { status: 400 })
  }
  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : ""
  if (!sessionId) {
    return NextResponse.json({ linked: false, reason: "missing_session_id" }, { status: 400 })
  }

  if (!stripeSecret) {
    return NextResponse.json({ linked: false, reason: "stripe_not_configured" }, { status: 503 })
  }

  const stripe = new Stripe(stripeSecret)
  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: [] })
  } catch (e) {
    console.error("[national-team/link-from-session] Stripe retrieve:", e)
    return NextResponse.json({ linked: false, reason: "invalid_session" }, { status: 400 })
  }

  const registrationId = session.metadata?.registration_id
  if (session.metadata?.source !== "national_team" || !registrationId) {
    return NextResponse.json({ linked: false, reason: "not_national_team" }, { status: 400 })
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ linked: false, reason: "not_paid" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: reg, error: regError } = await admin
    .from("national_team_event_registrations")
    .select("id, parent_email, parent_user_id, status")
    .eq("id", registrationId)
    .single()

  if (regError || !reg) {
    return NextResponse.json({ linked: false, reason: "registration_not_found" }, { status: 404 })
  }

  const customerEmail = (session.customer_email ?? (session.customer_details as { email?: string })?.email ?? "")
    .trim()
    .toLowerCase()
  const userEmail = (authUser.email ?? "").trim().toLowerCase()
  const regParentEmail = ((reg as { parent_email?: string }).parent_email ?? "").trim().toLowerCase()
  const emailOk =
    userEmail &&
    (userEmail === customerEmail ||
      userEmail === regParentEmail ||
      (customerEmail && customerEmail === regParentEmail))
  if (!emailOk) {
    return NextResponse.json({ linked: false, reason: "email_mismatch" }, { status: 403 })
  }

  const row = reg as { parent_user_id?: string | null; status?: string }
  if (row.parent_user_id === authUser.id) {
    return NextResponse.json({ linked: true, already: true })
  }

  const { error: updateErr } = await admin
    .from("national_team_event_registrations")
    .update({
      parent_user_id: authUser.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", registrationId)

  if (updateErr) {
    console.error("[national-team/link-from-session] update:", updateErr)
    return NextResponse.json({ linked: false, reason: "update_failed" }, { status: 500 })
  }

  return NextResponse.json({ linked: true })
}
