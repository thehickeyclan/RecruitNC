import { tocEventIsOver } from "@/lib/toc/ticket-sale"

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

/**
 * Whether this is the TOC tee *while it is still a preorder*.
 *
 * Everything preorder about the shirt hangs off this one predicate — the badge, the callout, the
 * ship label, and a server-side rule in checkout that allows event pickup and nothing else. That
 * rule is why the clock matters more than the copy does: once the tournament was over, the only
 * fulfilment the shirt permitted was collection at a tournament that had finished, so 492 shirts
 * in stock could not be bought at all. After the event it is an ordinary tee that ships.
 *
 * Deliberately not deleted: the shirt is still the 2026 shirt, historical orders still read as
 * pickups, and next year's tee will want this again with new dates.
 */
export function isToc2026PreorderItem(
  item: {
    sku?: string | null
    slug?: string | null
    name?: string | null
  },
  nowMs: number = Date.now(),
): boolean {
  if (tocEventIsOver(nowMs)) return false

  const sku = String(item.sku ?? "").toUpperCase()
  const slug = String(item.slug ?? "").toLowerCase()
  const name = String(item.name ?? "").toLowerCase()

  return (
    sku.startsWith(TOC_2026_TEE_SKU_PREFIX) ||
    slug === TOC_2026_TEE_SLUG ||
    (name.includes("tournament of champions") && name.includes("tee"))
  )
}
