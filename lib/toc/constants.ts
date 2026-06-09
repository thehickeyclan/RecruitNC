/** NC United Tournament of Champions — shared constants (Phase 1 marketing).
 * Public copy on `/tournament-of-champions` is fan/athlete marketing only — no P&L, capacity caps,
 * inventory, or internal ops language on the landing page. See `.cursorrules` TOC section. */

export const TOC_EVENT_DATE = new Date("2026-09-04T09:00:00-04:00")

export const TOC_WEIGHT_CLASSES = [
  117, 125, 133, 141, 149, 157, 165, 174, 184, 197, 285,
] as const

export const TOC_VENUE = {
  name: "Hope Community Church",
  campus: "Apex Campus",
  city: "Apex, NC",
  address: "2080 East Williams Street, Apex, NC 27539",
  mapsUrl: "https://maps.google.com/?q=2080+East+Williams+Street+Apex+NC+27539",
  seatingLabel: "Seating for up to 1,000",
} as const

export const TOC_VENUE_FEATURES = [
  {
    title: "Two competition mats",
    description:
      "Dual mats for opening rounds and placement bouts — then one mat dedicated for championship finals under the lights.",
  },
  {
    title: "Dedicated college coaches section",
    description: "Reserved seating and sightlines for college staffs watching the brackets live.",
  },
  {
    title: "Up to 1,000 fans",
    description: "Bleacher seating wraps the floor so families and fans are on top of every match.",
  },
  {
    title: "Pro lighting & production",
    description: "State-of-the-art lighting, video boards, and show production — built for entertainment, not just brackets.",
  },
  {
    title: "Finals presentation",
    description:
      "Championship finals get full production — intros, awards, and the jacket moment under the lights.",
  },
] as const

export const TOC_FINALS_MAT = {
  eyebrow: "Championship finals",
  headline: "One mat under the lights",
  lead:
    "Saturday evening the arena narrows to a single mat — finalist introductions, live announcements, and all eleven championship bouts with spotlight production and video boards.",
  bullets: [
    "Parade of finalists before each weight",
    "Live PA announcements and title-bout presentation",
    "One mat — every eye in the building on the championship match",
  ],
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

/** Confirmed recruiting-fair programs — explicit logos for the TOC landing page. */
export const TOC_CONFIRMED_COLLEGES_DEFAULT = [
  {
    name: "UNC",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/Uigu95m8-1745952038636.png",
  },
  {
    name: "NC State",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fe5ixmej-1745958547259.png",
  },
  {
    name: "Lynchburg",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/SmHkZ3IPPB6ayHiOYue4Y-Lynchburg.jpg",
  },
  {
    name: "Roanoke",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/-i2rnrys-1745958901725.png",
  },
] as const

/** Program names only — used when `toc_event_config.confirmed_colleges` is empty. */
export const TOC_CONFIRMED_COLLEGES = TOC_CONFIRMED_COLLEGES_DEFAULT.map((c) => c.name)

export const TOC_DEFAULT_CONFIG = {
  phase: "phase_1" as const,
  event_dates: "September 4–5, 2026",
  venue_name: TOC_VENUE.name,
  venue_address: TOC_VENUE.address,
  hero_primary_cta_label: "Get Notified",
  hero_primary_cta_href: "#email-signup",
} as const

export const TOC_STREAMING = {
  headline: "Live streaming",
  teaser: "The event will be live streamed. Details coming soon.",
  notifyHint: "Sign up below and we'll send the watch link when broadcast details are announced.",
} as const
