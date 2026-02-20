import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const stripeSecret = process.env.STRIPE_SECRET_KEY

export async function POST(request: NextRequest) {
  if (!webhookSecret || !stripeSecret) {
    console.error("[webhooks/stripe] STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY not set")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[webhooks/stripe] Signature verification failed:", message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const admin = createAdminClient()
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null

    const signupId = session.metadata?.signup_id
    if (signupId) {
      const { error } = await admin
        .from("blue_signups")
        .update({
          status: "paid",
          stripe_session_id: session.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", signupId)
      if (error) {
        console.error("[webhooks/stripe] Failed to update blue_signups:", error.message)
        return NextResponse.json({ error: "Update failed" }, { status: 500 })
      }
      return NextResponse.json({ received: true })
    }

    const membershipId = session.metadata?.membership_id
    if (membershipId) {
      const { error } = await admin
        .from("blue_memberships")
        .update({
          status: "active",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", membershipId)
      if (error) {
        console.error("[webhooks/stripe] Failed to update blue_memberships:", error.message)
        return NextResponse.json({ error: "Update failed" }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ received: true })
}
