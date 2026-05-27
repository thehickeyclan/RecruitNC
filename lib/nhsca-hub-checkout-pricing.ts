/** NHSCA hub checkout — pricing, line items, and Stripe helpers. */

import {
  NHSCA_SINGLET_COLOR_LABELS,
  type NhscaSingletColor,
} from "@/lib/nhsca-duals-2026-gear-images"
import {
  AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS,
  AAU_SCHOLASTIC_EVENT_SLUG,
  aauScholasticOrderLineDisplays,
} from "@/lib/aau-scholastic-duals-2026-content"

export type { NhscaSingletColor }

/** Adult apparel only — no youth sizes on hub checkout. */
export const NHSCA_HUB_GEAR_SIZES = ["S", "M", "L", "XL", "2XL"] as const
export type NhscaHubGearSize = (typeof NHSCA_HUB_GEAR_SIZES)[number]

export const NHSCA_TEAM_PACKAGE_CENTS = 25_000
export const NHSCA_REG_FEE_CENTS = 7_500
export const NHSCA_SHORTS_CENTS = 4_000
export const NHSCA_SHORT_SLEEVE_CENTS = 3_000
export const NHSCA_LONG_SLEEVE_CENTS = 4_000
export const NHSCA_SINGLET_EACH_CENTS = 6_500
export const NHSCA_SINGLET_TWO_CENTS = 12_500

/** Van to VBSC — $125 per wrestler (override via env if needed). */
export const NHSCA_VAN_TRAVEL_FEE_DEFAULT_CENTS = 12_500

/** Team hotel — $265 per person for 3 nights (override via env if needed). */
export const NHSCA_HOTEL_FEE_DEFAULT_CENTS = 26_500

export function nhscaVanTravelFeeCents(): number {
  const raw =
    process.env.NHSCA_VAN_TRAVEL_FEE_CENTS ??
    process.env.NEXT_PUBLIC_NHSCA_VAN_TRAVEL_FEE_CENTS ??
    String(NHSCA_VAN_TRAVEL_FEE_DEFAULT_CENTS)
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : NHSCA_VAN_TRAVEL_FEE_DEFAULT_CENTS
}

export function nhscaHotelFeeCents(): number {
  const raw =
    process.env.NHSCA_HOTEL_FEE_CENTS ??
    process.env.NEXT_PUBLIC_NHSCA_HOTEL_FEE_CENTS ??
    String(NHSCA_HOTEL_FEE_DEFAULT_CENTS)
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : NHSCA_HOTEL_FEE_DEFAULT_CENTS
}

export type NhscaHubCheckoutMode = "team_package" | "individual"

export type NhscaHubTravelSelections = {
  vanTravel: boolean
  hotel: boolean
}

export type NhscaHubIndividualSelections = NhscaHubTravelSelections & {
  registration: boolean
  singletQty: 0 | 1 | 2
  /** Required when singletQty === 1. */
  singletColor: NhscaSingletColor | ""
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

export function formatSingletSizeForDb(
  size: string,
  opts: { qty: 1 | 2; color?: NhscaSingletColor | "" }
): string {
  const normalized = normalizeGearSizeForDb(size)
  if (opts.qty === 2) return `${normalized} · Blue & White`
  const color = opts.color && NHSCA_SINGLET_COLOR_LABELS[opts.color]
  return color ? `${normalized} · ${color}` : normalized
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
      name: "NHSCA Team Package (2 Singlets — Blue & White + Shorts + Tees)",
      amountCents: NHSCA_TEAM_PACKAGE_CENTS,
    },
  ]
  const van = nhscaVanTravelFeeCents()
  const hotel = nhscaHotelFeeCents()
  if (travel.vanTravel && van > 0) {
    items.push({ key: "van_travel", name: "Van Transportation (per wrestler)", amountCents: van })
  }
  if (travel.hotel && hotel > 0) {
    items.push({ key: "hotel", name: "Team hotel (3 nights, per person)", amountCents: hotel })
  }
  return items
}

export function buildIndividualLineItems(sel: NhscaHubIndividualSelections): NhscaCheckoutLineItem[] {
  const items: NhscaCheckoutLineItem[] = []
  if (sel.registration) {
    items.push({ key: "registration", name: "Tournament Registration & Team Fee", amountCents: NHSCA_REG_FEE_CENTS })
  }
  if (sel.singletQty === 2) {
    items.push({
      key: "singlet",
      name: `NC United Singlets ×2 — Blue & White (${sel.singletSize || "size TBD"})`,
      amountCents: NHSCA_SINGLET_TWO_CENTS,
    })
  } else if (sel.singletQty === 1) {
    const colorLabel = sel.singletColor ? NHSCA_SINGLET_COLOR_LABELS[sel.singletColor] : "Blue or White"
    items.push({
      key: "singlet",
      name: `NC United Singlet — ${colorLabel} (${sel.singletSize || "size TBD"})`,
      amountCents: NHSCA_SINGLET_EACH_CENTS,
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
    items.push({ key: "hotel", name: "Team hotel (3 nights, per person)", amountCents: hotel })
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

export type NhscaOrderLineDisplay = {
  name: string
  amount_cents: number
  quantity?: number
}

/** Placeholder order_items from mis-routed payment_intent webhooks — not real product detail. */
export function isGenericPlaceholderOrderItemName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim().toLowerCase()
  if (!n) return true
  return (
    n.includes("nc united store purchase") ||
    n.includes("recovered item") ||
    n === "order items" ||
    /^nhsca 2026 – registration \+ apparel$/i.test(n)
  )
}

export function orderLineItemsArePlaceholders(
  items: { product_name?: string | null; name?: string }[] | null | undefined
): boolean {
  if (!items?.length) return true
  return items.every((i) =>
    isGenericPlaceholderOrderItemName(
      (i as { product_name?: string | null }).product_name ?? (i as { name?: string }).name
    )
  )
}

export function formatCheckoutLineItemsSummary(items: NhscaCheckoutLineItem[]): string {
  return items
    .map((i) => {
      const cents = i.amountCents * (i.quantity ?? 1)
      const dollars = (cents / 100).toFixed(2)
      return `${i.name} ($${dollars})`
    })
    .join(" · ")
}

export function formatOrderLineItemsSummary(
  items: { product_name?: string | null; quantity?: number | null; price?: number | null; subtotal?: number | null }[]
): string {
  if (!items.length) return ""
  return items
    .map((i) => {
      const name = (i.product_name ?? "Item").trim()
      const qty = i.quantity ?? 1
      const subtotal =
        i.subtotal != null && Number.isFinite(Number(i.subtotal))
          ? Math.round(Number(i.subtotal) * 100)
          : Math.round((i.price ?? 0) * 100) * qty
      const dollars = (subtotal / 100).toFixed(2)
      return qty > 1 ? `${name} ×${qty} ($${dollars})` : `${name} ($${dollars})`
    })
    .join(" · ")
}

export function orderLineItemsToDisplay(
  items: { product_name?: string | null; quantity?: number | null; price?: number | null; subtotal?: number | null }[]
): NhscaOrderLineDisplay[] {
  return items.map((i) => {
    const qty = i.quantity ?? 1
    const subtotal =
      i.subtotal != null && Number.isFinite(Number(i.subtotal))
        ? Math.round(Number(i.subtotal) * 100)
        : Math.round((i.price ?? 0) * 100) * qty
    return {
      name: (i.product_name ?? "Item").trim(),
      amount_cents: subtotal,
      quantity: qty,
    }
  })
}

export function checkoutLineItemsToDisplay(items: NhscaCheckoutLineItem[]): NhscaOrderLineDisplay[] {
  return items.map((i) => ({
    name: i.name,
    amount_cents: i.amountCents * (i.quantity ?? 1),
    quantity: i.quantity ?? 1,
  }))
}

/** Reconstruct line labels from fee split when order_items / checkout_lines are missing. */
export function inferOrderSummaryFromFees(row: {
  reg_fee_cents?: number | null
  apparel_fee_cents?: number | null
  singlet_size?: string | null
  shorts_size?: string | null
  shirt_size?: string | null
}): NhscaOrderLineDisplay[] {
  const items: NhscaOrderLineDisplay[] = []
  let reg = row.reg_fee_cents || 0
  let apparel = row.apparel_fee_cents || 0

  if (reg >= NHSCA_TEAM_PACKAGE_CENTS) {
    items.push({ name: "NHSCA Team Package", amount_cents: NHSCA_TEAM_PACKAGE_CENTS })
    reg -= NHSCA_TEAM_PACKAGE_CENTS
  } else if (reg >= NHSCA_REG_FEE_CENTS) {
    items.push({ name: "Tournament Registration & Team Fee", amount_cents: NHSCA_REG_FEE_CENTS })
    reg -= NHSCA_REG_FEE_CENTS
  }

  const van = nhscaVanTravelFeeCents()
  if (reg >= van && van > 0) {
    items.push({ name: "Van Transportation (per wrestler)", amount_cents: van })
    reg -= van
  }
  const hotel = nhscaHotelFeeCents()
  if (reg >= hotel && hotel > 0) {
    items.push({ name: "Team hotel (3 nights, per person)", amount_cents: hotel })
    reg -= hotel
  }
  if (reg > 0) {
    items.push({ name: "Registration / travel fees", amount_cents: reg })
    reg = 0
  }

  if (apparel >= NHSCA_SINGLET_TWO_CENTS) {
    items.push({
      name: row.singlet_size ? `NC United Singlets ×2 (${row.singlet_size})` : "NC United Singlets ×2",
      amount_cents: NHSCA_SINGLET_TWO_CENTS,
    })
    apparel -= NHSCA_SINGLET_TWO_CENTS
  } else if (apparel >= NHSCA_SINGLET_EACH_CENTS) {
    items.push({
      name: row.singlet_size ? `NC United Singlet (${row.singlet_size})` : "NC United Singlet",
      amount_cents: NHSCA_SINGLET_EACH_CENTS,
    })
    apparel -= NHSCA_SINGLET_EACH_CENTS
  }
  if (apparel >= NHSCA_SHORTS_CENTS) {
    items.push({
      name: row.shorts_size ? `Team Shorts (${row.shorts_size})` : "Team Shorts",
      amount_cents: NHSCA_SHORTS_CENTS,
    })
    apparel -= NHSCA_SHORTS_CENTS
  }
  if (apparel >= NHSCA_LONG_SLEEVE_CENTS) {
    items.push({ name: "Long Sleeve Tee", amount_cents: NHSCA_LONG_SLEEVE_CENTS })
    apparel -= NHSCA_LONG_SLEEVE_CENTS
  }
  if (apparel >= NHSCA_SHORT_SLEEVE_CENTS) {
    items.push({ name: "Short Sleeve Tee", amount_cents: NHSCA_SHORT_SLEEVE_CENTS })
    apparel -= NHSCA_SHORT_SLEEVE_CENTS
  }
  if (apparel > 0) {
    items.push({ name: "Apparel", amount_cents: apparel })
  }

  return items
}

function inferAauScholasticOrderLinesFromFees(row: {
  reg_fee_cents?: number | null
  apparel_fee_cents?: number | null
}): NhscaOrderLineDisplay[] {
  const total = (row.reg_fee_cents || 0) + (row.apparel_fee_cents || 0)
  if (total === AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS * 100) {
    return aauScholasticOrderLineDisplays()
  }
  const items: NhscaOrderLineDisplay[] = []
  if (row.reg_fee_cents) {
    items.push({ name: "Tournament registration", amount_cents: row.reg_fee_cents })
  }
  if (row.apparel_fee_cents) {
    items.push({ name: "Team apparel", amount_cents: row.apparel_fee_cents })
  }
  return items
}

export function resolveRegistrationOrderLines(row: {
  event_slug?: string | null
  reg_fee_cents?: number | null
  apparel_fee_cents?: number | null
  singlet_size?: string | null
  shorts_size?: string | null
  shirt_size?: string | null
  checkout_lines?: string | null
  order_line_items?: {
    product_name?: string | null
    quantity?: number | null
    price?: number | null
    subtotal?: number | null
  }[]
}): NhscaOrderLineDisplay[] {
  if (row.order_line_items?.length && !orderLineItemsArePlaceholders(row.order_line_items)) {
    return orderLineItemsToDisplay(row.order_line_items)
  }
  if (row.checkout_lines?.trim()) {
    const decoded = decodeLineItemsMetadata(row.checkout_lines)
    if (decoded.length) return checkoutLineItemsToDisplay(decoded)
  }
  if (row.event_slug === AAU_SCHOLASTIC_EVENT_SLUG) {
    return inferAauScholasticOrderLinesFromFees(row)
  }
  return inferOrderSummaryFromFees(row)
}

export function resolveRegistrationOrderSummary(row: Parameters<typeof resolveRegistrationOrderLines>[0]): string {
  const lines = resolveRegistrationOrderLines(row)
  if (!lines.length) return gearSummaryFromRegistration(row)
  return lines.map((l) => `${l.name} ($${(l.amount_cents / 100).toFixed(2)})`).join(" · ")
}
