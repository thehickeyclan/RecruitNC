/**
 * Charitable acknowledgment emails for Spartan Checkouts. Requires Resend + Stripe; optional DB log table:
 *
 * create table if not exists public.spartan_donation_receipt_emails (
 *   checkout_session_id text primary key,
 *   sent_at timestamptz not null default now(),
 *   recipient_email text not null
 * );
 * alter table public.spartan_donation_receipt_emails enable row level security;
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import {
  buildNcuDonationAcknowledgmentHtml,
  sendNcuDonationAcknowledgmentEmail,
} from "@/lib/email/ncu-donation-acknowledgment"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { stripeSpartanCampaignMetadataMatchesRequested } from "@/lib/fundraising/campaign-registry"
import { SPARTAN_FAYETTEVILLE_CAMPAIGN } from "@/lib/spartan-fayetteville-stripe"
import { isFundraisingReceiptsPaused } from "@/lib/fundraising/fundraising-pause"

export const dynamic = "force-dynamic"

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, status: 401, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false, status: 403, error: "Admin required" }
  return { ok: true }
}

function normEmail(s: string) {
  return s.trim().toLowerCase()
}

type Body = {
  action: "preview" | "send"
  sessionId?: string
  firstName?: string
  amountCents?: number
  currency?: string
  /** ISO — date shown in letter (US long form, America/New_York) */
  donationDateIso?: string
  recipientEmail?: string
}

/**
 * POST preview: build acknowledgment HTML (no email). Admin-only.
 * POST send: verify Stripe session (paid, Spartan campaign, amount + email), send Resend, log to spartan_donation_receipt_emails.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : ""
  const amountCents = Number(body.amountCents)
  const donationDateIso = typeof body.donationDateIso === "string" ? body.donationDateIso.trim() : ""
  const recipientEmail = typeof body.recipientEmail === "string" ? body.recipientEmail.trim() : ""

  if (!firstName || firstName.length > 80) {
    return NextResponse.json({ error: "firstName is required (max 80 chars)." }, { status: 400 })
  }
  if (!Number.isFinite(amountCents) || amountCents < 1 || amountCents > 50_000_000) {
    return NextResponse.json({ error: "amountCents is invalid." }, { status: 400 })
  }
  if (!donationDateIso || Number.isNaN(Date.parse(donationDateIso))) {
    return NextResponse.json({ error: "donationDateIso must be a valid ISO date." }, { status: 400 })
  }
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return NextResponse.json({ error: "A valid recipientEmail is required." }, { status: 400 })
  }

  if (body.action === "preview") {
    const { html, text, subject, from } = buildNcuDonationAcknowledgmentHtml({
      firstName,
      amountCents,
      donationDateIso,
    })
    return NextResponse.json({
      ok: true,
      preview: { html, text, subject, to: recipientEmail, from },
    })
  }

  if (body.action !== "send") {
    return NextResponse.json({ error: "action must be preview or send" }, { status: 400 })
  }

  if (isFundraisingReceiptsPaused()) {
    return NextResponse.json(
      { error: "Receipt sending is temporarily paused (RECRUITNC_FUNDRAISING_RECEIPTS_PAUSED)." },
      { status: 503 },
    )
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "sessionId must be a Stripe Checkout Session id (cs_…)." }, { status: 400 })
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret?.trim()) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 500 })
  }

  const stripe = new Stripe(stripeSecret)
  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    return NextResponse.json({ error: "Could not load this Checkout session from Stripe." }, { status: 400 })
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Checkout session is not paid." }, { status: 400 })
  }
  if (!stripeSpartanCampaignMetadataMatchesRequested(session.metadata?.spartan_campaign, SPARTAN_FAYETTEVILLE_CAMPAIGN)) {
    return NextResponse.json({ error: "Not a Fayetteville Spartan campaign session." }, { status: 400 })
  }
  const expectedTotal = session.amount_total ?? 0
  if (expectedTotal !== amountCents) {
    return NextResponse.json(
      {
        error: `Amount does not match Stripe (${(expectedTotal / 100).toFixed(2)} vs your ${(amountCents / 100).toFixed(2)}). Refresh the list and try again.`,
      },
      { status: 400 },
    )
  }

  const stripeEmail =
    session.customer_details?.email?.trim() || (typeof session.customer_email === "string" ? session.customer_email.trim() : "")
  if (!stripeEmail) {
    return NextResponse.json({ error: "Stripe session has no customer email." }, { status: 400 })
  }
  if (normEmail(stripeEmail) !== normEmail(recipientEmail)) {
    return NextResponse.json(
      { error: `Recipient email must match Stripe (${stripeEmail}).` },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const send = await sendNcuDonationAcknowledgmentEmail({
    to: recipientEmail,
    firstName,
    amountCents,
    donationDateIso,
  })

  if (!send.success) {
    return NextResponse.json({ error: send.error }, { status: 500 })
  }

  const { error: logErr } = await admin.from("spartan_donation_receipt_emails").upsert(
    {
      checkout_session_id: sessionId,
      recipient_email: recipientEmail,
      sent_at: new Date().toISOString(),
    },
    { onConflict: "checkout_session_id" },
  )

  if (logErr) {
    console.error("[spartan-donation-receipt] log upsert:", logErr.message)
    return NextResponse.json(
      {
        ok: true,
        warning: "Email sent but failed to log in database — run scripts/spartan-donation-receipt-emails.sql if missing table.",
      },
      { status: 200 },
    )
  }

  return NextResponse.json({ ok: true })
}
