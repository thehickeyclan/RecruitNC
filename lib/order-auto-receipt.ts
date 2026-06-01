/**
 * Idempotent store / order receipt email after payment.
 *
 * Log table (Supabase SQL Editor):
 *
 * create table if not exists public.order_receipt_emails (
 *   order_id uuid primary key references public.orders (id) on delete cascade,
 *   recipient_email text not null,
 *   sent_at timestamptz not null default now()
 * );
 * create index if not exists order_receipt_emails_sent_at_idx on public.order_receipt_emails (sent_at desc);
 * alter table public.order_receipt_emails enable row level security;
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { sendOrderConfirmationEmail } from "@/lib/email"
import { buildOrderReceiptPreview, mapOrderItemsToReceiptLines } from "@/lib/store/order-receipt-preview"

function autoReceiptEnabled() {
  const v = process.env.STORE_DISABLE_AUTO_RECEIPT
  if (!v) return true
  return v !== "1" && v.toLowerCase() !== "true" && v.toLowerCase() !== "yes"
}

/** Sends NC United Store order confirmation / receipt once per paid order. */
export async function sendOrderReceiptIfEligible(admin: SupabaseClient, orderId: string): Promise<void> {
  if (!autoReceiptEnabled()) return

  const { data: existing } = await admin
    .from("order_receipt_emails")
    .select("order_id")
    .eq("order_id", orderId)
    .maybeSingle()
  if (existing) return

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select(
      "id, order_number, customer_email, customer_name, subtotal, shipping_cost, tax, discount, total, shipping_address, status",
    )
    .eq("id", orderId)
    .maybeSingle()
  if (orderErr || !order) return

  const row = order as {
    order_number: string
    customer_email: string | null
    customer_name: string | null
    subtotal: number | null
    shipping_cost: number | null
    tax: number | null
    discount: number | null
    total: number | null
    shipping_address: Record<string, unknown> | null
    status: string | null
  }

  if (row.status !== "paid") return

  const customerEmail = (row.customer_email ?? "").trim()
  if (!customerEmail || customerEmail.includes("placeholder") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return
  }

  const { data: itemRows } = await admin
    .from("order_items")
    .select("product_name, variant, color, size, quantity, price, subtotal")
    .eq("order_id", orderId)

  const preview = buildOrderReceiptPreview(row, itemRows ?? [])
  const receiptItems = mapOrderItemsToReceiptLines(itemRows ?? [])

  const send = await sendOrderConfirmationEmail({
    orderNumber: preview.orderNumber,
    customerName: preview.customerName,
    customerEmail,
    items: receiptItems.map(({ name, variant, quantity, price }) => ({ name, variant, quantity, price })),
    subtotal: preview.subtotal,
    shipping: preview.shipping,
    tax: preview.tax,
    discount: preview.discount,
    total: preview.total,
    shippingAddress: (row.shipping_address ?? {}) as Record<string, unknown>,
  })

  if (!send.success) {
    console.error("[order-auto-receipt] send failed", orderId, send.error)
    return
  }

  const payload = {
    order_id: orderId,
    recipient_email: customerEmail,
    sent_at: new Date().toISOString(),
  }
  const { error: logErr } = await admin.from("order_receipt_emails").upsert(payload, { onConflict: "order_id" })
  if (logErr) {
    console.error("[order-auto-receipt] log failed", orderId, logErr.message)
  }
}
