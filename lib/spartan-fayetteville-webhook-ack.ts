import type Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  firstNameFromDonorName,
  sendNcuDonationAcknowledgmentEmail,
} from "@/lib/email/ncu-donation-acknowledgment"
import { recordFundraisingLedgerSpartanCheckout } from "@/lib/fundraising/ledger"
import { notifyHouseholdOfFundraisingGiftIfEligible } from "@/lib/fundraising/notify-household-of-fundraising-gift"
import { stripeSpartanCampaignMetadataMatchesRequested } from "@/lib/fundraising/campaign-registry"
import { deriveCheckoutAttributionFromStripeSession } from "@/lib/spartan-donation-checkout-attribution"
import { resolveAthleteCodeForSpartanCheckout } from "@/lib/spartan-donation-athlete-code"
import { SPARTAN_FAYETTEVILLE_CAMPAIGN } from "@/lib/spartan-fayetteville-stripe"

function autoAckEnabled() {
  const v = process.env.SPARTAN_FAYETTEVILLE_DISABLE_AUTO_ACK
  if (!v) return true
  return v !== "1" && v.toLowerCase() !== "true" && v.toLowerCase() !== "yes"
}

/**
 * Idempotent: sends 501(c)(3) acknowledgment for Fayetteville Spartan paid checkouts
 * and upserts `spartan_donation_receipt_emails` (same as admin send path).
 * Skip if not paid, wrong campaign, no email, or a receipt row already exists.
 */
export async function sendFayettevilleDonationAutoAckIfEligible(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (!autoAckEnabled()) return
  const meta = session.metadata
  if (
    meta?.channel !== "spartan" ||
    !stripeSpartanCampaignMetadataMatchesRequested(meta.spartan_campaign, SPARTAN_FAYETTEVILLE_CAMPAIGN)
  )
    return
  if (session.payment_status !== "paid") return
  const amountCents = session.amount_total ?? 0
  if (amountCents < 1) return

  const to =
    session.customer_details?.email?.trim() ||
    (typeof session.customer_email === "string" ? session.customer_email.trim() : "")
  if (!to) {
    console.warn("[spartan-fayetteville-auto-ack] no customer email, session", session.id)
    return
  }

  const { data: existing } = await admin
    .from("spartan_donation_receipt_emails")
    .select("checkout_session_id")
    .eq("checkout_session_id", session.id)
    .maybeSingle()
  if (existing) return

  const metaRecord = (meta ?? {}) as Record<string, string>
  const donorName = (metaRecord.donor_name || "").trim() || (session.customer_details?.name as string | undefined) || null
  const firstName = firstNameFromDonorName(donorName)
  const donationDateIso = new Date(session.created * 1000).toISOString()

  const send = await sendNcuDonationAcknowledgmentEmail({
    to,
    firstName,
    amountCents,
    donationDateIso,
  })
  if (!send.success) {
    console.error("[spartan-fayetteville-auto-ack] resend send failed", session.id, send.error)
    return
  }

  const { error: logErr } = await admin.from("spartan_donation_receipt_emails").upsert(
    {
      checkout_session_id: session.id,
      recipient_email: to,
      sent_at: new Date().toISOString(),
    },
    { onConflict: "checkout_session_id" },
  )
  if (logErr) {
    console.error("[spartan-fayetteville-auto-ack] receipt log failed", session.id, logErr.message)
  }
}

/**
 * Match `app/api/webhooks/stripe` — persist Spartan checkout to `spartan_donations`.
 */
export async function upsertSpartanDonationFromCheckoutSession(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.metadata?.channel !== "spartan") return
  const meta = session.metadata!
  const piRaw = session.payment_intent
  const stripePaymentIntentId =
    typeof piRaw === "string" ? piRaw : piRaw && typeof piRaw === "object" && "id" in piRaw
      ? String((piRaw as { id: string }).id)
      : null
  const rawMetadata: Record<string, string> = meta ? { ...meta } : {}
  if (stripePaymentIntentId) rawMetadata.stripe_payment_intent_id = stripePaymentIntentId
  const attribution = deriveCheckoutAttributionFromStripeSession(session)
  if (attribution.fundraisingCheckoutSurface) {
    rawMetadata.fundraising_checkout_surface = attribution.fundraisingCheckoutSurface
  }
  if (attribution.fundraisingAthleteSlug) {
    rawMetadata.fundraising_athlete_slug = attribution.fundraisingAthleteSlug
  }

  const resolvedAthleteCode = await resolveAthleteCodeForSpartanCheckout(admin, session, attribution)
  const athleteCodeForRow = resolvedAthleteCode ?? (typeof meta.athlete_code === "string" && meta.athlete_code.trim() ? meta.athlete_code.trim().toUpperCase() : null)
  if (resolvedAthleteCode) {
    rawMetadata.athlete_code = resolvedAthleteCode
  }

  const { error: spartanErr } = await admin.from("spartan_donations").upsert(
    {
      id: session.id,
      created_at: new Date(session.created * 1000).toISOString(),
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      status: "paid",
      athlete_code: athleteCodeForRow,
      athlete_display_name: meta.athlete_display_name || null,
      fundraising_type: meta.fundraising_type || null,
      spartan_campaign: meta.spartan_campaign || null,
      donor_email: session.customer_details?.email || null,
      donor_name: session.customer_details?.name || null,
      stripe_charge_id: session.id,
      fundraising_checkout_surface: attribution.fundraisingCheckoutSurface,
      fundraising_athlete_slug: attribution.fundraisingAthleteSlug,
      raw_metadata: rawMetadata,
    },
    { onConflict: "id" },
  )
  if (spartanErr) {
    console.error("[spartan-fayetteville-webhook-ack] spartan_donations upsert:", spartanErr.message)
    return
  }

  await recordFundraisingLedgerSpartanCheckout(admin, session, resolvedAthleteCode ?? null)

  try {
    await notifyHouseholdOfFundraisingGiftIfEligible(admin, session)
  } catch (e) {
    console.error("[spartan-fayetteville-webhook-ack] household gift notify", e)
  }
}
