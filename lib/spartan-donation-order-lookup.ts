import type { SupabaseClient } from "@supabase/supabase-js"

export type SpartanDonationOrderRow = {
  id: string
  donor_name?: string | null
  athlete_code?: string | null
  amount_cents?: number | null
  campaign_slug?: string | null
}

const SPARTAN_DONATION_SELECT = "id, donor_name, athlete_code, amount_cents, campaign_slug, spartan_campaign"

/** Link ghost `orders` rows to paid Spartan / fundraising checkouts (keyed by cs_… or PI in raw_metadata). */
export async function findSpartanDonationForOrder(
  supabase: SupabaseClient,
  order: {
    stripe_session_id?: string | null
    stripe_payment_intent_id?: string | null
  },
): Promise<SpartanDonationOrderRow | null> {
  const sessionId = String(order.stripe_session_id ?? "").trim()
  if (sessionId.startsWith("cs_")) {
    const { data } = await supabase
      .from("spartan_donations")
      .select(SPARTAN_DONATION_SELECT)
      .eq("id", sessionId)
      .eq("status", "paid")
      .maybeSingle()
    if (data) return mapSpartanDonationRow(data)
  }

  const piId = String(order.stripe_payment_intent_id ?? "").trim()
  if (piId.startsWith("pi_")) {
    const { data } = await supabase
      .from("spartan_donations")
      .select(SPARTAN_DONATION_SELECT)
      .eq("status", "paid")
      .or(`raw_metadata->stripe_payment_intent_id.eq.${piId},id.eq.${piId}`)
      .maybeSingle()
    if (data) return mapSpartanDonationRow(data)
  }

  return null
}

export async function hasSpartanDonationForPaymentIntent(
  admin: SupabaseClient,
  paymentIntentId: string,
): Promise<boolean> {
  const piId = paymentIntentId.trim()
  if (!piId.startsWith("pi_")) return false
  const { data } = await admin
    .from("spartan_donations")
    .select("id")
    .eq("status", "paid")
    .or(`raw_metadata->stripe_payment_intent_id.eq.${piId},id.eq.${piId}`)
    .limit(1)
    .maybeSingle()
  return Boolean(data)
}

function mapSpartanDonationRow(row: Record<string, unknown>): SpartanDonationOrderRow {
  return {
    id: String(row.id),
    donor_name: (row.donor_name as string | null) ?? null,
    athlete_code: (row.athlete_code as string | null) ?? null,
    amount_cents: (row.amount_cents as number | null) ?? null,
    campaign_slug: (row.campaign_slug as string | null) ?? (row.spartan_campaign as string | null) ?? null,
  }
}
