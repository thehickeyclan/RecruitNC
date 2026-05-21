import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { findProductByIdOrPrefix } from "@/lib/store/product-utils"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"
import { decodeLineItemsMetadata } from "@/lib/nhsca-hub-checkout-pricing"
import {
  ensureNationalTeamOrderLineItems,
  isGenericPlaceholderOrderItemName,
} from "@/lib/national-team-order-items"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

function getStripe(): Stripe {
  if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(stripeSecret)
}

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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : ""

    if (!orderId) {
      return NextResponse.json({ success: false, error: "orderId is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const stripe = getStripe()

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, stripe_payment_intent_id, total")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 })
    }

    const { data: existingItems } = await admin.from("order_items").select("id, product_name").eq("order_id", orderId)
    const hasOnlyGeneric =
      existingItems &&
      existingItems.length > 0 &&
      existingItems.every((i) => isGenericPlaceholderOrderItemName((i as { product_name?: string }).product_name))
    if (existingItems && existingItems.length > 0 && !hasOnlyGeneric) {
      return NextResponse.json({
        success: true,
        message: "Order already has items. No recovery needed.",
      })
    }

    const piId = order.stripe_payment_intent_id as string | null
    if (!piId) {
      return NextResponse.json(
        { success: false, error: "Order has no Stripe Payment Intent. Use Recover order with Payment Intent ID instead." },
        { status: 400 }
      )
    }

    const pi = await stripe.paymentIntents.retrieve(piId)
    const meta = (pi.metadata || {}) as Record<string, string>

    const sessions = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 })
    const session = sessions.data?.[0]
    if (session?.metadata?.source === "national_team") {
      const linesEncoded = (session.metadata?.checkout_lines as string | undefined) ?? ""
      const orderTotalCents = Math.round(Number((order as { total?: number }).total ?? 0) * 100)
      const { data: reg } = await admin
        .from("national_team_event_registrations")
        .select("reg_fee_cents, apparel_fee_cents")
        .eq("order_id", orderId)
        .maybeSingle()
      const regTotal =
        reg != null
          ? (Number((reg as { reg_fee_cents?: number }).reg_fee_cents) || 0) +
            (Number((reg as { apparel_fee_cents?: number }).apparel_fee_cents) || 0)
          : orderTotalCents
      const { data: products } = await admin.from("products").select("id, name, slug").eq("category", "national_team")
      const bundleProduct =
        (products ?? []).find((p: { slug?: string }) => p.slug === "nhsca-2026-bundle") ?? (products ?? [])[0]
      const replaced = await ensureNationalTeamOrderLineItems(admin, {
        orderId,
        paymentIntentId: piId,
        linesEncoded,
        totalCents: regTotal > 0 ? regTotal : orderTotalCents,
        bundleProduct: bundleProduct as { id?: string; name?: string } | null,
      })
      if (replaced) {
        if (linesEncoded) {
          await admin
            .from("national_team_event_registrations")
            .update({ checkout_lines: linesEncoded.slice(0, 500), updated_at: new Date().toISOString() })
            .eq("order_id", orderId)
        }
        await admin
          .from("orders")
          .update({
            shipping_method: { name: "National team event", price: 0 },
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)
        return NextResponse.json({
          success: true,
          message: "Recovered NHSCA hub line items from Stripe checkout.",
        })
      }
    }

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
      if (session?.id) {
        const sessionWithItems = await stripe.checkout.sessions.retrieve(session.id, { expand: ["line_items"] })
        const lineItems = (sessionWithItems as { line_items?: { data?: Array<{ description?: string; quantity?: number; amount_subtotal?: number }> } }).line_items?.data ?? []
        if (lineItems.length > 0) {
          items = lineItems.map((li) => ({
            id: "session-item",
            name: li.description ?? "Item",
            quantity: li.quantity ?? 1,
            price: ((li.amount_subtotal ?? 0) / 100) / (li.quantity ?? 1),
            variant: { color: "N/A", size: "N/A" },
          }))
        }
      }
    }

    if (items.length === 0) {
      const orderTotal = Number((order as { total?: number }).total) || 0
      if (orderTotal > 0) {
        items = [
          {
            id: "recovered",
            name: "Recovered item",
            quantity: 1,
            price: orderTotal,
            variant: { color: "N/A", size: "N/A" },
          },
        ]
      }
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: "No items in Stripe (Payment Intent or Session) and order has no total. Nothing to recover." },
        { status: 400 }
      )
    }

    const { data: productCache } = await admin.from("products").select("id, name, image_url").limit(5000)
    const productsList = productCache ?? []

    const orderItems = items.map((i, idx) => {
      const product = i.id && i.id !== "drop-in" ? findProductByIdOrPrefix(productsList, String(i.id)) : null
      const resolvedProductId = product?.id ?? (typeof i.id === "string" && /^[0-9a-f-]{36}$/i.test(i.id) ? i.id : null)
      const name = product?.name || i.name
      return {
        order_id: orderId,
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

    const { error: insertError } = await admin.from("order_items").insert(orderItems)
    if (insertError) {
      console.error("[recover-order-items] insert:", insertError)
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Recovered ${orderItems.length} item(s) from Stripe.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to recover order items"
    console.error("[recover-order-items]", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
