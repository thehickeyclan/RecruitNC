/**
 * `order_items.sku` is NOT NULL in production. Webhooks and recovery paths must always set it.
 * Prefer catalog id when known; otherwise stable synthetic values for reporting.
 */
export function syntheticOrderItemSku(input: {
  productId: string | null
  /** Cart / metadata line id (not UUID product id). */
  sourceId?: string | number | null
  label: string
  /** Unique per line within the order (e.g. payment intent id + index). */
  dedupeKey: string
}): string {
  if (input.productId) return `pid:${input.productId}`
  const sid = input.sourceId
  if (sid != null && sid !== "" && sid !== 0 && sid !== "drop-in") {
    return `src:${String(sid)}`
  }
  const slug = input.label
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]/g, "")
    .slice(0, 40)
    .toLowerCase() || "item"
  return `web:${slug}:${input.dedupeKey}`
}
