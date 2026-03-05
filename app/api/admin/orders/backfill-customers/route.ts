import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

function getStripe(): Stripe {
  if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(stripeSecret)
}

function isPlaceholderCustomer(email: string | null, name: string | null): boolean {
  if (!email || !email.trim()) return true
  const e = email.trim().toLowerCase()
  if (e === "unknown@example.com" || e === "no email" || e.includes("placeholder")) return true
  if (!name || !name.trim()) return false
  const n = name.trim().toLowerCase()
  if (n === "unknown" || n === "customer" || n === "guest") return true
  return false
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

/** POST: Backfill customer_email and customer_name for orders that have stripe_payment_intent_id but missing/placeholder customer. Uses Stripe charge billing_details. */
export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const admin = createAdminClient()
    const stripe = getStripe()

    const { data: orders } = await admin
      .from("orders")
      .select("id, order_number, customer_email, customer_name, stripe_payment_intent_id")
      .not("stripe_payment_intent_id", "is", null)

    const needBackfill = (orders ?? []).filter(
      (o: { customer_email?: string | null; customer_name?: string | null }) =>
        isPlaceholderCustomer(o.customer_email ?? null, o.customer_name ?? null)
    )

    let updated = 0
    let failed = 0

    for (const order of needBackfill) {
      const piId = order.stripe_payment_intent_id as string
      if (!piId) continue
      try {
        const pi = await stripe.paymentIntents.retrieve(piId)
        const chargeId = pi.latest_charge
        if (!chargeId) {
          failed++
          continue
        }
        const charge = await stripe.charges.retrieve(chargeId as string)
        const email = (charge.billing_details?.email ?? "").trim()
        const name = (charge.billing_details?.name ?? "").trim()
        if (!email && !name) {
          failed++
          continue
        }
        const { error } = await admin
          .from("orders")
          .update({
            customer_email: email || order.customer_email,
            customer_name: name || order.customer_name || (email ? email.split("@")[0] : "Customer"),
          })
          .eq("id", order.id)
        if (error) {
          console.error("[admin/orders/backfill-customers] update", order.id, error)
          failed++
        } else {
          updated++
        }
      } catch (err) {
        console.error("[admin/orders/backfill-customers] order", order.id, err)
        failed++
      }
    }

    return NextResponse.json({ success: true, updated, failed, total: needBackfill.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backfill failed"
    console.error("[admin/orders/backfill-customers]", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
