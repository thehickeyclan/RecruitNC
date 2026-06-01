import { parseStoreItemsFromMetadata } from "@/lib/store/reconcile-order-items-from-stripe"

/** Legacy store.ncwrestlingunited.com put carts in Stripe metadata (500-char cap) — items get truncated. */
export function isTruncatedLegacyStoreMetadata(
  meta: Record<string, string>,
  productsList: { id: string; name: string | null; image_url: string | null }[] = [],
): boolean {
  const declared = parseInt(meta.item_count || "0", 10) || 0
  const parsed = parseStoreItemsFromMetadata(meta, productsList)
  if (declared > 0 && parsed.length < declared) return true
  const subtotal = Number(meta.subtotal || 0)
  if (subtotal > 0 && parsed.length > 0) {
    const avg = parsed.reduce((s, i) => s + Number(i.price || 0), 0) / parsed.length
    if (avg > 0) {
      const expectedUnits = Math.round(subtotal / avg)
      if (expectedUnits > parsed.length) return true
    }
  }
  return false
}

export function legacyStoreMetadataHasCart(meta: Record<string, string>): boolean {
  return Boolean(
    meta.items?.trim() &&
      meta.items !== "[]" &&
      (meta.customer_email || meta.customer_name),
  )
}

export function buildTruncatedLegacyOrderNote(
  meta: Record<string, string>,
  productsList: { id: string; name: string | null; image_url: string | null }[] = [],
): string {
  const declared = parseInt(meta.item_count || "0", 10) || 0
  const parsed = parseStoreItemsFromMetadata(meta, productsList)
  const missing = Math.max(declared - parsed.length, 0)
  return (
    `[TRUNCATED_LEGACY_CHECKOUT] Legacy store saved only ${parsed.length} of ${declared || "?"} items in Stripe metadata. ` +
    `${missing > 0 ? `${missing} item(s) were never recorded. ` : ""}` +
    `Do not fulfill from partial line items — verify with customer email or Stripe receipt.`
  )
}
