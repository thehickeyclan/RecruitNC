/** Must match `AAU_SCHOLASTIC_EVENT_SLUG` in aau-scholastic-duals-2026-content.ts */
const AAU_EVENT_SLUG = "aau-2026"

export type NationalTeamProductCategory = "registration" | "apparel" | "travel"

export type NationalTeamCatalogProduct = {
  key: string
  sku: string
  label: string
  category: NationalTeamProductCategory
  defaultCents: number
  eventSlug: string
}

/** AAU Scholastic Duals 2026 — every selectable line on /national-team/register/aau-2026 */
export const AAU_SCHOLASTIC_CATALOG: NationalTeamCatalogProduct[] = [
  { key: "tournament_reg", sku: "AAU26-REG", label: "Tournament registration", category: "registration", defaultCents: 7500, eventSlug: AAU_EVENT_SLUG },
  { key: "singlet", sku: "AAU26-SINGLET", label: "Singlet", category: "apparel", defaultCents: 6500, eventSlug: AAU_EVENT_SLUG },
  { key: "long_sleeve", sku: "AAU26-LONG-SLEEVE", label: "Long sleeve shirt", category: "apparel", defaultCents: 4000, eventSlug: AAU_EVENT_SLUG },
  { key: "shorts", sku: "AAU26-SHORTS", label: "Shorts", category: "apparel", defaultCents: 4000, eventSlug: AAU_EVENT_SLUG },
  { key: "tee", sku: "AAU26-TEE", label: "Tee", category: "apparel", defaultCents: 3000, eventSlug: AAU_EVENT_SLUG },
  { key: "hotel_van", sku: "AAU26-HOTEL-VAN", label: "Hotel & team van", category: "travel", defaultCents: 31500, eventSlug: AAU_EVENT_SLUG },
  { key: "flight", sku: "AAU26-FLIGHT", label: "Flight", category: "travel", defaultCents: 35500, eventSlug: AAU_EVENT_SLUG },
]

/** NHSCA Duals 2026 hub checkout keys */
export const NHSCA_DUALS_CATALOG: NationalTeamCatalogProduct[] = [
  { key: "team_package", sku: "NHSCA26-TEAM-PKG", label: "NHSCA Team Package", category: "registration", defaultCents: 25000, eventSlug: "nhsca-duals-2026" },
  { key: "registration", sku: "NHSCA26-REG", label: "Tournament Registration & Team Fee", category: "registration", defaultCents: 7500, eventSlug: "nhsca-duals-2026" },
  { key: "van_travel", sku: "NHSCA26-VAN", label: "Van Transportation (per wrestler)", category: "travel", defaultCents: 12500, eventSlug: "nhsca-duals-2026" },
  { key: "hotel", sku: "NHSCA26-HOTEL", label: "Team hotel (3 nights, per person)", category: "travel", defaultCents: 26500, eventSlug: "nhsca-duals-2026" },
  { key: "singlet", sku: "NHSCA26-SINGLET", label: "NC United Singlet", category: "apparel", defaultCents: 6500, eventSlug: "nhsca-duals-2026" },
  { key: "shorts", sku: "NHSCA26-SHORTS", label: "Team Shorts", category: "apparel", defaultCents: 4000, eventSlug: "nhsca-duals-2026" },
  { key: "long_sleeve", sku: "NHSCA26-LONG-SLEEVE", label: "Long Sleeve Tee", category: "apparel", defaultCents: 4000, eventSlug: "nhsca-duals-2026" },
  { key: "short_sleeve", sku: "NHSCA26-TEE", label: "Short Sleeve Tee", category: "apparel", defaultCents: 3000, eventSlug: "nhsca-duals-2026" },
]

const catalogByEvent = new Map<string, Map<string, NationalTeamCatalogProduct>>()
for (const p of [...AAU_SCHOLASTIC_CATALOG, ...NHSCA_DUALS_CATALOG]) {
  if (!catalogByEvent.has(p.eventSlug)) catalogByEvent.set(p.eventSlug, new Map())
  catalogByEvent.get(p.eventSlug)!.set(p.key, p)
}

export function nationalTeamCatalogForEvent(eventSlug: string): NationalTeamCatalogProduct[] {
  if (eventSlug === AAU_EVENT_SLUG) return AAU_SCHOLASTIC_CATALOG
  return NHSCA_DUALS_CATALOG
}

/** Trackable SKU for each AAU page line (registration, apparel, travel). */
export function aauScholasticSkuForLineId(id: string): string {
  return nationalTeamProductByKey(AAU_EVENT_SLUG, id)?.sku ?? `AAU26-${id.replace(/_/g, "-").toUpperCase()}`
}

export function nationalTeamProductByKey(
  eventSlug: string,
  key: string,
): NationalTeamCatalogProduct | undefined {
  const direct = catalogByEvent.get(eventSlug)?.get(key)
  if (direct) return direct
  if (eventSlug === AAU_EVENT_SLUG) return undefined
  return catalogByEvent.get("nhsca-duals-2026")?.get(key)
}

export function nationalTeamSkuForLine(
  eventSlug: string,
  input: { key?: string | null; name?: string | null },
): string {
  const key = (input.key ?? "").trim()
  if (key) {
    const byKey = nationalTeamProductByKey(eventSlug, key)
    if (byKey) return byKey.sku
  }
  const inferred = inferNationalTeamLineKey(eventSlug, input.name ?? "")
  if (inferred) {
    const byInferred = nationalTeamProductByKey(eventSlug, inferred)
    if (byInferred) return byInferred.sku
  }
  const slug = (input.name ?? "item")
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]/g, "")
    .slice(0, 32)
    .toUpperCase()
  return `NT-${eventSlug.slice(0, 8).toUpperCase()}-${slug || "ITEM"}`
}

export function inferNationalTeamLineKey(eventSlug: string, lineName: string): string | undefined {
  const n = lineName.toLowerCase()
  const isAau = eventSlug === AAU_EVENT_SLUG

  if (isAau) {
    if (n.includes("tournament registration")) return "tournament_reg"
    if (n.includes("hotel") && n.includes("van")) return "hotel_van"
    if (n.includes("flight")) return "flight"
    if (n.includes("long sleeve")) return "long_sleeve"
    if (n.includes("shorts")) return "shorts"
    if (n.includes("singlet")) return "singlet"
    if (/\btee\b/.test(n) || n.includes("short sleeve")) return "tee"
  }

  if (n.includes("team package")) return "team_package"
  if (n.includes("van")) return "van_travel"
  if (n.includes("hotel")) return "hotel"
  if (n.includes("registration") || n.includes("team fee")) return "registration"
  if (n.includes("long sleeve")) return "long_sleeve"
  if (n.includes("short sleeve")) return "short_sleeve"
  if (n.includes("shorts")) return "shorts"
  if (n.includes("singlet")) return "singlet"
  return undefined
}

export function nationalTeamLineCategory(
  eventSlug: string,
  input: { key?: string | null; name?: string | null },
): NationalTeamProductCategory {
  const key = input.key ?? inferNationalTeamLineKey(eventSlug, input.name ?? "")
  if (key) {
    const p = nationalTeamProductByKey(eventSlug, key)
    if (p) return p.category
  }
  const n = (input.name ?? "").toLowerCase()
  if (/hotel|van|flight|travel/.test(n)) return "travel"
  if (/singlet|shorts|tee|shirt|sleeve|apparel/.test(n)) return "apparel"
  return "registration"
}

export type NationalTeamApparelSizes = {
  singlet_size?: string | null
  shorts_size?: string | null
  shirt_size?: string | null
}

export function nationalTeamVariantForLineKey(
  eventSlug: string,
  key: string,
  sizes: NationalTeamApparelSizes,
): { color: string; size: string } {
  const cat = nationalTeamLineCategory(eventSlug, { key })
  if (cat === "travel") return { color: "Travel", size: "N/A" }
  if (cat === "registration") return { color: "Event fee", size: "N/A" }

  switch (key) {
    case "singlet":
      return { color: "NC United", size: sizes.singlet_size?.trim() || "TBD" }
    case "shorts":
      return { color: "NC United", size: sizes.shorts_size?.trim() || "TBD" }
    case "long_sleeve":
      return { color: "NC United", size: shirtSizePart(sizes.shirt_size, "long") || "TBD" }
    case "short_sleeve":
    case "tee":
      return { color: "NC United", size: shirtSizePart(sizes.shirt_size, "short") || "TBD" }
    default:
      return { color: "NC United", size: sizes.shirt_size?.trim() || "TBD" }
  }
}

function shirtSizePart(shirtSize: string | null | undefined, kind: "short" | "long"): string {
  const raw = (shirtSize ?? "").trim()
  if (!raw) return ""
  if (kind === "long") {
    const m = raw.match(/LS-([^,\s]+)/i)
    if (m) return m[1]
    if (/^LS-/i.test(raw)) return raw.replace(/^LS-/i, "")
  }
  if (kind === "short") {
    const m = raw.match(/SS-([^,\s]+)/i)
    if (m) return m[1]
    if (!/LS-/i.test(raw)) return raw.replace(/^SS-/i, "")
  }
  return ""
}
