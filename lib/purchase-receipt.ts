/**
 * A receipt for every purchase.
 *
 * Store orders and national team fees have always emailed one. Nothing else did: a family could
 * pay for a subscription, Blue, a TOC entry or a drop-in and receive nothing with the amount on
 * it - Blue sent a welcome, the subscription sent a text to staff. This is the receipt for all
 * of those, sent from the Stripe webhook the moment the payment is confirmed, and again for
 * each subscription renewal.
 *
 * It only sends for payments it can positively name as ours. The Stripe account is shared with
 * The Wrestling Guild and not every Guild session is marked as one, so "everything that is not
 * Guild" would put an NC United receipt in a Guild customer's inbox.
 *
 * Ledger (Supabase SQL Editor):
 *
 * create table if not exists public.purchase_receipt_emails (
 *   stripe_ref text primary key,
 *   kind text not null,
 *   recipient_email text not null,
 *   amount_cents integer not null,
 *   sent_at timestamptz not null default now()
 * );
 * alter table public.purchase_receipt_emails enable row level security;
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { appDownloadEmailHtml, appDownloadEmailText } from "@/lib/app-download-email-block"

const FROM = "NC Wrestling United <info@ncwrestlingunited.com>"
const CONTACT_EMAIL = "info@ncwrestlingunited.com"

export type ReceiptKind = "subscription" | "command_center" | "scouting_report" | "blue" | "toc_registration" | "drop_in"

type Metadata = Record<string, string | undefined> | null | undefined

/**
 * Which of our products a Checkout session paid for, or null when this module should stay out.
 *
 * Null covers three cases: the Guild, anything unrecognised, and the flows that already send a
 * receipt of their own (national team fees, and Spartan gifts, whose acknowledgement is a tax
 * letter with its own pause switch).
 */
export function receiptKindForCheckout(metadata: Metadata): ReceiptKind | null {
  const m = metadata ?? {}
  if (m.source === "national_team" || m.channel === "spartan") return null
  if (m.source === "scouting_report") {
    // The Recruiting Command Center is a subscription of its own, never "Scouting report".
    if (m.kind === "command_center") return "command_center"
    return m.kind === "subscription" || m.kind === "subscription_annual" ? "subscription" : "scouting_report"
  }
  if (m.channel === "blue" && (m.signup_id || m.membership_id)) return "blue"
  if (m.source === "toc_reg" && m.registration_type === "TOC Reg") return "toc_registration"
  if (m.business === "nc_united_calendar") return "drop_in"
  return null
}

const KIND_LABEL: Record<ReceiptKind, string> = {
  subscription: "RecruitNC Rankings subscription",
  command_center: "Recruiting Command Center subscription",
  scouting_report: "Scouting report",
  blue: "NC United Blue membership",
  toc_registration: "Tournament of Champions registration",
  drop_in: "NC United practice drop-in",
}

export type ReceiptLine = { description: string; amountCents: number }

export type PurchaseReceipt = {
  kind: ReceiptKind
  firstName: string | null
  lines: ReceiptLine[]
  totalCents: number
  paidAtIso: string
  /** Stripe's own id for the payment, quoted so a family can cite it when they write in. */
  reference: string
  /** Set on a subscription, first payment or renewal: says the charge repeats. */
  recurring: boolean
}

function usd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function paidOn(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function buildPurchaseReceiptEmail(r: PurchaseReceipt): { subject: string; html: string; text: string } {
  const label = KIND_LABEL[r.kind]
  const greeting = r.firstName ? `Hi ${r.firstName},` : "Hi,"
  const lines = r.lines.length ? r.lines : [{ description: label, amountCents: r.totalCents }]
  const recurringNote = r.recurring
    ? "This is a recurring charge. To change or cancel it, sign in and open your profile, or reply to this email."
    : null

  const rows = lines
    .map(
      (l) =>
        `<tr><td style="padding: 6px 0;">${escapeHtml(l.description)}</td><td style="padding: 6px 0; text-align: right; white-space: nowrap;">${usd(l.amountCents)}</td></tr>`,
    )
    .join("")

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #03154C; padding: 22px 28px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Your receipt</h1>
  </div>
  <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>${escapeHtml(greeting)}</p>
    <p>Thank you. This is your receipt for <strong>${escapeHtml(label)}</strong>, paid ${paidOn(r.paidAtIso)}.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tbody>${rows}</tbody>
      <tfoot><tr style="border-top: 1px solid #e5e7eb; font-weight: bold;"><td style="padding: 10px 0;">Total paid</td><td style="padding: 10px 0; text-align: right;">${usd(r.totalCents)}</td></tr></tfoot>
    </table>
    ${recurringNote ? `<p style="font-size: 14px; color: #374151;">${recurringNote}</p>` : ""}
    <p style="font-size: 13px; color: #6b7280;">Reference: ${escapeHtml(r.reference)}</p>
    ${appDownloadEmailHtml()}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #6b7280; font-size: 14px;">Questions about this charge? Reply to this email or write to <a href="mailto:${CONTACT_EMAIL}" style="color: #03154C;">${CONTACT_EMAIL}</a>.</p>
  </div>
</body>
</html>`

  const text = [
    greeting,
    "",
    `Thank you. This is your receipt for ${label}, paid ${paidOn(r.paidAtIso)}.`,
    "",
    ...lines.map((l) => `${l.description}: ${usd(l.amountCents)}`),
    `Total paid: ${usd(r.totalCents)}`,
    ...(recurringNote ? ["", recurringNote] : []),
    "",
    `Reference: ${r.reference}`,
    "",
    appDownloadEmailText(),
    "",
    `Questions about this charge? Reply to this email or write to ${CONTACT_EMAIL}.`,
  ].join("\n")

  return { subject: `Your receipt: ${label} (${usd(r.totalCents)})`, html, text }
}

function validEmail(s: string | null | undefined): string | null {
  const v = (s ?? "").trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null
}

function firstNameOf(name: string | null | undefined): string | null {
  return (name ?? "").trim().split(/\s+/)[0] || null
}

/**
 * Claim the ledger row, then send. Stripe redelivers events, and both `invoice.paid` and a
 * retried `checkout.session.completed` arrive more than once; the primary key is what makes a
 * second delivery a no-op. If the ledger cannot be written nothing is sent - a missing receipt
 * can be resent by hand, a receipt per retry cannot be unsent.
 */
async function sendOnce(admin: SupabaseClient, to: string, receipt: PurchaseReceipt): Promise<void> {
  const { error: claimErr } = await admin.from("purchase_receipt_emails").insert({
    stripe_ref: receipt.reference,
    kind: receipt.kind,
    recipient_email: to,
    amount_cents: receipt.totalCents,
  })
  if (claimErr) {
    if (claimErr.code !== "23505") console.error("[purchase-receipt] ledger write failed", receipt.reference, claimErr.message)
    return
  }

  const release = () => admin.from("purchase_receipt_emails").delete().eq("stripe_ref", receipt.reference)
  if (!process.env.RESEND_API_KEY) {
    console.warn("[purchase-receipt] RESEND_API_KEY not configured, receipt not sent", receipt.reference)
    await release()
    return
  }
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { subject, html, text } = buildPurchaseReceiptEmail(receipt)
    const result = await resend.emails.send({ from: FROM, to: [to], replyTo: CONTACT_EMAIL, subject, html, text })
    if (result.error) throw new Error(result.error.message)
  } catch (err) {
    console.error("[purchase-receipt] send failed", receipt.reference, err)
    await release()
  }
}

async function receiptForCheckoutSession(stripe: Stripe, session: Stripe.Checkout.Session): Promise<{ to: string; receipt: PurchaseReceipt } | null> {
  if (session.payment_status !== "paid") return null
  const totalCents = session.amount_total ?? 0
  if (totalCents < 1) return null // a scholarship or a 100% coupon is not a purchase
  const kind = receiptKindForCheckout(session.metadata as Metadata)
  if (!kind) return null
  const to = validEmail(session.customer_details?.email) ?? validEmail(session.customer_email)
  if (!to) {
    console.warn("[purchase-receipt] no customer email on session", session.id)
    return null
  }

  let lines: ReceiptLine[] = []
  try {
    const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 20 })
    lines = items.data
      .filter((i) => i.description)
      .map((i) => ({
        description: (i.quantity ?? 1) > 1 ? `${i.description} × ${i.quantity}` : String(i.description),
        amountCents: i.amount_total,
      }))
  } catch (err) {
    console.error("[purchase-receipt] line items unavailable, sending the total only", session.id, err)
  }

  return {
    to,
    receipt: {
      kind,
      firstName: firstNameOf(session.customer_details?.name),
      lines,
      totalCents,
      paidAtIso: new Date(session.created * 1000).toISOString(),
      reference: session.id,
      recurring: session.mode === "subscription",
    },
  }
}

/** A renewal belongs to us only if the subscription is one we hold a row for. */
async function receiptForRenewalInvoice(admin: SupabaseClient, invoice: Stripe.Invoice): Promise<{ to: string; receipt: PurchaseReceipt } | null> {
  // The first invoice of a subscription is the Checkout session's receipt.
  if (invoice.billing_reason !== "subscription_cycle") return null
  const totalCents = invoice.amount_paid ?? 0
  if (totalCents < 1 || !invoice.id) return null
  const sub = (invoice as { subscription?: string | { id?: string } | null }).subscription
  const subscriptionId = typeof sub === "string" ? sub : sub?.id ?? null
  if (!subscriptionId) return null
  const to = validEmail(invoice.customer_email)
  if (!to) return null

  const [{ data: subscriber }, { data: blue }] = await Promise.all([
    admin.from("recruitnc_subscriptions").select("user_id").eq("stripe_subscription_id", subscriptionId).maybeSingle(),
    admin.from("blue_memberships").select("id").eq("stripe_subscription_id", subscriptionId).limit(1),
  ])
  const kind: ReceiptKind | null = subscriber ? "subscription" : blue?.length ? "blue" : null
  if (!kind) return null

  const paidAt = invoice.status_transitions?.paid_at ?? invoice.created
  return {
    to,
    receipt: {
      kind,
      firstName: firstNameOf(invoice.customer_name),
      lines: (invoice.lines?.data ?? [])
        .filter((l) => l.description)
        .map((l) => ({ description: String(l.description), amountCents: l.amount })),
      totalCents,
      paidAtIso: new Date(paidAt * 1000).toISOString(),
      reference: invoice.id,
      recurring: true,
    },
  }
}

/** Called for every Stripe event; sends at most one receipt, and only for the events that are a payment. */
export async function sendPurchaseReceiptForEvent(admin: SupabaseClient, stripe: Stripe, event: Stripe.Event): Promise<void> {
  let found: { to: string; receipt: PurchaseReceipt } | null = null
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    found = await receiptForCheckoutSession(stripe, event.data.object as Stripe.Checkout.Session)
  } else if (event.type === "invoice.paid") {
    found = await receiptForRenewalInvoice(admin, event.data.object as Stripe.Invoice)
  }
  if (found) await sendOnce(admin, found.to, found.receipt)
}
