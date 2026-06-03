/**
 * Create orders rows for paid Stripe subscription invoices (Blue renewals, etc.).
 * Dedupes by stripe_invoice_id and stripe_payment_intent_id.
 */
import type Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"
import { orderShippingFields } from "@/lib/order-shipping"

const RENEWAL_BILLING_REASONS = new Set([
  "subscription_cycle",
  "subscription_update",
  "subscription_threshold",
  "manual",
])

function generateOrderNumber(): string {
  return "NC-" + Date.now().toString(36).toUpperCase().slice(-6) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const sub = invoice.subscription
  if (typeof sub === "string") return sub
  if (sub && typeof sub === "object" && "id" in sub && sub.id) return sub.id

  const parent = (
    invoice as {
      parent?: { subscription_details?: { subscription?: string | { id?: string } | null } | null } | null
    }
  ).parent
  const nested = parent?.subscription_details?.subscription
  if (typeof nested === "string") return nested
  if (nested && typeof nested === "object" && nested.id) return nested.id

  for (const line of invoice.lines?.data ?? []) {
    const lineSub = line.subscription
    if (typeof lineSub === "string") return lineSub
    if (lineSub && typeof lineSub === "object" && "id" in lineSub && lineSub.id) return lineSub.id
  }

  return null
}

function paymentIntentIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const pi = invoice.payment_intent
  if (typeof pi === "string") return pi
  return pi?.id ?? null
}

function invoiceChargedAtIso(invoice: Stripe.Invoice): string {
  const paidAt = invoice.status_transitions?.paid_at
  if (paidAt) return new Date(paidAt * 1000).toISOString()
  if (invoice.created) return new Date(invoice.created * 1000).toISOString()
  return new Date().toISOString()
}

function billingPeriodLabel(invoice: Stripe.Invoice): string | null {
  const periodStart = invoice.lines?.data?.[0]?.period?.start
  if (!periodStart) return null
  return new Date(periodStart * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

async function resolveCustomerFromInvoice(
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<{ email: string; name: string }> {
  let email = (invoice.customer_email ?? "").trim()
  let name = (invoice.customer_name ?? "").trim()

  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id
  if (customerId && (!email || !name)) {
    try {
      const customer = await stripe.customers.retrieve(customerId)
      if (!customer.deleted) {
        email = email || (customer.email ?? "").trim()
        name = name || (customer.name ?? "").trim()
      }
    } catch {
      // ignore
    }
  }

  return {
    email: email || "subscription@placeholder.com",
    name: name || "Subscription customer",
  }
}

async function isBlueSubscription(
  admin: SupabaseClient,
  stripe: Stripe,
  subscriptionId: string,
): Promise<boolean> {
  const { data: membership } = await admin
    .from("blue_memberships")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle()
  if (membership) return true

  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId)
    const meta = (sub.metadata ?? {}) as Record<string, string>
    const channel = String(meta.channel ?? "").trim().toLowerCase()
    if (channel === "blue") return true
    if (meta.membership_id?.trim() || meta.signup_id?.trim()) return true
    const bus = String(meta.business ?? "").trim().toLowerCase()
    if (bus === "nc_united" && meta.category === "subscription") return true
  } catch {
    // ignore
  }

  return false
}

function parseShippingMethodJson(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (!trimmed) return {}
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // legacy plain-text shipping labels
    }
  }
  return {}
}

/** shipping_method is text in DB — .contains() only works on jsonb. */
async function findOrderIdByStripeInvoiceId(
  admin: SupabaseClient,
  invoiceId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("orders")
    .select("id")
    .ilike("shipping_method", `%${invoiceId}%`)
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

async function subscriptionAlreadyHasOrder(
  admin: SupabaseClient,
  subscriptionId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("orders")
    .select("id")
    .ilike("shipping_method", `%${subscriptionId}%`)
    .limit(1)
    .maybeSingle()
  return Boolean(data?.id)
}

async function patchInvoiceOrderMetadataIfMissing(
  admin: SupabaseClient,
  orderId: string,
  invoice: Stripe.Invoice,
): Promise<void> {
  const { data: row } = await admin.from("orders").select("shipping_method").eq("id", orderId).maybeSingle()
  const sm = parseShippingMethodJson(row?.shipping_method)
  if (sm.stripe_charged_at) return

  const periodLabel = billingPeriodLabel(invoice)
  const updated = {
    ...sm,
    stripe_charged_at: invoiceChargedAtIso(invoice),
    ...(periodLabel && !sm.billing_period_label ? { billing_period_label: periodLabel } : {}),
  }

  await admin.from("orders").update({ shipping_method: updated }).eq("id", orderId)

  if (periodLabel) {
    await admin
      .from("order_items")
      .update({ variant: { color: "N/A", size: periodLabel } })
      .eq("order_id", orderId)
  }
}

function lineItemFromInvoice(invoice: Stripe.Invoice, isBlue: boolean): { name: string; amountDollars: number } {
  if (isBlue) {
    return { name: "NC United Blue – Monthly", amountDollars: (invoice.amount_paid ?? 0) / 100 }
  }
  const firstLine = invoice.lines?.data?.[0]
  const description = firstLine?.description?.trim() || invoice.description?.trim() || "Stripe subscription"
  return { name: description, amountDollars: (invoice.amount_paid ?? 0) / 100 }
}

export type EnsureOrderFromInvoiceOptions = {
  /** Admin bulk sync: skip signup invoices; webhook keeps creating all paid invoices with dedupe. */
  renewalsOnly?: boolean
}

export type EnsureOrderFromInvoiceResult = {
  created: boolean
  skipped: boolean
  reason?: string
  orderId?: string
}

/** Insert a paid subscription invoice into orders when missing (renewals + any missed initial). */
export async function ensureOrderFromStripeInvoice(
  admin: SupabaseClient,
  stripe: Stripe,
  invoice: Stripe.Invoice,
  options?: EnsureOrderFromInvoiceOptions,
): Promise<EnsureOrderFromInvoiceResult> {
  const subscriptionId = subscriptionIdFromInvoice(invoice)
  if (!subscriptionId) {
    return { created: false, skipped: true, reason: "not_subscription" }
  }

  if (invoice.status !== "paid" && !invoice.paid) {
    return { created: false, skipped: true, reason: "not_paid" }
  }

  const amountPaid = invoice.amount_paid ?? 0
  if (amountPaid <= 0) {
    return { created: false, skipped: true, reason: "zero_amount" }
  }

  const existingByInvoice = await findOrderIdByStripeInvoiceId(admin, invoice.id)
  if (existingByInvoice) {
    await patchInvoiceOrderMetadataIfMissing(admin, existingByInvoice, invoice)
    return { created: false, skipped: true, reason: "invoice_already_exists", orderId: existingByInvoice }
  }

  const billingReason = invoice.billing_reason ?? "subscription"

  if (options?.renewalsOnly && billingReason === "subscription_create") {
    return { created: false, skipped: true, reason: "initial_invoice_skipped" }
  }

  if (options?.renewalsOnly && !RENEWAL_BILLING_REASONS.has(billingReason)) {
    return { created: false, skipped: true, reason: "billing_reason_skipped" }
  }

  const paymentIntentId = paymentIntentIdFromInvoice(invoice)
  if (paymentIntentId) {
    const { data: existing } = await admin
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle()
    if (existing?.id) {
      await patchInvoiceOrderMetadataIfMissing(admin, existing.id, invoice)
      return { created: false, skipped: true, reason: "already_exists", orderId: existing.id }
    }
  }

  if (billingReason === "subscription_create" && (await subscriptionAlreadyHasOrder(admin, subscriptionId))) {
    return { created: false, skipped: true, reason: "subscription_already_has_order" }
  }

  const isBlue = await isBlueSubscription(admin, stripe, subscriptionId)
  const { email, name } = await resolveCustomerFromInvoice(stripe, invoice)
  const { name: productName, amountDollars } = lineItemFromInvoice(invoice, isBlue)
  const periodLabel = billingPeriodLabel(invoice)

  const orderNumber = generateOrderNumber()
  const orderId = crypto.randomUUID()
  const shippingMethod = {
    name: isBlue ? "Blue membership" : "Stripe subscription",
    price: 0,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: subscriptionId,
    billing_reason: billingReason,
    stripe_charged_at: invoiceChargedAtIso(invoice),
    ...(periodLabel ? { billing_period_label: periodLabel } : {}),
    ...(isBlue ? { admin_category: "Blue Sub" } : {}),
  }

  const { error: orderErr } = await admin.from("orders").insert({
    id: orderId,
    order_number: orderNumber,
    customer_email: email,
    email,
    customer_name: name,
    ...orderShippingFields(name, {}),
    shipping_address: {},
    shipping_method: shippingMethod,
    subtotal: amountDollars,
    shipping_cost: 0,
    tax: 0,
    discount: 0,
    total: amountDollars,
    status: "paid",
    stripe_payment_intent_id: paymentIntentId,
    promo_code: null,
    ...(isBlue ? { channel: "blue" } : {}),
  })

  if (orderErr) {
    if ((orderErr as { code?: string }).code === "23505") {
      return { created: false, skipped: true, reason: "duplicate_key" }
    }
    console.error("[ensureOrderFromStripeInvoice] order insert:", orderErr.message)
    return { created: false, skipped: false, reason: orderErr.message }
  }

  const dedupeKey = paymentIntentId ?? invoice.id
  const { error: itemsErr } = await admin.from("order_items").insert({
    order_id: orderId,
    product_id: null,
    product_name: productName,
    sku: syntheticOrderItemSku({
      productId: null,
      label: productName,
      dedupeKey: `invoice:${dedupeKey}`,
    }),
    variant: periodLabel
      ? { color: "N/A", size: periodLabel }
      : { color: "N/A", size: "N/A" },
    quantity: 1,
    price: amountDollars,
    subtotal: amountDollars,
    image_url: null,
  })

  if (itemsErr) {
    console.error("[ensureOrderFromStripeInvoice] order_items insert:", itemsErr.message)
    await admin.from("orders").delete().eq("id", orderId)
    return { created: false, skipped: false, reason: itemsErr.message }
  }

  return { created: true, skipped: false, orderId }
}

export type SyncPaidInvoicesOptions = {
  sinceUnix: number
  /** Admin bulk sync: only renewal invoices, not signup duplicates */
  renewalsOnly?: boolean
}

/** Backfill paid subscription invoices from Stripe (admin sync). */
export async function syncPaidSubscriptionInvoicesFromStripe(
  admin: SupabaseClient,
  stripe: Stripe,
  options: SyncPaidInvoicesOptions,
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const { sinceUnix, renewalsOnly = false } = options
  let created = 0
  let skipped = 0
  const errors: string[] = []

  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const list = await stripe.invoices.list({
      created: { gte: sinceUnix },
      status: "paid",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    for (const invoice of list.data) {
      try {
        const result = await ensureOrderFromStripeInvoice(admin, stripe, invoice, { renewalsOnly })
        if (result.created) created++
        else if (result.skipped) skipped++
        else if (result.reason) errors.push(`${invoice.id}: ${result.reason}`)
      } catch (e) {
        errors.push(`${invoice.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    hasMore = list.has_more
    if (list.data.length) startingAfter = list.data[list.data.length - 1].id
    else hasMore = false
  }

  return { created, skipped, errors }
}

/** Prefer Stripe charge date for admin lists (invoice-synced rows used to show sync time). */
export function orderDisplayDateFromRow(order: {
  created_at?: string | null
  shipping_method?: unknown
}): Date {
  const sm = parseShippingMethodJson(order.shipping_method)
  const charged = sm.stripe_charged_at
  if (typeof charged === "string" && charged.trim()) {
    const d = new Date(charged)
    if (!Number.isNaN(d.getTime())) return d
  }
  return order.created_at ? new Date(order.created_at) : new Date()
}
