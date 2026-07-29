import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

export type StripeOrderVerdict =
  | "ship"
  | "not_paid"
  | "no_stripe_id"
  | "stripe_error"
  | "amount_mismatch"

export type ValidatedOrderRow = {
  orderId: string
  orderNumber: string
  recruitncStatus: string
  customerName: string | null
  customerEmail: string | null
  productSummary: string
  total: number
  placedAt: string | null
  stripePaymentIntentId: string | null
  stripeStatus: string | null
  stripeAmount: number | null
  stripeEmail: string | null
  stripeDashboardUrl: string | null
  verdict: StripeOrderVerdict
  verdictLabel: string
  duplicateGroupKey: string | null
  isDuplicate: boolean
}

const APPAREL_SKIP =
  /store purchase|order items|see stripe metadata|blue.*monthly|van transportation|team hotel|tournament registration|flight \(travel\)|event fee|fundraising donation/i
const APPAREL_MATCH =
  /singlet|tee|jacket|crewneck|hoodie|polo|short sleeve|long sleeve|iron sharpens|core tee|old school|pinstripe|pepsi|first in flight|relentless|nike|shorts|apparel/i

function productSummary(items: { product_name?: string | null; variant?: unknown }[]): string {
  return items
    .map((i) => {
      const name = (i.product_name || "").trim()
      if (!name) return ""
      const v = i.variant && typeof i.variant === "object" ? (i.variant as Record<string, string>) : null
      const variant = v ? [v.color, v.size].filter(Boolean).join("/") : ""
      return variant ? `${name} (${variant})` : name
    })
    .filter(Boolean)
    .join("; ")
}

function isApparelOrder(items: { product_name?: string | null }[]): boolean {
  const text = productSummary(items)
  if (!text || APPAREL_SKIP.test(text)) return false
  return APPAREL_MATCH.test(text)
}

function verdictForPi(
  pi: Stripe.PaymentIntent | null,
  orderTotal: number,
  piError: string | null,
): Pick<ValidatedOrderRow, "stripeStatus" | "stripeAmount" | "stripeEmail" | "verdict" | "verdictLabel"> {
  if (piError) {
    return {
      stripeStatus: null,
      stripeAmount: null,
      stripeEmail: null,
      verdict: "stripe_error",
      verdictLabel: piError,
    }
  }
  if (!pi) {
    return {
      stripeStatus: null,
      stripeAmount: null,
      stripeEmail: null,
      verdict: "not_paid",
      verdictLabel: "No payment in Stripe",
    }
  }

  const stripeAmount = pi.amount_received > 0 ? pi.amount_received / 100 : pi.amount / 100
  const stripeEmail = pi.receipt_email || pi.metadata?.customer_email || null
  const orderCents = Math.round(orderTotal * 100)
  const amountMismatch = pi.status === "succeeded" && Math.abs(pi.amount_received - orderCents) > 1

  if (pi.status !== "succeeded") {
    return {
      stripeStatus: pi.status,
      stripeAmount,
      stripeEmail,
      verdict: "not_paid",
      verdictLabel:
        pi.status === "canceled"
          ? "Canceled — not paid"
          : pi.status === "requires_payment_method"
            ? "Abandoned checkout — not paid"
            : `Stripe: ${pi.status} — not paid`,
    }
  }

  if (amountMismatch) {
    return {
      stripeStatus: pi.status,
      stripeAmount,
      stripeEmail,
      verdict: "amount_mismatch",
      verdictLabel: `Paid in Stripe ($${stripeAmount.toFixed(2)}) but order total is $${orderTotal.toFixed(2)}`,
    }
  }

  return {
    stripeStatus: pi.status,
    stripeAmount,
    stripeEmail,
    verdict: "ship",
    verdictLabel: "Paid in Stripe — ship this",
  }
}

export function stripePaymentDashboardUrl(paymentIntentId: string): string {
  return `https://dashboard.stripe.com/payments/${paymentIntentId}`
}

export async function validateUnfulfilledApparelOrdersAgainstStripe(
  admin: SupabaseClient,
  stripe: Stripe,
  opts?: { limit?: number },
): Promise<{
  rows: ValidatedOrderRow[]
  summary: {
    checked: number
    ship: number
    notPaid: number
    noStripeId: number
    amountMismatch: number
    stripeErrors: number
    duplicateGroups: number
  }
}> {
  const limit = opts?.limit ?? 100
  const { data: orders, error } = await admin
    .from("orders")
    .select("id, order_number, status, customer_name, customer_email, total, created_at, stripe_payment_intent_id")
    .not("status", "in", "(shipped,delivered,cancelled,refunded)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  const orderRows = orders ?? []
  const orderIds = orderRows.map((o) => String(o.id))

  let items: { order_id: string; product_name?: string | null; variant?: unknown }[] = []
  if (orderIds.length > 0) {
    const { data: itemRows, error: itemsError } = await admin
      .from("order_items")
      .select("order_id, product_name, variant")
      .in("order_id", orderIds)
    if (itemsError) throw new Error(itemsError.message)
    items = itemRows ?? []
  }

  const itemsByOrder = new Map<string, typeof items>()
  for (const it of items) {
    const list = itemsByOrder.get(it.order_id) ?? []
    list.push(it)
    itemsByOrder.set(it.order_id, list)
  }

  const rows: ValidatedOrderRow[] = []
  for (const o of orderRows) {
    const orderItems = itemsByOrder.get(String(o.id)) ?? []
    if (!isApparelOrder(orderItems)) continue

    const piId = (o.stripe_payment_intent_id as string | null) || null
    const orderTotal = Number(o.total ?? 0)
    const email = ((o.customer_email as string | null) || "").trim().toLowerCase()
    const summary = productSummary(orderItems)
    const duplicateGroupKey = email && summary ? `${email}|${summary.toLowerCase()}` : null

    if (!piId) {
      rows.push({
        orderId: String(o.id),
        orderNumber: String(o.order_number ?? ""),
        recruitncStatus: String(o.status ?? "pending"),
        customerName: (o.customer_name as string | null) ?? null,
        customerEmail: (o.customer_email as string | null) ?? null,
        productSummary: summary,
        total: orderTotal,
        placedAt: (o.created_at as string | null) ?? null,
        stripePaymentIntentId: null,
        stripeStatus: null,
        stripeAmount: null,
        stripeEmail: null,
        stripeDashboardUrl: null,
        verdict: "no_stripe_id",
        verdictLabel: "No Stripe payment ID — check Stripe manually or delete if junk",
        duplicateGroupKey,
        isDuplicate: false,
      })
      continue
    }

    let pi: Stripe.PaymentIntent | null = null
    let piError: string | null = null
    try {
      pi = await stripe.paymentIntents.retrieve(piId)
    } catch (e) {
      piError = e instanceof Error ? e.message : "Stripe lookup failed"
    }

    const v = verdictForPi(pi, orderTotal, piError)
    rows.push({
      orderId: String(o.id),
      orderNumber: String(o.order_number ?? ""),
      recruitncStatus: String(o.status ?? "pending"),
      customerName: (o.customer_name as string | null) ?? null,
      customerEmail: (o.customer_email as string | null) ?? null,
      productSummary: summary,
      total: orderTotal,
      placedAt: (o.created_at as string | null) ?? null,
      stripePaymentIntentId: piId,
      stripeDashboardUrl: stripePaymentDashboardUrl(piId),
      duplicateGroupKey,
      isDuplicate: false,
      ...v,
    })
  }

  const shipKeys = new Map<string, number>()
  for (const row of rows) {
    if (row.verdict !== "ship" && row.verdict !== "amount_mismatch") continue
    if (!row.duplicateGroupKey) continue
    shipKeys.set(row.duplicateGroupKey, (shipKeys.get(row.duplicateGroupKey) ?? 0) + 1)
  }

  let duplicateGroups = 0
  for (const row of rows) {
    const count = row.duplicateGroupKey ? shipKeys.get(row.duplicateGroupKey) ?? 0 : 0
    row.isDuplicate = count > 1
    if (row.isDuplicate && (row.verdict === "ship" || row.verdict === "amount_mismatch")) {
      row.verdictLabel = `${row.verdictLabel} — DUPLICATE (${count} paid orders for same item)`
    }
  }
  duplicateGroups = [...shipKeys.values()].filter((n) => n > 1).length

  return {
    rows,
    summary: {
      checked: rows.length,
      ship: rows.filter((r) => r.verdict === "ship").length,
      notPaid: rows.filter((r) => r.verdict === "not_paid").length,
      noStripeId: rows.filter((r) => r.verdict === "no_stripe_id").length,
      amountMismatch: rows.filter((r) => r.verdict === "amount_mismatch").length,
      stripeErrors: rows.filter((r) => r.verdict === "stripe_error").length,
      duplicateGroups,
    },
  }
}
