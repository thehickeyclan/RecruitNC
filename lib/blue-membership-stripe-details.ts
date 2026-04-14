import "server-only"
import Stripe from "stripe"

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(key)
}

export type BlueStripeBillingDetails = {
  nextBillingAt: string | null
  lastPaymentAt: string | null
  amountFormatted: string | null
  cancelAtPeriodEnd: boolean
  cardBrand: string | null
  cardLast4: string | null
  planName: string | null
  source: "live"
}

/** Live subscription billing: next charge, last paid invoice, card on file, cancel-at-period-end. */
export async function getBlueMembershipStripeDetails(
  subscriptionId: string
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
      unitAmount != null
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency.toUpperCase() === "USD" ? "USD" : currency,
          }).format(unitAmount / 100)
        : null

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

    let lastPaymentAt: string | null = null
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      limit: 10,
      status: "paid",
    })
    const latestPaid = invoices.data[0]
    if (latestPaid) {
      const paidAt = latestPaid.status_transitions?.paid_at
      if (paidAt) {
        lastPaymentAt = new Date(paidAt * 1000).toISOString()
      } else if (latestPaid.created) {
        lastPaymentAt = new Date(latestPaid.created * 1000).toISOString()
      }
    }

    return {
      ok: true,
      details: {
        nextBillingAt,
        lastPaymentAt,
        amountFormatted,
        cancelAtPeriodEnd,
        cardBrand,
        cardLast4,
        planName,
        source: "live" as const,
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}
