/** Curated store homepage featured row — order preserved. */
export const STORE_FEATURED_PRODUCT_IDS = [
  "34ca4db5-7556-41a8-b54b-9311dbe9ec37",
  "5afb3200-6bf7-43c0-8eaf-70e5965c8d60",
  "d07cf863-9c50-4fca-8669-dca8a862e623",
  "eeb3dbe8-4436-4409-9b34-e41c6b80f0a9",
] as const

export function pickStoreFeaturedProducts<T extends { id: string | number }>(products: T[]): T[] {
  const byId = new Map(products.map((p) => [String(p.id), p]))
  return STORE_FEATURED_PRODUCT_IDS.map((id) => byId.get(id)).filter(
    (p): p is T => p != null,
  )
}
