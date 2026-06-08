import { NC_UNITED_FIRST_IN_FLIGHT_PRODUCT_ID, NC_UNITED_FIRST_IN_FLIGHT_STORE_SLUG } from "@/lib/nc-united-2026-store-gear"

/** Postgres uuid columns reject legacy numeric store ids — only persist real UUIDs. */
export function resolveOrderItemProductId(sourceId: string | number | null | undefined): string | null {
  const idStr = String(sourceId ?? "").trim()
  if (!idStr) return null
  return /^[0-9a-f-]{36}$/i.test(idStr) ? idStr : null
}

/**
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

export function isFirstInFlightSingletProduct(product: {
  id?: string | number | null
  slug?: string | null
  name?: string | null
}): boolean {
  const id = String(product.id ?? "")
  const slug = (product.slug ?? "").toLowerCase()
  const name = (product.name ?? "").toLowerCase()
  return (
    id === NC_UNITED_FIRST_IN_FLIGHT_PRODUCT_ID ||
    slug === NC_UNITED_FIRST_IN_FLIGHT_STORE_SLUG ||
    slug.includes("first-in-flight") ||
    name.includes("first in flight")
  )
}

/** Product-page fulfillment copy under the add-to-cart controls. */
export function getStoreProductShipLabel(product: {
  id?: string | number | null
  slug?: string | null
  name?: string | null
}): string {
  if (isFirstInFlightSingletProduct(product)) return "Ships in 3 weeks"
  return "Ships in 1-2 business days"
}
