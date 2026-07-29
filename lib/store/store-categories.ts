/**
 * Storefront category pills, derived from the catalog that is actually loaded.
 *
 * These used to be a hardcoded list ("Singlets, T-Shirts, Sweatshirts, Headwear,
 * Accessories") repeated in three components, while the seeded products carry
 * `t-shirts` and `athletic-wear`. Three of the five pills matched nothing, and any
 * product in a category nobody had hardcoded was unreachable except via "All Products".
 * Deriving from the data keeps the filters honest as the catalog changes.
 */

import { isStoreSingletProduct } from "@/lib/store/product-utils"

/** Singlets are a virtual category: matched by slug/name, not by the category column. */
export const SINGLETS_CATEGORY_ID = "Singlets"

export type StoreCategoryOption = { id: string; label: string }

type CategorizableProduct = Parameters<typeof isStoreSingletProduct>[0] & {
  category?: string | null
}

export function buildStoreCategories(products: CategorizableProduct[]): StoreCategoryOption[] {
  const options: StoreCategoryOption[] = []

  if (products.some((product) => isStoreSingletProduct(product))) {
    options.push({ id: SINGLETS_CATEGORY_ID, label: "Singlets" })
  }

  const seen = new Set<string>()
  for (const product of products) {
    const raw = (product.category ?? "").trim()
    if (!raw) continue
    const key = raw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    options.push({ id: raw, label: categoryLabel(raw) })
  }

  return options
}

export function productMatchesStoreCategory(
  product: CategorizableProduct,
  categoryId: string,
): boolean {
  if (categoryId === SINGLETS_CATEGORY_ID) return isStoreSingletProduct(product)
  const category = (product.category ?? "").trim()
  if (!category) return false
  return category.toLowerCase() === categoryId.trim().toLowerCase()
}

/** "athletic-wear" -> "Athletic Wear", "t-shirts" -> "T-Shirts". */
export function categoryLabel(raw: string): string {
  const known: Record<string, string> = {
    "t-shirts": "T-Shirts",
    tshirts: "T-Shirts",
    "athletic-wear": "Athletic Wear",
  }
  const key = raw.trim().toLowerCase()
  if (known[key]) return known[key]
  return key
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
