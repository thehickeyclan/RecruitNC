import { AAU_SCHOLASTIC_EVENT_SLUG } from "@/lib/aau-scholastic-duals-2026-content"
import type { NhscaOrderLineDisplay } from "@/lib/nhsca-hub-checkout-pricing"
import type { NhscaDuals2026Registration } from "@/lib/nhsca-duals-2026-registrations"

export type NationalTeamContextRow = { label: string; value: string }

export type NationalTeamLineGroup = "Registration & fees" | "Travel" | "Apparel" | "Other"

export function nationalTeamLineGroup(lineName: string): NationalTeamLineGroup {
  const n = lineName.toLowerCase()
  if (/hotel|van|flight/.test(n) && !/registration/.test(n)) return "Travel"
  if (/singlet|shorts|tee|shirt|sleeve|apparel|gear/.test(n)) return "Apparel"
  if (/registration|team package|package|tournament|nhsca team/.test(n)) return "Registration & fees"
  return "Other"
}

function lineMatches(lines: NhscaOrderLineDisplay[], test: (name: string) => boolean): boolean {
  return lines.some((l) => test(l.name.toLowerCase()))
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

function apparelSizeRows(reg: NhscaDuals2026Registration): NationalTeamContextRow[] {
  const rows: NationalTeamContextRow[] = []
  if (reg.singlet_size?.trim()) rows.push({ label: "Singlet size", value: reg.singlet_size.trim() })
  if (reg.shorts_size?.trim()) rows.push({ label: "Shorts size", value: reg.shorts_size.trim() })
  if (reg.shirt_size?.trim()) rows.push({ label: "Shirt sizes", value: reg.shirt_size.trim() })
  return rows
}

function aauTravelRows(lines: NhscaOrderLineDisplay[]): NationalTeamContextRow[] {
  const hasHotelVan = lineMatches(lines, (n) => n.includes("hotel") || (n.includes("van") && !n.includes("registration")))
  const hasFlight = lineMatches(lines, (n) => n.includes("flight"))
  return [
    {
      label: "Hotel & team van",
      value: hasHotelVan
        ? "Purchased — Embassy Suites lodging + team transportation between hotel, venue, and team activities (meals not included)"
        : "Not purchased — family arranges own lodging/ground transport",
    },
    {
      label: "Team flight",
      value: hasFlight
        ? "Purchased — team flight seat (limited seats; booked through NC United)"
        : "Not purchased — athlete travels by car or books own flight",
    },
  ]
}

function nhscaTravelRows(lines: NhscaOrderLineDisplay[]): NationalTeamContextRow[] {
  const hasVan = lineMatches(lines, (n) => n.includes("van"))
  const hasHotel = lineMatches(lines, (n) => n.includes("hotel"))
  const vanLine = lines.find((l) => l.name.toLowerCase().includes("van"))
  const hotelLine = lines.find((l) => l.name.toLowerCase().includes("hotel"))
  return [
    {
      label: "Van to Virginia Beach",
      value: hasVan
        ? `Purchased${vanLine ? ` (${formatCents(vanLine.amount_cents)})` : ""} — team van transportation`
        : "Not purchased",
    },
    {
      label: "Team hotel (3 nights)",
      value: hasHotel
        ? `Purchased${hotelLine ? ` (${formatCents(hotelLine.amount_cents)})` : ""} — shared team lodging`
        : "Not purchased",
    },
  ]
}

function checkoutModeLabel(reg: NhscaDuals2026Registration): string | null {
  const mode = (reg.checkout_mode ?? "").trim().toLowerCase()
  if (mode === "team_package") return "NHSCA team package (2 singlets + shorts + tees)"
  if (mode === "individual") return "Individual item checkout (picked each line)"
  return null
}

/** Admin context under tournament orders — travel, apparel sizes, checkout mode. */
export function buildNationalTeamAdminContextRows(
  reg: NhscaDuals2026Registration,
  lines: NhscaOrderLineDisplay[],
): NationalTeamContextRow[] {
  const isAau = reg.event_slug === AAU_SCHOLASTIC_EVENT_SLUG
  const rows: NationalTeamContextRow[] = []

  const mode = checkoutModeLabel(reg)
  if (mode) rows.push({ label: "Checkout type", value: mode })

  rows.push(...(isAau ? aauTravelRows(lines) : nhscaTravelRows(lines)))

  const apparelSizes = apparelSizeRows(reg)
  if (apparelSizes.length > 0) {
    rows.push(...apparelSizes)
  } else if (lineMatches(lines, (n) => /singlet|shorts|tee|shirt|sleeve/.test(n))) {
    rows.push({ label: "Apparel sizes", value: "Not recorded on registration — check hub or ask parent" })
  }

  const purchasedSummary = lines
    .map((l) => {
      const qty = l.quantity && l.quantity > 1 ? ` ×${l.quantity}` : ""
      return `${l.name}${qty} (${formatCents(l.amount_cents)})`
    })
    .join(" · ")
  if (purchasedSummary) {
    rows.push({ label: "All items purchased", value: purchasedSummary })
  }

  return rows
}

/** Subtitle under line name for travel / apparel rows in fulfillment list. */
export function nationalTeamLineDetailVariant(
  reg: NhscaDuals2026Registration,
  lineName: string,
  isAau: boolean,
): string {
  const paren = lineName.match(/\(([^)]+)\)\s*$/)
  const inName = paren?.[1]?.trim() ?? ""
  if (inName && !/^size tbd$/i.test(inName) && !/blue & white/i.test(inName)) {
    return `Size ${inName}`
  }

  const n = lineName.toLowerCase()
  if (isAau) {
    if (n.includes("hotel") && n.includes("van")) {
      return "Lodging + team van · meals not included"
    }
    if (n.includes("flight")) return "Team flight seat"
    if (reg.singlet_size && /singlet/i.test(n)) return `Size ${reg.singlet_size}`
    if (reg.shorts_size && /shorts/i.test(n)) return `Size ${reg.shorts_size}`
    if (/long sleeve/i.test(n)) return shirtSizePart(reg.shirt_size, "long") || "See shirt sizes"
    if (/tee/i.test(n) && !/long/.test(n)) return shirtSizePart(reg.shirt_size, "short") || "See shirt sizes"
  } else {
    if (n.includes("van")) return "Team van — per wrestler"
    if (n.includes("hotel")) return "3 nights team hotel — per person"
    if (reg.singlet_size && /singlet/i.test(n)) return `Size ${reg.singlet_size}`
    if (reg.shorts_size && /shorts/i.test(n)) return `Size ${reg.shorts_size}`
    if (/long sleeve/i.test(n)) return shirtSizePart(reg.shirt_size, "long") || reg.shirt_size || ""
    if (/short sleeve|tee/i.test(n)) return shirtSizePart(reg.shirt_size, "short") || reg.shirt_size || ""
  }
  return isAau ? "AAU Scholastic Duals 2026" : "NHSCA Duals 2026"
}

function shirtSizePart(shirtSize: string | null | undefined, kind: "short" | "long"): string {
  const raw = (shirtSize ?? "").trim()
  if (!raw) return ""
  if (kind === "long") {
    const m = raw.match(/LS-([^,\s]+)/i)
    if (m) return `Size ${m[1]}`
    if (/^LS-/i.test(raw)) return `Size ${raw.replace(/^LS-/i, "")}`
  }
  if (kind === "short") {
    const m = raw.match(/SS-([^,\s]+)/i)
    if (m) return `Size ${m[1]}`
    if (!/LS-/i.test(raw)) return `Size ${raw.replace(/^SS-/i, "")}`
  }
  return ""
}
