import { NextResponse } from "next/server"
import Stripe from "stripe"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

const LIMIT = 60

function formatDestination(payout: Stripe.Payout): string {
  const dest = payout.destination
  if (typeof dest === "object" && dest && "object" in dest) {
    const bank = dest as { bank_name?: string; last4?: string; object?: string }
    if (bank.object === "bank_account" && (bank.bank_name || bank.last4)) {
      return [bank.bank_name, bank.last4 ? `.... ${bank.last4}` : ""].filter(Boolean).join(" ")
    }
  }
  return "Bank account"
}

/**
 * GET: List Stripe payouts (same data as Stripe Dashboard → Transactions → Payouts).
 * Returns amount, destination, arrive by, status, method.
 */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret?.trim()) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 503 })
  }

  const stripe = new Stripe(stripeSecret)
  const payouts: Array<{
    id: string
    amount: number
    amountFormatted: string
    currency: string
    status: string
    method: string
    arrivalDate: string
    createdAt: number
    destination: string
  }> = []

  try {
    const list = await stripe.payouts.list({
      limit: LIMIT,
      expand: ["data.destination"],
    })
    for (const p of list.data) {
      payouts.push({
        id: p.id,
        amount: p.amount,
        amountFormatted: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: (p.currency ?? "usd").toUpperCase(),
        }).format(p.amount / 100),
        currency: p.currency ?? "usd",
        status: p.status ?? "unknown",
        method: p.method ?? "standard",
        arrivalDate: p.arrival_date
          ? new Date(p.arrival_date * 1000).toISOString().slice(0, 10)
          : "",
        createdAt: p.created,
        destination: formatDestination(p),
      })
    }
  } catch (e) {
    console.error("[admin/orders/payouts]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list payouts" },
      { status: 500 }
    )
  }

  return NextResponse.json({ payouts })
}
