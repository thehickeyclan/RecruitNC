/**
 * Revenue for a single order_items row.
 *
 * `price_at_purchase` is a legacy column: several dashboards read it, but no code path
 * has ever written it, so every product-level revenue number sourced from it came out
 * as zero. The checkout writes `subtotal` (line total) and `price` (unit price) —
 * prefer those, and keep reading price_at_purchase only for any old row that has it.
 */
export function orderItemLineRevenue(item: {
  subtotal?: number | string | null
  price?: number | string | null
  price_at_purchase?: number | string | null
  quantity?: number | string | null
}): number {
  const quantity = Math.max(1, toNumber(item.quantity) || 1)

  const subtotal = toNumber(item.subtotal)
  if (subtotal > 0) return subtotal

  const unit = toNumber(item.price) || toNumber(item.price_at_purchase)
  return unit * quantity
}

/** Units moved on a line. Quantity is occasionally null on recovered rows; those are one unit. */
export function orderItemUnits(item: { quantity?: number | string | null }): number {
  return Math.max(1, toNumber(item.quantity) || 1)
}

function toNumber(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}
