/** NC United Tournament of Champions — shared constants (Phase 1 marketing). */

export const TOC_EVENT_DATE = new Date("2026-09-04T09:00:00-04:00")

export const TOC_WEIGHT_CLASSES = [
  117, 125, 133, 141, 149, 157, 165, 174, 184, 197, 285,
] as const

export const TOC_VENUE = {
  name: "Hope Community Church",
  city: "Apex, NC",
  address: "Hope Community Church, Apex, NC",
} as const

export const TOC_GRADUATION_YEARS = ["2026", "2027", "2028", "2029", "2030"] as const

export const TOC_NOMINATION_RELATIONSHIPS = [
  { value: "coach", label: "Coach" },
  { value: "parent", label: "Parent / guardian" },
  { value: "athlete", label: "Athlete (self)" },
  { value: "other", label: "Other" },
] as const

export const TOC_SPONSOR_TIERS = [
  { value: "title", label: "Title" },
  { value: "champion", label: "Champion" },
  { value: "partner", label: "Partner" },
  { value: "community", label: "Community" },
] as const

export const TOC_BRAND = {
  navy: "#0B1D3A",
  navyDeep: "#060f1f",
  red: "#CC0000",
  redHover: "#a80000",
  white: "#FFFFFF",
} as const

export const TOC_DEFAULT_CONFIG = {
  phase: "phase_1" as const,
  event_dates: "September 4–5, 2026",
  venue_name: TOC_VENUE.name,
  venue_address: TOC_VENUE.address,
  hero_primary_cta_label: "Get Notified",
  hero_primary_cta_href: "#email-signup",
} as const
