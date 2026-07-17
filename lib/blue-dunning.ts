/**
 * Parent-facing dunning for NC United Blue.
 *
 * Fired from the Stripe webhook on invoice.payment_failed. Before this, a failed renewal
 * silently flipped the membership to pending_payment — the parent found out only if they
 * happened to open Profile → NC United Blue, which for a $55/mo subscription is the churn
 * engine. Stripe retries the same invoice several times; the send-once ledger keys on the
 * invoice id so the parent gets exactly one email (and one SMS) per failed invoice.
 *
 * Never throws: dunning must not break webhook processing.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { sendBluePaymentFailedEmail } from "@/lib/email"
import { sendSms, toE164 } from "@/lib/sms"
import {
  claimBlueBillingNotification,
  markBlueBillingNotificationSms,
  paymentFailedDedupeKey,
} from "@/lib/blue-billing-notifications"

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"

export type BluePaymentFailedParams = {
  subscriptionId: string
  invoiceId: string | null
  amountDueCents: number | null
}

export type BluePaymentFailedResult = {
  notified: boolean
  reason?: string
  emailTo?: string
  smsSent?: boolean
}

function formatAmount(cents: number | null): string | null {
  if (cents == null || !Number.isFinite(cents) || cents <= 0) return null
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

export async function notifyParentBluePaymentFailed(
  admin: SupabaseClient,
  params: BluePaymentFailedParams,
): Promise<BluePaymentFailedResult> {
  try {
    const { data: membership } = await admin
      .from("blue_memberships")
      .select("id, payer_user_id, athlete_id, signup_id")
      .eq("stripe_subscription_id", params.subscriptionId)
      .maybeSingle()

    if (!membership) return { notified: false, reason: "no membership for subscription" }

    // Contact info: the payer's profile first, then the original signup form.
    let email: string | null = null
    let phone: string | null = null
    let parentName = ""
    if (membership.payer_user_id) {
      const { data: payer } = await admin
        .from("user_profiles")
        .select("email, cell_phone, first_name")
        .eq("user_id", membership.payer_user_id)
        .maybeSingle()
      email = payer?.email?.trim() || null
      phone = payer?.cell_phone?.trim() || null
      parentName = payer?.first_name?.trim() || ""
    }

    let athleteName = ""
    if (membership.athlete_id) {
      const { data: athlete } = await admin
        .from("athletes")
        .select("name")
        .eq("id", membership.athlete_id)
        .maybeSingle()
      athleteName = athlete?.name?.trim() || ""
    }

    if ((!email || !athleteName || !parentName) && membership.signup_id) {
      const { data: signup } = await admin
        .from("blue_signups")
        .select("parent_email, parent_phone, parent_first_name, athlete_first_name, athlete_last_name")
        .eq("id", membership.signup_id)
        .maybeSingle()
      email = email || signup?.parent_email?.trim() || null
      phone = phone || signup?.parent_phone?.trim() || null
      parentName = parentName || signup?.parent_first_name?.trim() || ""
      athleteName =
        athleteName || [signup?.athlete_first_name, signup?.athlete_last_name].filter(Boolean).join(" ").trim()
    }

    if (!email) return { notified: false, reason: "no parent email on file" }

    const dedupeKey = paymentFailedDedupeKey(params.invoiceId, params.subscriptionId)
    const claim = await claimBlueBillingNotification(admin, {
      dedupeKey,
      kind: "payment_failed",
      membershipId: membership.id,
      sentTo: email,
    })
    if (!claim.claimed) return { notified: false, reason: "already notified for this invoice" }

    const emailResult = await sendBluePaymentFailedEmail({
      to: email,
      parentName,
      athleteName,
      amountDisplay: formatAmount(params.amountDueCents),
    })

    let smsSent = false
    const e164 = toE164(phone)
    if (e164) {
      const first = athleteName ? athleteName.split(" ")[0] : "your wrestler"
      smsSent = await sendSms(
        e164,
        `NC United Blue: the monthly payment for ${first} didn't go through. Update your card: ${SITE_URL}/profile — then tap Retry payment. Reply STOP to opt out.`,
      )
      if (smsSent && !claim.tableMissing) await markBlueBillingNotificationSms(admin, dedupeKey)
    }

    return { notified: emailResult.success || smsSent, emailTo: email, smsSent }
  } catch (e) {
    console.error("[blue-dunning]", e instanceof Error ? e.message : e)
    return { notified: false, reason: "error" }
  }
}
