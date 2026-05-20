/** NHSCA hub checkout — pricing, line items, and Stripe helpers. */

export const NHSCA_HUB_GEAR_SIZES = ["YS", "YM", "YL", "AS", "AM", "AL", "AXL", "A2XL"] as const
export type NhscaHubGearSize = (typeof NHSCA_HUB_GEAR_SIZES)[number]

export const NHSCA_TEAM_PACKAGE_CENTS = 25_000
export const NHSCA_REG_FEE_CENTS = 7_500
export const NHSCA_SHORTS_CENTS = 4_000
export const NHSCA_SHORT_SLEEVE_CENTS = 3_000
export const NHSCA_LONG_SLEEVE_CENTS = 4_000
export const NHSCA_SINGLET_EACH_CENTS = 5_000

/** Van to VBSC — $125 per wrestler (override via env if needed). */
export const NHSCA_VAN_TRAVEL_FEE_DEFAULT_CENTS = 12_500

export function nhscaVanTravelFeeCents(): number {
  const raw =
    process.env.NHSCA_VAN_TRAVEL_FEE_CENTS ??
    process.env.NEXT_PUBLIC_NHSCA_VAN_TRAVEL_FEE_CENTS ??
    String(NHSCA_VAN_TRAVEL_FEE_DEFAULT_CENTS)
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : NHSCA_VAN_TRAVEL_FEE_DEFAULT_CENTS
}

export function nhscaHotelFeeCents(): number {
  const n = parseInt(process.env.NHSCA_HOTEL_FEE_CENTS ?? "0", 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export type NhscaHubCheckoutMode = "team_package" | "individual"

export type NhscaHubTravelSelections = {
  vanTravel: boolean
  hotel: boolean
}

export type NhscaHubIndividualSelections = NhscaHubTravelSelections & {
  registration: boolean
  singletQty: 0 | 1 | 2
  singletSize: string
  shorts: boolean
  shortsSize: string
  shortSleeve: boolean
  shortSleeveSize: string
  longSleeve: boolean
  longSleeveSize: string
}

export type NhscaHubTeamPackageSelections = NhscaHubTravelSelections & {
  singletSize: string
  shortsSize: string
  shortSleeveSize: string
  longSleeveSize: string
}

export type NhscaCheckoutLineItem = {
  key: string
  name: string
  amountCents: number
  quantity?: number
}

export function normalizeGearSizeForDb(size: string): string {
  const map: Record<string, string> = {
    AS: "S",
    AM: "M",
    AL: "L",
    AXL: "XL",
    A2XL: "2XL",
  }
  const t = size.trim()
  return map[t] ?? t
}

export function formatShirtSizeForDb(shortSleeve: string, longSleeve: string): string | null {
  const ss = shortSleeve.trim()
  const ls = longSleeve.trim()
  if (ss && ls) return `SS-${normalizeGearSizeForDb(ss)}, LS-${normalizeGearSizeForDb(ls)}`
  if (ss) return normalizeGearSizeForDb(ss)
  if (ls) return `LS-${normalizeGearSizeForDb(ls)}`
  return null
}

export function buildTeamPackageLineItems(travel: NhscaHubTravelSelections): NhscaCheckoutLineItem[] {
  const items: NhscaCheckoutLineItem[] = [
    {
      key: "team_package",
      name: "NHSCA Team Package (Registration + 2 Singlets + Shorts + Tees)",
      amountCents: NHSCA_TEAM_PACKAGE_CENTS,
    },
  ]
  const van = nhscaVanTravelFeeCents()
  const hotel = nhscaHotelFeeCents()
  if (travel.vanTravel && van > 0) {
    items.push({ key: "van_travel", name: "Van Transportation (per wrestler)", amountCents: van })
  }
  if (travel.hotel && hotel > 0) {
    items.push({ key: "hotel", name: "Hotel", amountCents: hotel })
  }
  return items
}

export function buildIndividualLineItems(sel: NhscaHubIndividualSelections): NhscaCheckoutLineItem[] {
  const items: NhscaCheckoutLineItem[] = []
  if (sel.registration) {
    items.push({ key: "registration", name: "Tournament Registration & Team Fee", amountCents: NHSCA_REG_FEE_CENTS })
  }
  if (sel.singletQty > 0) {
    items.push({
      key: "singlet",
      name: `NC United Singlet (${sel.singletSize || "size TBD"})`,
      amountCents: NHSCA_SINGLET_EACH_CENTS,
      quantity: sel.singletQty,
    })
  }
  if (sel.shorts) {
    items.push({
      key: "shorts",
      name: `Team Shorts (${sel.shortsSize || "size TBD"})`,
      amountCents: NHSCA_SHORTS_CENTS,
    })
  }
  if (sel.shortSleeve) {
    items.push({
      key: "short_sleeve",
      name: `Short Sleeve Tee (${sel.shortSleeveSize || "size TBD"})`,
      amountCents: NHSCA_SHORT_SLEEVE_CENTS,
    })
  }
  if (sel.longSleeve) {
    items.push({
      key: "long_sleeve",
      name: `Long Sleeve Tee (${sel.longSleeveSize || "size TBD"})`,
      amountCents: NHSCA_LONG_SLEEVE_CENTS,
    })
  }
  const van = nhscaVanTravelFeeCents()
  const hotel = nhscaHotelFeeCents()
  if (sel.vanTravel && van > 0) {
    items.push({ key: "van_travel", name: "Van Transportation (per wrestler)", amountCents: van })
  }
  if (sel.hotel && hotel > 0) {
    items.push({ key: "hotel", name: "Hotel", amountCents: hotel })
  }
  return items
}

export function lineItemsTotalCents(items: NhscaCheckoutLineItem[]): number {
  return items.reduce((sum, i) => sum + i.amountCents * (i.quantity ?? 1), 0)
}

/** Split for national_team_event_registrations columns. */
export function splitFeesFromLineItems(
  items: NhscaCheckoutLineItem[],
  mode: NhscaHubCheckoutMode
): { reg_fee_cents: number; apparel_fee_cents: number } {
  const apparelKeys = new Set(["singlet", "shorts", "short_sleeve", "long_sleeve"])
  const travelKeys = new Set(["van_travel", "hotel"])
  let reg = 0
  let apparel = 0
  for (const item of items) {
    const cents = item.amountCents * (item.quantity ?? 1)
    if (mode === "team_package" && item.key === "team_package") {
      reg += cents
    } else if (item.key === "registration" || travelKeys.has(item.key)) {
      reg += cents
    } else if (apparelKeys.has(item.key)) {
      apparel += cents
    }
  }
  return { reg_fee_cents: reg, apparel_fee_cents: apparel }
}

/** Compact metadata for Stripe webhook → multiple order_items (key:cents pairs). */
export function encodeLineItemsMetadata(items: NhscaCheckoutLineItem[]): string {
  return items
    .map((i) => `${i.key}:${i.amountCents * (i.quantity ?? 1)}:${encodeURIComponent(i.name.slice(0, 60))}`)
    .join("|")
}

export function decodeLineItemsMetadata(encoded: string): NhscaCheckoutLineItem[] {
  if (!encoded.trim()) return []
  return encoded.split("|").map((part) => {
    const [key, centsStr, ...nameParts] = part.split(":")
    const name = decodeURIComponent(nameParts.join(":") || key)
    return {
      key: key || "item",
      name,
      amountCents: parseInt(centsStr ?? "0", 10) || 0,
      quantity: 1,
    }
  })
}

export function travelPendingLabel(): string {
  const van = nhscaVanTravelFeeCents()
  const hotel = nhscaHotelFeeCents()
  if (van === 0 && hotel === 0) return "TBD — not charged today"
  return ""
}

export function gearSummaryFromRegistration(row: {
  singlet_size?: string | null
  shorts_size?: string | null
  shirt_size?: string | null
}): string {
  const parts: string[] = []
  if (row.singlet_size) parts.push(`Singlet ${row.singlet_size}`)
  if (row.shorts_size) parts.push(`Shorts ${row.shorts_size}`)
  if (row.shirt_size) parts.push(`Tees ${row.shirt_size}`)
  return parts.length ? parts.join(" · ") : "—"
}
