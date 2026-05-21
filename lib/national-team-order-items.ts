import type { SupabaseClient } from "@supabase/supabase-js"
import { decodeLineItemsMetadata, isGenericPlaceholderOrderItemName } from "@/lib/nhsca-hub-checkout-pricing"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"

export { isGenericPlaceholderOrderItemName } from "@/lib/nhsca-hub-checkout-pricing"

export function orderItemsNeedNationalTeamDetail(
  items: { product_name?: string | null }[] | null | undefined
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
    bundleProduct?: { id?: string | null; name?: string | null } | null
  }
): Promise<boolean> {
  const { data: existing } = await admin
    .from("order_items")
    .select("id, product_name")
    .eq("order_id", opts.orderId)

  const rows = existing ?? []
  if (!orderItemsNeedNationalTeamDetail(rows)) return false

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
    await admin.from("order_items").insert({
      order_id: opts.orderId,
      product_id: opts.bundleProduct?.id ?? null,
      product_name: item.name,
      sku: syntheticOrderItemSku({
        productId: opts.bundleProduct?.id ?? null,
        label: item.name,
        dedupeKey: `${opts.paymentIntentId}-${item.key}-${i}`,
      }),
      variant: { color: "N/A", size: "N/A" },
      quantity: item.quantity ?? 1,
      price: item.amountCents / 100,
      subtotal: itemCents / 100,
      image_url: null,
    })
  }

  return true
}
