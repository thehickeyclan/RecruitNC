import "server-only"
import Stripe from "stripe"
import { mapStripeSubscriptionToMembershipStatus } from "@/lib/blue-stripe-subscription-status"
import type { BlueMembershipStripeStatus } from "@/lib/blue-stripe-subscription-status"

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(key)
}

export type BlueStripeInvoiceRow = {
  id: string
  date: string
  amountFormatted: string
  amountCents: number
  status: string
}

export type BlueStripeBillingDetails = {
  nextBillingAt: string | null
  lastPaymentAt: string | null
  amountFormatted: string | null
  cancelAtPeriodEnd: boolean
  /** Stripe-derived status (includes collection paused while sub.status is active). */
  effectiveStatus: BlueMembershipStripeStatus
  collectionPaused: boolean
  resumeAt: string | null
  cardBrand: string | null
  cardLast4: string | null
  planName: string | null
  paidInvoiceCount: number
  lifetimePaidCents: number
  lifetimePaidFormatted: string
  recentInvoices: BlueStripeInvoiceRow[]
  source: "live"
}

function formatMoney(cents: number, currency = "usd"): string {
  const code = currency.toLowerCase() === "usd" ? "USD" : currency.toUpperCase()
  return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(cents / 100)
}

function invoicePaidAtIso(invoice: Stripe.Invoice): string | null {
  const paidAt = invoice.status_transitions?.paid_at
  if (paidAt) return new Date(paidAt * 1000).toISOString()
  if (invoice.created) return new Date(invoice.created * 1000).toISOString()
  return null
}

async function loadPaidInvoices(stripe: Stripe, subscriptionId: string) {
  let paidInvoiceCount = 0
  let lifetimePaidCents = 0
  const recentInvoices: BlueStripeInvoiceRow[] = []
  let startingAfter: string | undefined
  let hasMore = true
  let pages = 0
  const maxPages = 10

  while (hasMore && pages < maxPages) {
    const batch = await stripe.invoices.list({
      subscription: subscriptionId,
      status: "paid",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    for (const inv of batch.data) {
      const cents = inv.amount_paid ?? 0
      if (cents > 0) {
        paidInvoiceCount += 1
        lifetimePaidCents += cents
      }
      if (recentInvoices.length < 12) {
        const date = invoicePaidAtIso(inv)
        if (date && cents > 0) {
          recentInvoices.push({
            id: inv.id,
            date,
            amountFormatted: formatMoney(cents, inv.currency ?? "usd"),
            amountCents: cents,
            status: inv.status ?? "paid",
          })
        }
      }
    }

    hasMore = batch.has_more
    if (batch.data.length) startingAfter = batch.data[batch.data.length - 1].id
    else hasMore = false
    pages += 1
  }

  return { paidInvoiceCount, lifetimePaidCents, recentInvoices }
}

/** Live subscription billing: next/last charge, card, payment totals, recent invoices. */
export async function getBlueMembershipStripeDetails(
  subscriptionId: string,
): Promise<{ ok: true; details: BlueStripeBillingDetails } | { ok: false; error: string }> {
  try {
    const stripe = getStripe()
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["default_payment_method", "items.data.price.product"],
    })

    const item = sub.items.data[0]
    let planName: string | null = null
    if (item?.price?.nickname && String(item.price.nickname).trim()) {
      planName = String(item.price.nickname).trim()
    } else {
      const product = item?.price?.product
      if (product && typeof product !== "string") {
        planName = (product as Stripe.Product).name ?? null
      }
    }
    const unitAmount = item?.price?.unit_amount ?? null
    const currency = (item?.price?.currency ?? "usd").toLowerCase()
    const amountFormatted =
      unitAmount != null ? formatMoney(unitAmount, currency) : null

    const nextBillingAt = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null

    let cardBrand: string | null = null
    let cardLast4: string | null = null
    const pm = sub.default_payment_method
    if (pm && typeof pm !== "string") {
      const card = (pm as Stripe.PaymentMethod).card
      if (card) {
        cardBrand = card.brand ?? null
        cardLast4 = card.last4 ?? null
      }
    }

    const cancelAtPeriodEnd = !!sub.cancel_at_period_end
    const mapped = mapStripeSubscriptionToMembershipStatus(sub)
    const collectionPaused = mapped.status === "paused"

    const { paidInvoiceCount, lifetimePaidCents, recentInvoices } = await loadPaidInvoices(
      stripe,
      subscriptionId,
    )

    const lastPaymentAt = recentInvoices[0]?.date ?? null

    return {
      ok: true,
      details: {
        nextBillingAt: mapped.next_billing_at ?? nextBillingAt,
        lastPaymentAt,
        amountFormatted,
        cancelAtPeriodEnd,
        effectiveStatus: mapped.status,
        collectionPaused,
        resumeAt: mapped.resume_at,
        cardBrand,
        cardLast4,
        planName,
        paidInvoiceCount,
        lifetimePaidCents,
        lifetimePaidFormatted: formatMoney(lifetimePaidCents, currency),
        recentInvoices,
        source: "live" as const,
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}
