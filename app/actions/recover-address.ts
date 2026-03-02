"use server"

import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"

const stripeSecret = process.env.STRIPE_SECRET_KEY

function getStripe(): Stripe {
  if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(stripeSecret)
}

export async function recoverAddressFromStripe(
  orderId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createAdminClient()
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("stripe_payment_intent_id, shipping_address")
      .eq("id", orderId)
      .single()

    if (fetchError || !order) {
      return { success: false, error: fetchError?.message ?? "Order not found." }
    }

    const piId = order.stripe_payment_intent_id as string | null
    if (!piId) {
      return { success: false, error: "Order has no Stripe Payment Intent." }
    }

    const stripe = getStripe()
    const pi = await stripe.paymentIntents.retrieve(piId)
    const meta = (pi.metadata || {}) as Record<string, string>

    let shippingAddress: Record<string, unknown> = {}
    try {
      shippingAddress = JSON.parse(meta.shipping_address || "{}") as Record<string, unknown>
    } catch {
      // ignore
    }

    if (Object.keys(shippingAddress).length === 0 && pi.shipping?.address) {
      const a = pi.shipping.address
      shippingAddress = {
        line1: a.line1 ?? "",
        line2: a.line2 ?? null,
        city: a.city ?? "",
        state: a.state ?? "",
        postal_code: a.postal_code ?? "",
        zip: a.postal_code ?? "",
        zipCode: a.postal_code ?? "",
        country: a.country ?? "US",
      }
    }

    if (Object.keys(shippingAddress).length === 0) {
      return { success: false, error: "No address found in Stripe." }
    }

    const current = (order.shipping_address as Record<string, unknown>) || {}
    const merged = { ...current, ...shippingAddress }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ shipping_address: merged })
      .eq("id", orderId)

    if (updateError) return { success: false, error: updateError.message }
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to recover address"
    console.error("[recover-address]", err)
    return { success: false, error: message }
  }
}
