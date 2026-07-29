import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { findProductByIdOrPrefix } from "@/lib/store/product-utils"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"
import { getStripe, readStripeSecretKey, stripeKeyMissingPayload } from "@/lib/stripe"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

function parseItemsFromMetadata(meta: Record<string, string>): Array<{
  id: number | string
  name: string
  price: number
  quantity: number
  variant: { color: string; size: string }
  image?: string
}> {
  try {
    const raw = JSON.parse(meta.items || "[]") as Record<string, unknown>[]
    return raw.map((item) => {
      const v = item.variant as { color: string; size: string } | undefined
      const vStr = typeof item.v === "string" ? item.v : ""
      const variant = v ?? (vStr ? { color: vStr.split("/")[0]?.trim() || "N/A", size: vStr.split("/")[1]?.trim() || "N/A" } : { color: "N/A", size: "N/A" })
      return {
        id: (item.i as number | string) ?? (item.id as number | string) ?? 0,
        name: (item.n as string) || (item.name as string) || "Product",
        quantity: Number(item.q ?? item.quantity ?? 1),
        price: Number(item.p ?? item.price ?? 0),
        variant,
        image: item.image as string | undefined,
      }
    })
  } catch {
    return []
  }
}

export async function POST() {
  try {
    // Bulk-rewrites line items across every order. Admin only.
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

    if (!readStripeSecretKey()) {
      return NextResponse.json(stripeKeyMissingPayload(), { status: 503 })
    }
    const admin = createAdminClient()
    const stripe = getStripe()

    const { data: ordersWithPi } = await admin
      .from("orders")
      .select("id, stripe_payment_intent_id")
      .not("stripe_payment_intent_id", "is", null)

    if (!ordersWithPi?.length) {
      return NextResponse.json({ success: true, recovered: 0, failed: 0 })
    }

    const { data: allOrderItems } = await admin
      .from("order_items")
      .select("order_id")
      .in("order_id", ordersWithPi.map((o) => o.id))

    const orderIdsThatHaveItems = new Set((allOrderItems ?? []).map((r) => r.order_id))
    const ordersMissingItems = ordersWithPi.filter((o) => !orderIdsThatHaveItems.has(o.id))

    if (ordersMissingItems.length === 0) {
      return NextResponse.json({ success: true, recovered: 0, failed: 0 })
    }

    const { data: productCache } = await admin.from("products").select("id, name, image_url").limit(5000)
    const productsList = productCache ?? []

    let recovered = 0
    let failed = 0

    for (const order of ordersMissingItems) {
      const piId = order.stripe_payment_intent_id as string
      if (!piId) continue
      try {
        const pi = await stripe.paymentIntents.retrieve(piId)
        const meta = (pi.metadata || {}) as Record<string, string>
        let items = parseItemsFromMetadata(meta)
        if (items.length === 0 && Number(meta.total) > 0) {
          items = [
            {
              id: "drop-in",
              name: "Order items",
              quantity: 1,
              price: Number(meta.total) || 0,
              variant: { color: "N/A", size: "N/A" },
            },
          ]
        }
        if (items.length === 0) {
          failed++
          continue
        }
        const orderItems = items.map((i, idx) => {
          const product = i.id && i.id !== "drop-in" ? findProductByIdOrPrefix(productsList, String(i.id)) : null
          const resolvedProductId = product?.id ?? (typeof i.id === "string" && /^[0-9a-f-]{36}$/i.test(i.id) ? i.id : null)
          const name = product?.name || i.name
          return {
            order_id: order.id,
            product_id: resolvedProductId,
            product_name: name,
            sku: syntheticOrderItemSku({
              productId: resolvedProductId,
              sourceId: i.id,
              label: name,
              dedupeKey: `${piId}:${idx}`,
            }),
            variant: i.variant,
            quantity: i.quantity,
            price: i.price,
            image_url: i.image ?? product?.image_url ?? null,
          }
        })
        const { error } = await admin.from("order_items").insert(orderItems)
        if (error) {
          console.error("[fix-all-orders-items] insert order_items:", order.id, error)
          failed++
        } else {
          recovered++
        }
      } catch (err) {
        console.error("[fix-all-orders-items] order", order.id, err)
        failed++
      }
    }

    return NextResponse.json({ success: true, recovered, failed })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fix orders"
    console.error("[fix-all-orders-items]", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
