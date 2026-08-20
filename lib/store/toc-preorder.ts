export const TOC_2026_TEE_SKU_PREFIX = "TOC26-TEE"
export const TOC_2026_TEE_SLUG = "2026-tournament-of-champions-tee"

export const TOC_2026_PICKUP_METHOD = {
  id: "pickup" as const,
  name: "Tournament of Champions pickup",
  price: 0,
  days: "September 18–19, 2026",
  description: "Preorder pickup at the Tournament of Champions in Apex — FREE",
}

export const TOC_2026_PICKUP_ADDRESS = {
  address1: "Tournament of Champions Pickup",
  address2: "Hope Community Church",
  city: "Apex",
  state: "NC",
  zipCode: "27539",
}

export function isToc2026PreorderItem(item: {
  sku?: string | null
  slug?: string | null
  name?: string | null
}): boolean {
  const sku = String(item.sku ?? "").toUpperCase()
  const slug = String(item.slug ?? "").toLowerCase()
  const name = String(item.name ?? "").toLowerCase()

  return (
    sku.startsWith(TOC_2026_TEE_SKU_PREFIX) ||
    slug === TOC_2026_TEE_SLUG ||
    (name.includes("tournament of champions") && name.includes("tee"))
  )
}
