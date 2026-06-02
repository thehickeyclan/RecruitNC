import type { SupabaseClient } from "@supabase/supabase-js"
import { decodeLineItemsMetadata, isGenericPlaceholderOrderItemName } from "@/lib/nhsca-hub-checkout-pricing"
import {
  nationalTeamSkuForLine,
  nationalTeamVariantForLineKey,
  type NationalTeamApparelSizes,
} from "@/lib/national-team-product-catalog"

export { isGenericPlaceholderOrderItemName } from "@/lib/nhsca-hub-checkout-pricing"

export function isNationalTeamCatalogSku(sku: string | null | undefined): boolean {
  const s = (sku ?? "").trim().toUpperCase()
  return s.startsWith("AAU26-") || s.startsWith("NHSCA26-") || s.startsWith("NH26-")
}

export function orderItemsNeedNationalTeamDetail(
  items: { product_name?: string | null; sku?: string | null }[] | null | undefined
): boolean {
  if (!items?.length) return true
  if (items.length === 1 && isGenericPlaceholderOrderItemName(items[0]?.product_name)) return true
  return false
}

/** Insert or replace placeholder order_items from hub checkout_lines metadata. */
export async function ensureNationalTeamOrderLineItems(
  admin: SupabaseClient,
  opts: {
    orderId: string
    paymentIntentId: string
    linesEncoded: string
    totalCents: number
    eventSlug?: string
    apparelSizes?: NationalTeamApparelSizes
    bundleProduct?: { id?: string | null; name?: string | null } | null
    /** Replace existing hub/AAU lines (e.g. admin Rebuild from Stripe). */
    forceReplace?: boolean
  }
): Promise<boolean> {
  const { data: existing } = await admin
    .from("order_items")
    .select("id, product_name, sku")
    .eq("order_id", opts.orderId)

  const rows = existing ?? []
  const allNationalTeamCatalog =
    rows.length > 0 && rows.every((r) => isNationalTeamCatalogSku((r as { sku?: string }).sku))
  const shouldReplace =
    opts.forceReplace ||
    orderItemsNeedNationalTeamDetail(rows) ||
    (allNationalTeamCatalog && rows.length > 0)
  if (!shouldReplace) return false

  const eventSlug = opts.eventSlug?.trim() || "nhsca-duals-2026"
  const sizes = opts.apparelSizes ?? {}

  const decoded = decodeLineItemsMetadata(opts.linesEncoded)
  const itemsToInsert =
    decoded.length > 0
      ? decoded
      : [
          {
            key: "bundle",
            name: opts.bundleProduct?.name ?? "NHSCA 2026 – Registration + Apparel",
            amountCents: opts.totalCents,
            quantity: 1,
          },
        ]

  if (rows.length > 0) {
    await admin.from("order_items").delete().eq("order_id", opts.orderId)
  }

  for (let i = 0; i < itemsToInsert.length; i++) {
    const item = itemsToInsert[i]
    const itemCents = item.amountCents * (item.quantity ?? 1)
    if (itemCents <= 0) continue
    const lineKey = item.key ?? ""
    const sku = nationalTeamSkuForLine(eventSlug, { key: lineKey, name: item.name })
    const variant = nationalTeamVariantForLineKey(eventSlug, lineKey, sizes)
    await admin.from("order_items").insert({
      order_id: opts.orderId,
      product_id: opts.bundleProduct?.id ?? null,
      product_name: item.name,
      sku,
      variant,
      quantity: item.quantity ?? 1,
      price: item.amountCents / 100,
      subtotal: itemCents / 100,
      image_url: null,
    })
  }

  return true
}
