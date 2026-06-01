import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { flatShippingFromAddress, shippingNameFromCustomerName } from "@/lib/order-shipping"
import {
  fetchMergedStoreMetadata,
  isPlaceholderOrderCustomer,
  parseLegacyShippingAddressJson,
  parseLegacyShippingMethodJson,
} from "@/lib/store/stripe-legacy-metadata"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

function getStripe(): Stripe {
  if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(stripeSecret)
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

/** POST: Backfill customer + shipping from Stripe Charge metadata (legacy store) or billing_details. */
export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const admin = createAdminClient()
    const stripe = getStripe()

    const { data: orders } = await admin
      .from("orders")
      .select("id, order_number, customer_email, customer_name, stripe_payment_intent_id, shipping_address, shipping_method")
      .not("stripe_payment_intent_id", "is", null)

    const needBackfill = (orders ?? []).filter((o) => {
      const addr = (o.shipping_address as Record<string, unknown>) || {}
      const missingAddress = !String(addr.address1 ?? addr.line1 ?? "").trim()
      return isPlaceholderOrderCustomer(o.customer_email ?? null, o.customer_name ?? null) || missingAddress
    })

    let updated = 0
    let failed = 0

    for (const order of needBackfill) {
      const piId = order.stripe_payment_intent_id as string
      if (!piId) continue
      try {
        const { meta } = await fetchMergedStoreMetadata(stripe, piId)
        const email = meta.customer_email?.trim()
        const name = meta.customer_name?.trim()
        const shippingAddress = parseLegacyShippingAddressJson(meta.shipping_address)
        const shippingMethod = parseLegacyShippingMethodJson(meta.shipping_method)

        if (!email && !name && Object.keys(shippingAddress).length === 0) {
          const pi = await stripe.paymentIntents.retrieve(piId)
          const chargeId = pi.latest_charge
          if (chargeId) {
            const charge = await stripe.charges.retrieve(chargeId as string)
            const billingEmail = (charge.billing_details?.email ?? "").trim()
            const billingName = (charge.billing_details?.name ?? "").trim()
            if (!billingEmail && !billingName) {
              failed++
              continue
            }
            const update = {
              customer_email: billingEmail || order.customer_email,
              email: billingEmail || order.customer_email,
              customer_name: billingName || order.customer_name || (billingEmail ? billingEmail.split("@")[0] : "Customer"),
            }
            const { error } = await admin.from("orders").update(update).eq("id", order.id)
            if (error) failed++
            else updated++
            continue
          }
          failed++
          continue
        }

        const resolvedName =
          name ||
          [shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(" ").trim() ||
          order.customer_name ||
          "Customer"

        const update: Record<string, unknown> = {}
        if (email && isPlaceholderOrderCustomer(order.customer_email ?? null, order.customer_name ?? null)) {
          update.customer_email = email
          update.email = email
          update.customer_name = resolvedName
        } else if (name && isPlaceholderOrderCustomer(order.customer_email ?? null, order.customer_name ?? null)) {
          update.customer_name = name
        }

        const addr = (order.shipping_address as Record<string, unknown>) || {}
        if (!String(addr.address1 ?? addr.line1 ?? "").trim() && Object.keys(shippingAddress).length > 0) {
          const shippingName = shippingNameFromCustomerName(resolvedName)
          Object.assign(update, flatShippingFromAddress(shippingAddress))
          update.shipping_first_name = shippingName.shipping_first_name
          update.shipping_last_name = shippingName.shipping_last_name
          update.shipping_address = shippingAddress
          update.shipping_method = shippingMethod
        }

        if (Object.keys(update).length === 0) {
          failed++
          continue
        }

        const { error } = await admin.from("orders").update(update).eq("id", order.id)
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
