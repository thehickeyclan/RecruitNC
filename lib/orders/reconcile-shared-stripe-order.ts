import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { ensureNationalTeamOrderLineItems } from "@/lib/national-team-order-items"
import { resolveNationalTeamOrderTotalCents } from "@/lib/nhsca-hub-checkout-pricing"
import { hasSpartanDonationForPaymentIntent } from "@/lib/spartan-donation-order-lookup"
import { amountLooksLikeGuild } from "@/lib/stripe-checkout-amounts"
import { isGuildCheckoutSession, isGuildOrderRow } from "@/lib/stripe-guild-detection"
import { isMisclassifiedGuildGhostLineName } from "@/lib/stripe-guild-misclassified-line"
import { repairGuildOrderFromStripeIfNeeded, upsertGuildOrderFromCheckoutSession } from "@/lib/stripe-guild-order"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"

export type SharedStripeReconcileKind =
  | "guild"
  | "heuristic_guild"
  | "spartan"
  | "national_team"
  | "drop_in"
  | "unchanged"
  | "skipped"

export type SharedStripeReconcileResult = {
  changed: boolean
  kind: SharedStripeReconcileKind
  detail?: string
}

type OrderRow = {
  id: string
  order_number?: string | null
  total?: number | null
  channel?: string | null
  business?: string | null
  stripe_payment_intent_id?: string | null
  stripe_session_id?: string | null
  customer_email?: string | null
  email?: string | null
}

async function fetchCheckoutSessionForOrder(
  stripe: Stripe,
  order: OrderRow,
): Promise<Stripe.Checkout.Session | null> {
  const sessionId = String(order.stripe_session_id ?? "").trim()
  if (sessionId.startsWith("cs_")) {
    try {
      return await stripe.checkout.sessions.retrieve(sessionId)
    } catch {
      return null
    }
  }
  const piId = String(order.stripe_payment_intent_id ?? "").trim()
  if (!piId.startsWith("pi_")) return null
  try {
    const listed = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 })
    return listed.data[0] ?? null
  } catch {
    return null
  }
}

async function tagOrderAsSpartan(admin: SupabaseClient, orderId: string): Promise<void> {
  await admin
    .from("orders")
    .update({
      channel: "spartan",
      business: "fundraising",
      shipping_method: { name: "Fundraising donation", price: 0 },
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
}

async function applyHeuristicGuildTag(admin: SupabaseClient, order: OrderRow): Promise<boolean> {
  if (!amountLooksLikeGuild(Number(order.total ?? 0))) return false
  if (isGuildOrderRow(order)) return false

  const piId = String(order.stripe_payment_intent_id ?? "").trim()
  await admin
    .from("orders")
    .update({
      channel: "guild",
      business: "wrestling_guild",
      shipping_method: { name: "Wrestling Guild", price: 0 },
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)

  const { data: items } = await admin.from("order_items").select("id, product_name").eq("order_id", order.id)
  for (const row of items ?? []) {
    const name = String((row as { product_name?: string }).product_name ?? "")
    if (isMisclassifiedGuildGhostLineName(name)) {
      await admin
        .from("order_items")
        .update({
          product_name: "Wrestling Guild booking",
          sku: syntheticOrderItemSku({
            productId: null,
            label: "Wrestling Guild booking",
            dedupeKey: piId ? `guild:${piId}` : order.id,
          }),
        })
        .eq("id", (row as { id: string }).id)
    }
  }
  return true
}

async function reconcileNationalTeamFromSession(
  admin: SupabaseClient,
  order: OrderRow,
  session: Stripe.Checkout.Session,
): Promise<SharedStripeReconcileResult> {
  const registrationId = session.metadata?.registration_id
  if (session.metadata?.source !== "national_team" || !registrationId) {
    return { changed: false, kind: "unchanged" }
  }

  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? String(order.stripe_payment_intent_id ?? "")

  const { data: reg } = await admin
    .from("national_team_event_registrations")
    .select("*")
    .eq("id", registrationId)
    .maybeSingle()

  const linesEncoded =
    (session.metadata?.checkout_lines as string | undefined) ??
    String((reg as { checkout_lines?: string | null } | null)?.checkout_lines ?? "")
  const regCents = Number((reg as { reg_fee_cents?: number } | null)?.reg_fee_cents) || 0
  const apparelCents = Number((reg as { apparel_fee_cents?: number } | null)?.apparel_fee_cents) || 0
  const totalCents = resolveNationalTeamOrderTotalCents({
    checkout_lines: linesEncoded,
    reg_fee_cents: regCents,
    apparel_fee_cents: apparelCents,
    stripeAmountCents: session.amount_total ?? 0,
  })

  await admin
    .from("orders")
    .update({
      channel: session.metadata?.channel ?? "national_team",
      business: session.metadata?.business ?? null,
      subtotal: totalCents / 100,
      total: totalCents / 100,
      shipping_method: { name: "National team event", price: 0 },
      stripe_session_id: session.id,
      stripe_payment_intent_id: piId || order.stripe_payment_intent_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)

  await admin
    .from("national_team_event_registrations")
    .update({
      status: "paid",
      order_id: order.id,
      stripe_session_id: session.id,
      stripe_payment_intent_id: piId || null,
      checkout_lines: linesEncoded.slice(0, 500) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", registrationId)

  if (totalCents > 0 && piId) {
    await ensureNationalTeamOrderLineItems(admin, {
      orderId: order.id,
      paymentIntentId: piId,
      linesEncoded,
      totalCents,
      eventSlug: String((reg as { event_slug?: string } | null)?.event_slug ?? "nhsca-duals-2026"),
      apparelSizes: {
        singlet_size: (reg as { singlet_size?: string | null })?.singlet_size,
        shorts_size: (reg as { shorts_size?: string | null })?.shorts_size,
        shirt_size: (reg as { shirt_size?: string | null })?.shirt_size,
      },
      forceReplace: true,
    })
  }

  return { changed: true, kind: "national_team", detail: registrationId }
}

/** One order: ask Stripe what this payment really was; fix channel, totals, line items, NT reg links. */
export async function reconcileSharedStripeOrder(
  admin: SupabaseClient,
  order: OrderRow,
  getStripe: () => Stripe,
): Promise<SharedStripeReconcileResult> {
  const piId = String(order.stripe_payment_intent_id ?? "").trim()
  if (!piId && !String(order.stripe_session_id ?? "").startsWith("cs_")) {
    return { changed: false, kind: "skipped", detail: "no_stripe_id" }
  }

  if (piId && (await hasSpartanDonationForPaymentIntent(admin, piId))) {
    await tagOrderAsSpartan(admin, order.id)
    return { changed: true, kind: "spartan", detail: "spartan_donations" }
  }

  const stripe = getStripe()
  const session = await fetchCheckoutSessionForOrder(stripe, order)

  if (session?.metadata?.channel === "spartan") {
    await tagOrderAsSpartan(admin, order.id)
    return { changed: true, kind: "spartan", detail: session.id }
  }

  if (session?.metadata?.drop_in_request_id) {
    await admin
      .from("orders")
      .update({
        shipping_method: { name: "Practice Drop-in", price: 0 },
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
    return { changed: true, kind: "drop_in", detail: session.metadata.drop_in_request_id }
  }

  if (session && session.metadata?.source === "national_team") {
    return reconcileNationalTeamFromSession(admin, order, session)
  }

  if (session && isGuildCheckoutSession(session)) {
    await upsertGuildOrderFromCheckoutSession(admin, session, { getStripe })
    return { changed: true, kind: "guild", detail: session.id }
  }

  const guildRepaired = await repairGuildOrderFromStripeIfNeeded(admin, order, { getStripe })
  if (guildRepaired) return { changed: true, kind: "guild", detail: "repair" }

  if (await applyHeuristicGuildTag(admin, order)) {
    return { changed: true, kind: "heuristic_guild", detail: "$30" }
  }

  return { changed: false, kind: "unchanged" }
}

/** Paid national team regs with no Stripe link → match orders by parent email + amount. */
export async function linkOrphanNationalTeamRegistrations(
  admin: SupabaseClient,
): Promise<{ linked: number; scanned: number }> {
  const { data: orphans } = await admin
    .from("national_team_event_registrations")
    .select("id, parent_email, reg_fee_cents, apparel_fee_cents, checkout_lines, event_slug, singlet_size, shorts_size, shirt_size")
    .eq("status", "paid")
    .is("order_id", null)
    .limit(500)

  let linked = 0
  for (const reg of orphans ?? []) {
    const email = String((reg as { parent_email?: string }).parent_email ?? "").trim()
    if (!email) continue
    const expectedCents = resolveNationalTeamOrderTotalCents({
      checkout_lines: (reg as { checkout_lines?: string | null }).checkout_lines,
      reg_fee_cents: (reg as { reg_fee_cents?: number }).reg_fee_cents,
      apparel_fee_cents: (reg as { apparel_fee_cents?: number }).apparel_fee_cents,
    })
    if (expectedCents < 5000) continue

    const expectedDollars = expectedCents / 100
    const { data: candidates } = await admin
      .from("orders")
      .select("id, total, stripe_payment_intent_id, stripe_session_id, channel")
      .ilike("customer_email", email)
      .gte("total", expectedDollars - 1)
      .lte("total", expectedDollars + 1)
      .order("created_at", { ascending: false })
      .limit(5)

    const order = (candidates ?? []).find(
      (o) =>
        !isGuildOrderRow(o as OrderRow) &&
        String((o as { channel?: string }).channel ?? "").toLowerCase() !== "spartan" &&
        !amountLooksLikeGuild(Number((o as { total?: number }).total)),
    ) as OrderRow | undefined

    if (!order?.id) continue

    const { data: taken } = await admin
      .from("national_team_event_registrations")
      .select("id")
      .eq("order_id", order.id)
      .neq("id", (reg as { id: string }).id)
      .maybeSingle()
    if (taken) continue

    await admin
      .from("national_team_event_registrations")
      .update({
        order_id: order.id,
        stripe_payment_intent_id: order.stripe_payment_intent_id ?? null,
        stripe_session_id: order.stripe_session_id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (reg as { id: string }).id)

    linked++
  }

  return { linked, scanned: orphans?.length ?? 0 }
}

export async function reconcileMisclassifiedOrdersBatch(
  admin: SupabaseClient,
  getStripe: () => Stripe,
  opts?: { orderId?: string; limit?: number },
): Promise<{
  processed: number
  changed: number
  orphanRegsLinked: number
  samples: Array<{ orderNumber?: string | null; kind: string; detail?: string }>
}> {
  let query = admin
    .from("orders")
    .select("id, order_number, total, channel, business, stripe_payment_intent_id, stripe_session_id, customer_email, email")
    .not("stripe_payment_intent_id", "is", null)
    .order("created_at", { ascending: false })

  if (opts?.orderId) {
    query = query.eq("id", opts.orderId)
  } else {
    query = query.limit(opts?.limit ?? 500)
  }

  const { data: orders } = await query
  let changed = 0
  const samples: Array<{ orderNumber?: string | null; kind: string; detail?: string }> = []

  for (const order of orders ?? []) {
    const result = await reconcileSharedStripeOrder(admin, order as OrderRow, getStripe)
    if (result.changed) {
      changed++
      if (samples.length < 30) {
        samples.push({
          orderNumber: (order as OrderRow).order_number,
          kind: result.kind,
          detail: result.detail,
        })
      }
    }
  }

  const orphan = await linkOrphanNationalTeamRegistrations(admin)

  return {
    processed: orders?.length ?? 0,
    changed,
    orphanRegsLinked: orphan.linked,
    samples,
  }
}

export function orderLooksMisclassified(order: {
  total?: number | null
  channel?: string | null
  order_items?: { product_name?: string | null }[] | null
}): boolean {
  if (isGuildOrderRow(order)) return false
  const ch = String(order.channel ?? "").toLowerCase()
  if (ch === "spartan" || ch === "national_team" || ch === "guild") return false
  const total = Number(order.total ?? 0)
  if (amountLooksLikeGuild(total)) return true
  const items = order.order_items ?? []
  return items.some((i) => isMisclassifiedGuildGhostLineName(i.product_name))
}
