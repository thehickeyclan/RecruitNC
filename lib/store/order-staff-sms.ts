/**
 * Text staff when a paid NC United Store order is placed.
 *
 * Env: RECRUITNC_STORE_NEW_ORDER_SMS_TO — comma-separated US numbers (e.g. 5169673004,6315551234).
 * Uses Twilio via lib/sms.ts (same as reimbursement alerts).
 *
 * Log table (Supabase SQL Editor):
 *
 * create table if not exists public.order_staff_sms (
 *   order_id uuid primary key references public.orders (id) on delete cascade,
 *   sent_at timestamptz not null default now()
 * );
 * create index if not exists order_staff_sms_sent_at_idx on public.order_staff_sms (sent_at desc);
 * alter table public.order_staff_sms enable row level security;
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { formatOrderItemVariantForEmail } from "@/lib/email"
import { sendSms, toE164 } from "@/lib/sms"
import { isStoreMerchandiseOrder } from "@/lib/store/is-store-merchandise-order"
import { mapOrderItemsToReceiptLines } from "@/lib/store/order-receipt-preview"

const STAFF_SMS_ENV = "RECRUITNC_STORE_NEW_ORDER_SMS_TO"

function staffSmsEnabled(): boolean {
  const v = process.env.STORE_DISABLE_STAFF_ORDER_SMS
  if (!v) return true
  return v !== "1" && v.toLowerCase() !== "true" && v.toLowerCase() !== "yes"
}

function staffAlertE164Recipients(): string[] {
  const raw =
    process.env[STAFF_SMS_ENV]?.trim() ||
    process.env.RECRUITNC_REIMBURSEMENT_NEW_REQUEST_SMS_TO?.trim()
  if (!raw) return []
  const out: string[] = []
  for (const part of raw.split(",")) {
    const e = toE164(part.trim())
    if (e) out.push(e)
  }
  return out
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

function customerLabel(name: string | null | undefined, email: string | null | undefined): string {
  const n = (name ?? "").trim()
  const e = (email ?? "").trim()
  if (n && n.toLowerCase() !== "customer" && n.toLowerCase() !== "unknown") {
    return n
  }
  if (e && !e.includes("placeholder")) return e
  return n || e || "A customer"
}

type ItemRow = {
  product_name?: string | null
  variant?: unknown
  color?: string | null
  size?: string | null
  quantity?: number | null
  price?: number | null
}

/** Plain-English line list for SMS (e.g. "2× NC Tee (Navy, L), 1× Singlet (Red, M)"). */
export function formatStoreOrderItemsForStaffSms(itemRows: ItemRow[], maxChars = 320): string {
  const lines = mapOrderItemsToReceiptLines(itemRows)
  if (lines.length === 0) return "Store purchase (line items pending)"

  const parts: string[] = []
  for (const line of lines) {
    const qty = line.quantity > 1 ? `${line.quantity}× ` : "1× "
    let variant = line.variant.trim()
    if (variant) variant = variant.replace(/\s*\/\s*/g, ", ")
    const label = variant ? `${line.name} (${variant})` : line.name
    parts.push(`${qty}${label}`)
  }

  let text = parts.join(", ")
  if (text.length <= maxChars) return text

  let kept = 0
  const truncated: string[] = []
  for (const part of parts) {
    const next = truncated.length === 0 ? part : `${truncated.join(", ")}, ${part}`
    if (next.length > maxChars - 20) break
    truncated.push(part)
    kept++
  }
  const remaining = parts.length - kept
  if (remaining > 0) {
    return `${truncated.join(", ")} + ${remaining} more item${remaining === 1 ? "" : "s"}`
  }
  return text.slice(0, maxChars - 3) + "..."
}

export function buildStoreOrderStaffSmsBody(params: {
  orderNumber: string
  customerName: string | null | undefined
  customerEmail: string | null | undefined
  total: number
  itemRows: ItemRow[]
}): string {
  const who = customerLabel(params.customerName, params.customerEmail)
  const items = formatStoreOrderItemsForStaffSms(params.itemRows)
  const total = formatMoney(params.total)
  const orderRef = params.orderNumber.trim() || "new order"
  return `NC United Store: ${who} placed order ${orderRef} for ${total} — ${items}.`
}

/** Idempotent staff SMS for paid merchandise store orders. Does not throw. */
export async function notifyStaffStoreOrderSmsIfEligible(
  admin: SupabaseClient,
  orderId: string,
): Promise<void> {
  if (!staffSmsEnabled()) return

  const recipients = staffAlertE164Recipients()
  if (recipients.length === 0) {
    return
  }

  const { data: existing } = await admin
    .from("order_staff_sms")
    .select("order_id")
    .eq("order_id", orderId)
    .maybeSingle()
  if (existing) return

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select(
      "id, order_number, customer_email, customer_name, total, status, channel, shipping_method",
    )
    .eq("id", orderId)
    .maybeSingle()
  if (orderErr || !order) return

  const row = order as {
    order_number: string | null
    customer_email: string | null
    customer_name: string | null
    total: number | null
    status: string | null
    channel: string | null
    shipping_method: unknown
  }

  if (row.status !== "paid") return
  if (!isStoreMerchandiseOrder(row)) return

  const { data: itemRows } = await admin
    .from("order_items")
    .select("product_name, variant, color, size, quantity, price")
    .eq("order_id", orderId)

  const body = buildStoreOrderStaffSmsBody({
    orderNumber: row.order_number ?? "",
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    total: Number(row.total ?? 0),
    itemRows: itemRows ?? [],
  })

  let sent = 0
  for (const e164 of recipients) {
    const ok = await sendSms(e164, body)
    if (ok) sent++
  }

  if (sent === 0) {
    console.warn("[RecruitNC] store staff SMS: not sent (Twilio or delivery error)", orderId.slice(0, 8))
    return
  }

  const { error: logErr } = await admin.from("order_staff_sms").upsert(
    { order_id: orderId, sent_at: new Date().toISOString() },
    { onConflict: "order_id" },
  )
  if (logErr) {
    console.error("[RecruitNC] store staff SMS: log failed", orderId, logErr.message)
  } else {
    console.log("[RecruitNC] store staff SMS: sent", orderId.slice(0, 8), "to", sent, "recipient(s)")
  }
}
