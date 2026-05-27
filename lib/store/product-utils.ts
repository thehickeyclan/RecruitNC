/**
 * Resolve product by ID or by truncated UUID prefix.
 * Postgres UUID columns don't support LIKE, so we match in JS against a fetched product list.
 * Used by webhook and createOrderFromPaymentIntent so order creation works without manual recovery.
 */
export function findProductByIdOrPrefix(
  productCache: { id: string; name: string | null; image_url: string | null }[],
  itemId: string
): { id: string; name: string | null; image_url: string | null } | null {
  if (!itemId) return null
  if (itemId.includes("-") && itemId.length > 8) {
    const found = productCache.find((p) => p.id === itemId)
    return found ?? null
  }
  const prefix = String(itemId).toLowerCase()
  const found = productCache.find((p) => String(p.id).toLowerCase().startsWith(prefix))
  return found ?? null
}

/** Store pill filter — NC United singlets (slug/name), not category (shorts share athletic-wear). */
export function isStoreSingletProduct(product: {
  slug?: string | null
  name?: string | null
}): boolean {
  const slug = (product.slug ?? "").toLowerCase()
  const name = (product.name ?? "").toLowerCase()
  return slug.includes("singlet") || name.includes("singlet")
}
