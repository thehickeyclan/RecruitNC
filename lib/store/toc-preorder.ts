export const TOC_2026_TEE_SKU_PREFIX = "TOC26-TEE"

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

export function isToc2026PreorderItem(item: { sku?: string | null }): boolean {
  return String(item.sku ?? "").toUpperCase().startsWith(TOC_2026_TEE_SKU_PREFIX)
}

