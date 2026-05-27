import type Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import { sendNcuNationalTeamFeeReceiptEmail } from "@/lib/email/ncu-national-team-fee-receipt"
import {
  defaultReceiptGreetingName,
  nationalTeamProgramLabel,
  nationalTeamReceiptTotalCents,
  type NationalTeamFeeReceiptRegistration,
} from "@/lib/national-team-fee-receipt-ui"

function autoReceiptEnabled() {
  const v = process.env.NATIONAL_TEAM_DISABLE_AUTO_RECEIPT
  if (!v) return true
  return v !== "1" && v.toLowerCase() !== "true" && v.toLowerCase() !== "yes"
}

type NationalTeamRegRow = Pick<
  NationalTeamFeeReceiptRegistration,
  | "id"
  | "event_slug"
  | "athlete_first_name"
  | "athlete_last_name"
  | "parent_email"
  | "reg_fee_cents"
  | "apparel_fee_cents"
>

/**
 * Idempotent: sends National Team fee receipt after paid Stripe Checkout
 * and upserts `national_team_fee_receipt_emails` (same log as admin send).
 */
export async function sendNationalTeamFeeReceiptAutoIfEligible(
  admin: SupabaseClient,
  input: {
    reg: NationalTeamRegRow
    session: Stripe.Checkout.Session
  },
): Promise<void> {
  if (!autoReceiptEnabled()) return
  if (input.session.payment_status !== "paid") return

  const amountFromSession = input.session.amount_total ?? 0
  const amountFromReg = nationalTeamReceiptTotalCents(input.reg)
  const amountCents = amountFromSession > 0 ? amountFromSession : amountFromReg
  if (amountCents < 1) return

  const to =
    input.session.customer_details?.email?.trim() ||
    (typeof input.session.customer_email === "string" ? input.session.customer_email.trim() : "") ||
    (input.reg.parent_email ?? "").trim()
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.warn("[national-team-auto-receipt] no customer email, session", input.session.id)
    return
  }

  const { data: existing } = await admin
    .from("national_team_fee_receipt_emails")
    .select("registration_id")
    .eq("registration_id", input.reg.id)
    .maybeSingle()
  if (existing) return

  const customerName = (input.session.customer_details?.name as string | undefined)?.trim() || ""
  const firstName = customerName.split(/\s+/)[0]?.trim() || defaultReceiptGreetingName(input.reg as NationalTeamFeeReceiptRegistration)
  const athleteFullName = [input.reg.athlete_first_name, input.reg.athlete_last_name].filter(Boolean).join(" ").trim()
  const paymentDateIso = new Date(input.session.created * 1000).toISOString()

  const send = await sendNcuNationalTeamFeeReceiptEmail({
    to,
    firstName,
    amountCents,
    paymentDateIso,
    athleteFullName,
    programLabel: nationalTeamProgramLabel(input.reg.event_slug),
  })
  if (!send.success) {
    console.error("[national-team-auto-receipt] resend failed", input.session.id, send.error)
    return
  }

  const payload = {
    registration_id: input.reg.id,
    stripe_checkout_session_id: input.session.id,
    recipient_email: to,
    sent_at: new Date().toISOString(),
  }
  const { error: logErr } = await admin
    .from("national_team_fee_receipt_emails")
    .upsert(payload, { onConflict: "registration_id" })
  if (logErr) {
    console.error("[national-team-auto-receipt] receipt log failed", input.session.id, logErr.message)
  }
}
