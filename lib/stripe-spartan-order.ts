import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"
import { orderShippingFields } from "@/lib/order-shipping"

function generateOrderNumber(): string {
  return "NC-" + Date.now().toString(36).toUpperCase().slice(-6) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export function resolveSpartanLineItemName(meta: Record<string, string>): string {
  const raceEntry = meta.race_entry_requested === "true" || meta.fundraising_type === "race_donation"
  if (raceEntry) {
    const tier = meta.tier_preference?.trim()
    if (tier && tier !== "unspecified") {
      return `NC United × Spartan Fayetteville — ${tier}`
    }
    return "NC United × Spartan Fayetteville — race contribution"
  }

  const surface = meta.fundraising_checkout_surface?.trim().toLowerCase()
  if (surface === "training_fund" || surface === "spartan_team_page") {
    return "NC United Training Fund donation"
  }
  if (surface === "scholarship_fund") {
    const scholarshipName = meta.scholarship_name?.trim() || meta.scholarship_slug?.trim()
    return scholarshipName ? `Scholarship donation · ${scholarshipName}` : "NC United scholarship fund donation"
  }

  const athleteLabel =
    meta.athlete_display_name?.trim() ||
    meta.manual_credit_name?.trim() ||
    meta.athlete_code?.trim()
  if (athleteLabel) {
    return `Fundraising donation · ${athleteLabel}`
  }

  return "Fundraising donation · NC United"
}

type SpartanOrderUpsertInput = {
  sessionId: string
  paymentIntentId: string | null
  amountTotalCents: number
  customerEmail: string
  customerName: string
  lineName: string
  createdAtIso?: string | null
}

/**
 * Idempotent: creates or re-tags a RecruitNC `orders` row for Spartan / fundraising checkout.
 * Admin orders list reads `orders` — mirror Guild so donations appear in revenue reporting.
 */
export async function upsertSpartanOrderFromCheckoutSession(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  if (session.metadata?.channel !== "spartan") return null
  if (session.payment_status !== "paid") return null

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null

  const meta = (session.metadata ?? {}) as Record<string, string>
  const customerEmail =
    (session as { customer_email?: string }).customer_email ??
    (session.customer_details as { email?: string })?.email ??
    ""
  const customerName =
    meta.donor_name?.trim() ||
    ((session.customer_details as { name?: string })?.name ?? "").trim() ||
    "Donor"

  return upsertSpartanOrderRow(admin, {
    sessionId: session.id,
    paymentIntentId,
    amountTotalCents: session.amount_total ?? 0,
    customerEmail,
    customerName,
    lineName: resolveSpartanLineItemName(meta),
    createdAtIso: new Date(session.created * 1000).toISOString(),
  })
}

async function upsertSpartanOrderRow(
  admin: SupabaseClient,
  input: SpartanOrderUpsertInput,
): Promise<string | null> {
  const amountTotal = input.amountTotalCents / 100
  if (amountTotal <= 0) return null

  const customerEmail = input.customerEmail.trim() || `spartan-${input.sessionId}@placeholder.com`
  const customerName = input.customerName.trim() || "Donor"
  const channel = "spartan"
  const business = "fundraising"
  const dedupeKey = input.paymentIntentId ? `spartan:${input.paymentIntentId}` : `spartan:${input.sessionId}`

  if (input.paymentIntentId) {
    const { data: existing } = await admin
      .from("orders")
      .select("id, channel")
      .eq("stripe_payment_intent_id", input.paymentIntentId)
      .maybeSingle()

    if (existing?.id) {
      await admin
        .from("orders")
        .update({
          channel,
          business,
          stripe_session_id: input.sessionId,
          shipping_method: { name: "Fundraising donation", price: 0 },
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
      return existing.id
    }
  } else {
    const { data: existingBySession } = await admin
      .from("orders")
      .select("id")
      .eq("stripe_session_id", input.sessionId)
      .maybeSingle()
    if (existingBySession?.id) return existingBySession.id
  }

  const orderNumber = generateOrderNumber()
  const orderId = crypto.randomUUID()
  const { error: orderErr } = await admin.from("orders").insert({
    id: orderId,
    order_number: orderNumber,
    customer_email: customerEmail,
    email: customerEmail,
    customer_name: customerName,
    ...orderShippingFields(customerName, {}),
    shipping_address: {},
    shipping_method: { name: "Fundraising donation", price: 0 },
    order_type: "donation",
    subtotal: amountTotal,
    shipping_cost: 0,
    tax: 0,
    discount: 0,
    total: amountTotal,
    status: "paid",
    stripe_payment_intent_id: input.paymentIntentId,
    stripe_session_id: input.sessionId,
    promo_code: null,
    channel,
    business,
    ...(input.createdAtIso ? { created_at: input.createdAtIso } : {}),
  })

  if ((orderErr as { code?: string })?.code === "23505") {
    if (input.paymentIntentId) {
      const { data: race } = await admin
        .from("orders")
        .select("id")
        .eq("stripe_payment_intent_id", input.paymentIntentId)
        .maybeSingle()
      return (race as { id?: string } | null)?.id ?? null
    }
    const { data: race } = await admin
      .from("orders")
      .select("id")
      .eq("stripe_session_id", input.sessionId)
      .maybeSingle()
    return (race as { id?: string } | null)?.id ?? null
  }
  if (orderErr) {
    console.error("[stripe-spartan-order] insert failed:", orderErr)
    throw orderErr
  }

  await admin.from("order_items").insert({
    order_id: orderId,
    product_id: null,
    product_name: input.lineName,
    sku: syntheticOrderItemSku({
      productId: null,
      label: input.lineName,
      dedupeKey,
    }),
    variant: { color: "N/A", size: "N/A" },
    quantity: 1,
    price: amountTotal,
    subtotal: amountTotal,
    image_url: null,
  })

  return orderId
}

type SpartanDonationBackfillRow = {
  id: string
  amount_cents?: number | null
  donor_email?: string | null
  donor_name?: string | null
  athlete_code?: string | null
  athlete_display_name?: string | null
  fundraising_type?: string | null
  fundraising_checkout_surface?: string | null
  raw_metadata?: Record<string, string> | null
  created_at?: string | null
}

/** Create missing `orders` rows for paid `spartan_donations` (e.g. gifts before mirror existed). */
export async function backfillSpartanOrdersFromDonations(
  admin: SupabaseClient,
  options?: { sinceDays?: number; limit?: number },
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const sinceDays = options?.sinceDays ?? 90
  const limit = options?.limit ?? 500
  const sinceIso = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: donations, error } = await admin
    .from("spartan_donations")
    .select(
      "id, amount_cents, donor_email, donor_name, athlete_code, athlete_display_name, fundraising_type, fundraising_checkout_surface, raw_metadata, created_at",
    )
    .eq("status", "paid")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    return { created: 0, skipped: 0, errors: [error.message] }
  }

  let created = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of (donations ?? []) as SpartanDonationBackfillRow[]) {
    const sessionId = String(row.id ?? "").trim()
    if (!sessionId.startsWith("cs_")) {
      skipped++
      continue
    }

    const rawMeta = (row.raw_metadata ?? {}) as Record<string, string>
    const paymentIntentId = String(rawMeta.stripe_payment_intent_id ?? "").trim() || null

    const { data: existingBySession } = await admin
      .from("orders")
      .select("id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle()
    if (existingBySession?.id) {
      skipped++
      continue
    }

    if (paymentIntentId) {
      const { data: existingByPi } = await admin
        .from("orders")
        .select("id")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle()
      if (existingByPi?.id) {
        skipped++
        continue
      }
    }

    const meta: Record<string, string> = {
      ...rawMeta,
      channel: "spartan",
      athlete_code: row.athlete_code ?? rawMeta.athlete_code ?? "",
      athlete_display_name: row.athlete_display_name ?? rawMeta.athlete_display_name ?? "",
      fundraising_type: row.fundraising_type ?? rawMeta.fundraising_type ?? "",
      fundraising_checkout_surface:
        row.fundraising_checkout_surface ?? rawMeta.fundraising_checkout_surface ?? "",
      race_entry_requested: rawMeta.race_entry_requested ?? "",
      tier_preference: rawMeta.tier_preference ?? "",
      manual_credit_name: rawMeta.manual_credit_name ?? "",
    }

    try {
      const orderId = await upsertSpartanOrderRow(admin, {
        sessionId,
        paymentIntentId,
        amountTotalCents: row.amount_cents ?? 0,
        customerEmail: row.donor_email ?? "",
        customerName: row.donor_name ?? "Donor",
        lineName: resolveSpartanLineItemName(meta),
        createdAtIso: row.created_at ?? null,
      })
      if (orderId) created++
      else skipped++
    } catch (e) {
      errors.push(`${sessionId}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { created, skipped, errors }
}
