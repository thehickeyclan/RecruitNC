import type Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import { stripeSpartanCampaignMetadataMatchesRequested } from "@/lib/fundraising/campaign-registry"
import { deriveCheckoutAttributionFromStripeSession } from "@/lib/spartan-donation-checkout-attribution"
import { SPARTAN_FAYETTEVILLE_CAMPAIGN } from "@/lib/spartan-fayetteville-stripe"
import {
  createFundraisingVideoSignedUrl,
  THANKYOU_VIDEO_SIGNED_URL_TTL,
} from "@/lib/fundraising/fundraising-video-storage"

/**
 * Donor acknowledgment extras: signed thank-you clip URL + athlete first name from checkout attribution.
 * Used by Fayetteville auto-ack and admin manual receipt resend for parity.
 */
export async function thankYouVideoAckFieldsFromCheckoutSession(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<{
  thankYouVideoSignedUrl: string | null
  athleteFirstNameForThankYou: string | null
}> {
  const attribution = deriveCheckoutAttributionFromStripeSession(session)
  const fundraisingSlug = (attribution.fundraisingAthleteSlug ?? "").trim().toLowerCase()
  let thankYouVideoSignedUrl: string | null = null
  let athleteFirstNameForThankYou: string | null = null

  if (!fundraisingSlug) {
    return { thankYouVideoSignedUrl, athleteFirstNameForThankYou }
  }

  const { data: prof, error: pErr } = await admin
    .from("athlete_fundraising_profiles")
    .select("thankyou_video_url, athlete_id")
    .eq("slug", fundraisingSlug)
    .eq("is_active", true)
    .maybeSingle()

  if (!pErr && prof?.thankyou_video_url?.trim()) {
    thankYouVideoSignedUrl = await createFundraisingVideoSignedUrl(
      admin,
      prof.thankyou_video_url,
      THANKYOU_VIDEO_SIGNED_URL_TTL,
    )
  }
  if (prof?.athlete_id) {
    const { data: ath } = await admin.from("athletes").select("name").eq("id", prof.athlete_id).maybeSingle()
    const nm = typeof ath?.name === "string" ? ath.name.trim() : ""
    if (nm) athleteFirstNameForThankYou = (nm.split(/\s+/)[0] ?? nm).trim() || null
  }

  return { thankYouVideoSignedUrl, athleteFirstNameForThankYou }
}

/** Manual/auto Fayetteville receipts only — skips thank-you resolution for other campaigns or unpaid sessions. */
export async function thankYouVideoAckFieldsFromFayettevillePaidSession(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<{
  thankYouVideoSignedUrl: string | null
  athleteFirstNameForThankYou: string | null
}> {
  if (session.payment_status !== "paid") {
    return { thankYouVideoSignedUrl: null, athleteFirstNameForThankYou: null }
  }
  if (!stripeSpartanCampaignMetadataMatchesRequested(session.metadata?.spartan_campaign, SPARTAN_FAYETTEVILLE_CAMPAIGN)) {
    return { thankYouVideoSignedUrl: null, athleteFirstNameForThankYou: null }
  }
  return thankYouVideoAckFieldsFromCheckoutSession(admin, session)
}
