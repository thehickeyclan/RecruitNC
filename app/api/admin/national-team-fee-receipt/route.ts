/**
 * Admin: preview / send National Team (NHSCA) fee receipt email (Resend), verified against Stripe Checkout.
 *
 * Log table (Supabase SQL Editor) — required for “Receipt sent” badges; use PRIMARY KEY on registration_id:
 *
 * create table if not exists public.national_team_fee_receipt_emails (
 *   registration_id uuid primary key references public.national_team_event_registrations (id) on delete cascade,
 *   stripe_checkout_session_id text not null,
 *   recipient_email text not null,
 *   sent_at timestamptz not null default now()
 * );
 * create index if not exists national_team_fee_receipt_emails_sent_at_idx
 *   on public.national_team_fee_receipt_emails (sent_at desc);
 * alter table public.national_team_fee_receipt_emails enable row level security;
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  buildNcuNationalTeamFeeReceiptHtml,
  sendNcuNationalTeamFeeReceiptEmail,
} from "@/lib/email/ncu-national-team-fee-receipt"

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
  registrationId?: string
  firstName?: string
  amountCents?: number
  paymentDateIso?: string
  recipientEmail?: string
  athleteFullName?: string
  programLabel?: string
}

function programLabelFromSlug(eventSlug: string | null | undefined): string {
  const s = (eventSlug ?? "").trim()
  if (s === "nhsca-duals-2026-select") return "NHSCA Duals 2026 — Select team"
  if (s === "nhsca-duals-2026") return "NHSCA Duals 2026 — National team"
  return "National Team (NHSCA)"
}

async function resolveNationalTeamCheckoutSession(
  stripe: Stripe,
  admin: ReturnType<typeof createAdminClient>,
  reg: {
    id: string
    order_id: string | null
    stripe_session_id: string | null
  },
): Promise<Stripe.Checkout.Session | null> {
  if (reg.stripe_session_id?.startsWith("cs_")) {
    try {
      return await stripe.checkout.sessions.retrieve(reg.stripe_session_id)
    } catch {
      return null
    }
  }
  if (!reg.order_id) return null
  const { data: order } = await admin
    .from("orders")
    .select("stripe_payment_intent_id, stripe_session_id")
    .eq("id", reg.order_id)
    .maybeSingle()
  const o = order as { stripe_payment_intent_id?: string | null; stripe_session_id?: string | null } | null
  if (o?.stripe_session_id?.startsWith("cs_")) {
    try {
      return await stripe.checkout.sessions.retrieve(o.stripe_session_id)
    } catch {
      /* fall through */
    }
  }
  const pi = o?.stripe_payment_intent_id
  if (!pi) return null
  try {
    const list = await stripe.checkout.sessions.list({ payment_intent: pi, limit: 10 })
    for (const s of list.data) {
      if (s.metadata?.source === "national_team" && s.metadata?.registration_id === reg.id) return s
    }
    return list.data[0] ?? null
  } catch {
    return null
  }
}

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
  const paymentDateIso = typeof body.paymentDateIso === "string" ? body.paymentDateIso.trim() : ""
  const recipientEmail = typeof body.recipientEmail === "string" ? body.recipientEmail.trim() : ""
  const athleteFullName = typeof body.athleteFullName === "string" ? body.athleteFullName.trim() : ""
  const programLabel =
    typeof body.programLabel === "string" && body.programLabel.trim()
      ? body.programLabel.trim()
      : "National Team (NHSCA)"

  if (!firstName || firstName.length > 80) {
    return NextResponse.json({ error: "firstName is required (max 80 chars)." }, { status: 400 })
  }
  if (!Number.isFinite(amountCents) || amountCents < 1 || amountCents > 50_000_000) {
    return NextResponse.json({ error: "amountCents is invalid." }, { status: 400 })
  }
  if (!paymentDateIso || Number.isNaN(Date.parse(paymentDateIso))) {
    return NextResponse.json({ error: "paymentDateIso must be a valid ISO date." }, { status: 400 })
  }
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return NextResponse.json({ error: "A valid recipientEmail is required." }, { status: 400 })
  }
  if (!athleteFullName || athleteFullName.length > 160) {
    return NextResponse.json({ error: "athleteFullName is required (max 160 chars)." }, { status: 400 })
  }

  if (body.action === "preview") {
    const { html, text, subject, from } = buildNcuNationalTeamFeeReceiptHtml({
      firstName,
      amountCents,
      paymentDateIso,
      athleteFullName,
      programLabel,
    })
    return NextResponse.json({
      ok: true,
      preview: { html, text, subject, to: recipientEmail, from },
    })
  }

  if (body.action !== "send") {
    return NextResponse.json({ error: "action must be preview or send" }, { status: 400 })
  }

  const registrationId = typeof body.registrationId === "string" ? body.registrationId.trim() : ""
  if (!registrationId) {
    return NextResponse.json({ error: "registrationId is required for send." }, { status: 400 })
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret?.trim()) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 500 })
  }

  const admin = createAdminClient()
  const { data: reg, error: regErr } = await admin
    .from("national_team_event_registrations")
    .select("id, status, order_id, stripe_session_id, event_slug, reg_fee_cents, apparel_fee_cents, parent_email")
    .eq("id", registrationId)
    .maybeSingle()

  if (regErr || !reg) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 })
  }

  const row = reg as {
    id: string
    status: string
    order_id: string | null
    stripe_session_id: string | null
    event_slug: string
    reg_fee_cents: number
    apparel_fee_cents: number
    parent_email: string | null
  }

  if (row.status !== "paid" && !row.order_id) {
    return NextResponse.json({ error: "Registration is not paid — no receipt to verify." }, { status: 400 })
  }

  const stripe = new Stripe(stripeSecret)
  const session = await resolveNationalTeamCheckoutSession(stripe, admin, {
    id: row.id,
    order_id: row.order_id,
    stripe_session_id: row.stripe_session_id,
  })

  if (!session) {
    return NextResponse.json(
      { error: "Could not find a Stripe Checkout session for this registration. Sync may be incomplete." },
      { status: 400 },
    )
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Checkout session is not paid." }, { status: 400 })
  }
  if (session.metadata?.source !== "national_team" || session.metadata?.registration_id !== row.id) {
    return NextResponse.json({ error: "Stripe session is not linked to this national team registration." }, { status: 400 })
  }

  const regTotal = (Number(row.reg_fee_cents) || 0) + (Number(row.apparel_fee_cents) || 0)
  const stripeTotal = session.amount_total ?? 0
  const authoritativeAmount = stripeTotal > 0 ? stripeTotal : regTotal
  if (authoritativeAmount < 1) {
    return NextResponse.json({ error: "Could not determine payment amount for this registration." }, { status: 400 })
  }
  if (amountCents !== authoritativeAmount) {
    return NextResponse.json(
      {
        error: `Amount must be ${(authoritativeAmount / 100).toFixed(2)} (Stripe checkout total).`,
      },
      { status: 400 },
    )
  }

  const stripeEmail =
    session.customer_details?.email?.trim() ||
    (typeof session.customer_email === "string" ? session.customer_email.trim() : "")
  if (!stripeEmail) {
    return NextResponse.json({ error: "Stripe session has no customer email." }, { status: 400 })
  }
  if (normEmail(stripeEmail) !== normEmail(recipientEmail)) {
    return NextResponse.json({ error: `Recipient email must match Stripe checkout (${stripeEmail}).` }, { status: 400 })
  }

  const send = await sendNcuNationalTeamFeeReceiptEmail({
    to: recipientEmail,
    firstName,
    amountCents,
    paymentDateIso,
    athleteFullName,
    programLabel,
  })

  if (!send.success) {
    return NextResponse.json({ error: send.error }, { status: 500 })
  }

  const payload = {
    registration_id: row.id,
    stripe_checkout_session_id: session.id,
    recipient_email: recipientEmail,
    sent_at: new Date().toISOString(),
  }

  let logErr = (
    await admin.from("national_team_fee_receipt_emails").upsert(payload, { onConflict: "registration_id" })
  ).error

  const msgUpsert = logErr?.message ?? ""
  const codeUpsert = logErr?.code ?? ""
  const upsertConflictBroken =
    codeUpsert === "42P10" || /no unique|exclusion constraint matching|ON CONFLICT/i.test(msgUpsert)

  // If ON CONFLICT is misconfigured but row can still be inserted after delete, replace the row.
  if (logErr && upsertConflictBroken) {
    await admin.from("national_team_fee_receipt_emails").delete().eq("registration_id", row.id)
    logErr = (await admin.from("national_team_fee_receipt_emails").insert(payload)).error
  }

  if (logErr) {
    const msg = logErr.message ?? ""
    const code = logErr.code ?? ""
    console.error("[national-team-fee-receipt] log failed:", code, msg)

    const missingTable =
      code === "42P01" ||
      code === "PGRST205" ||
      /does not exist|schema cache|could not find the table|relation.*does not exist/i.test(msg)

    const badConstraint =
      code === "42P10" ||
      /no unique|exclusion constraint matching|ON CONFLICT/i.test(msg)

    if (missingTable) {
      return NextResponse.json({
        ok: true,
        warning:
          "Email sent. Create the log table: run scripts/national-team-fee-receipt-emails.sql in Supabase SQL Editor, then send again (optional) to record it.",
      })
    }
    if (badConstraint) {
      return NextResponse.json({
        ok: true,
        warning:
          "Email sent. Log table exists but registration_id must be PRIMARY KEY (or UNIQUE). Re-run scripts/national-team-fee-receipt-emails.sql to fix the table.",
      })
    }
    return NextResponse.json({
      ok: true,
      warning: `Email sent. Could not save log (${code || "error"}): ${msg.slice(0, 180)}${msg.length > 180 ? "…" : ""}`,
    })
  }

  return NextResponse.json({ ok: true })
}
