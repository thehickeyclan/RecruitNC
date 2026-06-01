import type Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"
import { findProductByIdOrPrefix } from "@/lib/store/product-utils"
import { fetchMergedStoreMetadata, parseLegacyStoreItems } from "@/lib/store/stripe-legacy-metadata"

export type ParsedStoreLineItem = {
  id: string | number
  name: string
  price: number
  quantity: number
  variant: { color: string; size: string }
  image?: string
}

function parseVariantFromItem(item: Record<string, unknown>): { color: string; size: string } {
  const v = item.variant as { color?: string; size?: string } | undefined
  const vStr = typeof item.v === "string" ? item.v : ""
  if (v?.color || v?.size) {
    return {
      color: (v.color ?? "").trim() || "N/A",
      size: (v.size ?? "").trim() || "N/A",
    }
  }
  if (vStr) {
    const [color, size] = vStr.split("/")
    return {
      color: color?.trim() || "N/A",
      size: size?.trim() || "N/A",
    }
  }
  return { color: "N/A", size: "N/A" }
}

/** Parse Stripe `items` metadata with product name/id resolution (legacy store compact format). */
export function parseStoreItemsFromMetadata(
  meta: Record<string, string>,
  productsList: { id: string; name: string | null; image_url: string | null }[],
): ParsedStoreLineItem[] {
  try {
    const raw = JSON.parse(meta.items || "[]") as Record<string, unknown>[]
    return raw.map((item) => {
      const itemId = (item.i as string | number) ?? (item.id as string | number) ?? 0
      const itemName = (item.n as string) || (item.name as string) || "Product"
      const product = findProductByIdOrPrefix(productsList, String(itemId))
      const variant = parseVariantFromItem(item)
      return {
        id: product?.id ?? itemId,
        name: product?.name || itemName,
        quantity: Number(item.q ?? item.quantity ?? 1),
        price: Number(item.p ?? item.price ?? 0),
        variant,
        image: (item.image as string | undefined) ?? product?.image_url ?? undefined,
      }
    })
  } catch {
    return parseLegacyStoreItems(meta) as ParsedStoreLineItem[]
  }
}

function dbItemQuantitySum(items: { quantity?: number | null }[] | null | undefined): number {
  return (items ?? []).reduce((sum, i) => sum + Math.max(1, Number(i.quantity ?? 1)), 0)
}

function dbItemsMissingVariants(
  items: {
    color?: string | null
    size?: string | null
    variant?: { color?: string; size?: string } | null
  }[],
): boolean {
  if (items.length === 0) return false
  return items.every((item) => {
    const variantObj = item.variant || {}
    const color = (item.color || variantObj.color || "").trim()
    const size = (item.size || variantObj.size || "").trim()
    return !color || !size || color === "N/A" || size === "N/A"
  })
}

/** True when Supabase line items are incomplete vs Stripe metadata (count, subtotal, or sizes). */
export function storeOrderItemsNeedReconcile(
  order: { subtotal?: number | null; total?: number | null },
  dbItems: {
    quantity?: number | null
    color?: string | null
    size?: string | null
    variant?: { color?: string; size?: string } | null
  }[],
  meta: Record<string, string>,
  stripeItems: ParsedStoreLineItem[],
): boolean {
  if (stripeItems.length === 0) return false

  const dbQty = dbItemQuantitySum(dbItems)
  const stripeQty = dbItemQuantitySum(stripeItems)
  const expectedMetaCount = parseInt(meta.item_count || "0", 10)

  if (expectedMetaCount > 0 && dbQty < expectedMetaCount) return true
  if (stripeItems.length > dbItems.length) return true
  if (stripeQty > dbQty) return true

  const subtotal = Number(order.subtotal ?? 0)
  if (subtotal > 0 && dbQty > 0) {
    const avgUnit =
      stripeItems.reduce((s, i) => s + Number(i.price || 0), 0) / Math.max(1, stripeItems.length)
    if (avgUnit > 0) {
      const expectedQty = Math.round(subtotal / avgUnit)
      if (expectedQty > dbQty && expectedQty >= stripeQty) return true
    }
  }

  if (
    dbItemsMissingVariants(dbItems) &&
    stripeItems.some((i) => i.variant.color !== "N/A" || i.variant.size !== "N/A")
  ) {
    return true
  }

  return false
}

export async function reconcileStoreOrderItemsFromStripe(
  supabase: SupabaseClient,
  orderId: string,
  stripe: Stripe,
  opts?: { force?: boolean },
): Promise<{ reconciled: boolean; itemCount: number; reason?: string; truncated?: boolean }> {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, stripe_payment_intent_id, subtotal, total")
    .eq("id", orderId)
    .single()

  if (orderError || !order) {
    return { reconciled: false, itemCount: 0, reason: "order not found" }
  }

  const piId = order.stripe_payment_intent_id as string | null
  if (!piId) {
    return { reconciled: false, itemCount: 0, reason: "no payment intent" }
  }

  const { data: existingItems } = await supabase
    .from("order_items")
    .select("id, quantity, color, size, variant, product_name, price")
    .eq("order_id", orderId)

  const dbItems = existingItems ?? []

  const { meta } = await fetchMergedStoreMetadata(stripe, piId)
  const { data: productCache } = await supabase.from("products").select("id, name, image_url").limit(5000)
  const productsList = productCache ?? []
  const stripeItems = parseStoreItemsFromMetadata(meta, productsList)

  if (stripeItems.length === 0) {
    return { reconciled: false, itemCount: dbItems.length, reason: "no stripe items" }
  }

  const needs =
    opts?.force === true || storeOrderItemsNeedReconcile(order, dbItems, meta, stripeItems)

  if (!needs) {
    return { reconciled: false, itemCount: dbItems.length, reason: "already complete" }
  }

  if (dbItems.length > 0) {
    const { error: delErr } = await supabase.from("order_items").delete().eq("order_id", orderId)
    if (delErr) {
      console.error("[reconcileStoreOrderItemsFromStripe] delete:", delErr)
      return { reconciled: false, itemCount: dbItems.length, reason: delErr.message }
    }
  }

  const rows = stripeItems.map((i, idx) => {
    const product =
      i.id && i.id !== "drop-in" ? findProductByIdOrPrefix(productsList, String(i.id)) : null
    const resolvedProductId =
      product?.id ?? (typeof i.id === "string" && /^[0-9a-f-]{36}$/i.test(i.id) ? i.id : null)
    const name = product?.name || i.name
    const qty = Math.max(1, Number(i.quantity) || 1)
    const unit = Number(i.price)
    const lineSubtotal = (Number.isFinite(unit) ? unit : 0) * qty
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
      quantity: qty,
      price: unit,
      subtotal: lineSubtotal,
      image_url: i.image ?? product?.image_url ?? null,
    }
  })

  const { error: insertErr } = await supabase.from("order_items").insert(rows)
  if (insertErr) {
    console.error("[reconcileStoreOrderItemsFromStripe] insert:", insertErr)
    return { reconciled: false, itemCount: 0, reason: insertErr.message }
  }

  return { reconciled: true, itemCount: rows.length, truncated: stripeItems.length < (parseInt(meta.item_count || "0", 10) || 0) }
}
