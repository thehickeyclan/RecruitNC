import { AAU_SCHOLASTIC_WEIGHT_CLASSES } from "@/lib/national-team-weight-classes"
import {
  encodeLineItemsMetadata,
  type NhscaCheckoutLineItem,
} from "@/lib/nhsca-hub-checkout-pricing"

/** DB / Stripe `event_slug` for AAU Scholastic Duals 2026 registrations. */
export const AAU_SCHOLASTIC_EVENT_SLUG = "aau-2026"

/** NC United sends one squad to AAU Scholastic Duals — the National Team. */
export const AAU_SCHOLASTIC_TEAM_LABEL = "NC United National Team"

export type AauScholasticPriceLine = {
  id: string
  label: string
  dollars: number
}

/** Registration, apparel, and travel — all selectable at Stripe checkout. */
export const AAU_SCHOLASTIC_CHECKOUT_LINES: AauScholasticPriceLine[] = [
  { id: "tournament_reg", label: "Tournament registration", dollars: 75 },
  { id: "singlet", label: "Singlet", dollars: 65 },
  { id: "long_sleeve", label: "Long sleeve shirt", dollars: 40 },
  { id: "shorts", label: "Shorts", dollars: 40 },
  { id: "tee", label: "Tee", dollars: 30 },
]

export const AAU_SCHOLASTIC_TRAVEL_LINES: AauScholasticPriceLine[] = [
  { id: "hotel_van", label: "Hotel & team van", dollars: 315 },
  { id: "flight", label: "Flight", dollars: 355 },
]

/** All line items parents can toggle at registration (preserves display order). */
export const AAU_SCHOLASTIC_ALL_CHECKOUT_LINES: AauScholasticPriceLine[] = [
  ...AAU_SCHOLASTIC_CHECKOUT_LINES,
  ...AAU_SCHOLASTIC_TRAVEL_LINES,
]

const AAU_SCHOLASTIC_APPAREL_LINE_IDS = new Set(["singlet", "long_sleeve", "shorts", "tee"])

export const AAU_SCHOLASTIC_MAX_LINE_QUANTITY = 8

export type AauScholasticLineQuantity = {
  id: string
  quantity: number
}

export type AauScholasticLineSelection = {
  line: AauScholasticPriceLine
  quantity: number
}

export function sumAauScholasticLines(lines: AauScholasticPriceLine[]): number {
  return lines.reduce((s, line) => s + line.dollars, 0)
}

export const AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS = sumAauScholasticLines(AAU_SCHOLASTIC_CHECKOUT_LINES)
export const AAU_SCHOLASTIC_TRAVEL_TOTAL_DOLLARS = sumAauScholasticLines(AAU_SCHOLASTIC_TRAVEL_LINES)
export const AAU_SCHOLASTIC_ESTIMATED_TRIP_TOTAL_DOLLARS =
  AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS + AAU_SCHOLASTIC_TRAVEL_TOTAL_DOLLARS

export const AAU_SCHOLASTIC_PRICING_CONTEXT =
  "Flexible à la carte checkout — nothing is pre-selected. Choose tournament entry, individual apparel pieces, hotel/team van, and/or flight, then pay only for what you select in one Stripe checkout."

export const AAU_SCHOLASTIC_GEAR_REUSE_NOTE =
  "Already purchased NC United gear for NHSCA Duals? You can skip duplicate apparel at AAU checkout — the same singlet and team apparel works for this event."

export const AAU_SCHOLASTIC_FLIGHT_NOTE =
  "NC United locked in a block of 18 flights at a competitive rate before broader World Cup travel demand pushed summer fares higher. Flight inventory is limited — select the flight line at registration if your athlete needs a seat."

export const AAU_SCHOLASTIC_FLEXIBILITY_NOTES = [
  AAU_SCHOLASTIC_GEAR_REUSE_NOTE,
  AAU_SCHOLASTIC_FLIGHT_NOTE,
] as const

/** Meals are family-paid; hotel/van line includes NC United van transportation. */
export const AAU_SCHOLASTIC_MEALS_NOT_INCLUDED =
  "Meals are not included in checkout. Hotel & team van covers lodging and NC United van transportation between the hotel, venue, and team activities."

export const AAU_SCHOLASTIC_DEFAULT_SELECTED_LINE_IDS = AAU_SCHOLASTIC_ALL_CHECKOUT_LINES.map((line) => line.id)

/** Empty — parents opt in to each line item. */
export function aauScholasticDefaultLineQuantities(): Record<string, number> {
  return {}
}

/** Optional shortcut — selects every checkout line; parents still pay only for checked items at Stripe. */
export function aauScholasticFullBundleLineQuantities(): Record<string, number> {
  return Object.fromEntries(AAU_SCHOLASTIC_ALL_CHECKOUT_LINES.map((line) => [line.id, 1]))
}

export type AauScholasticApparelSizesInput = {
  singletSize: string
  shortsSize: string
  longSleeveSize: string
  teeSize: string
}

export function aauScholasticApparelLineSelected(
  quantities: Record<string, number>,
  lineId: string,
): boolean {
  return (quantities[lineId] ?? 0) > 0
}

/** Returns an error message or null if valid. */
export function validateAauScholasticApparelSizes(
  selections: readonly AauScholasticLineSelection[],
  sizes: AauScholasticApparelSizesInput,
): string | null {
  const has = (id: string) => selections.some((s) => s.line.id === id && s.quantity > 0)
  if (has("singlet") && !sizes.singletSize.trim()) return "Select a singlet size."
  if (has("shorts") && !sizes.shortsSize.trim()) return "Select a shorts size."
  if (has("long_sleeve") && !sizes.longSleeveSize.trim()) return "Select a long sleeve size."
  if (has("tee") && !sizes.teeSize.trim()) return "Select a tee size."
  return null
}

export function parseAauScholasticLineQuantities(input: {
  selectedLines?: unknown
  selectedLineIds?: unknown
}): AauScholasticLineQuantity[] {
  const allowed = new Set(AAU_SCHOLASTIC_ALL_CHECKOUT_LINES.map((line) => line.id))
  const clampQty = (n: number) =>
    Math.min(AAU_SCHOLASTIC_MAX_LINE_QUANTITY, Math.max(1, Math.floor(n) || 1))

  if (Array.isArray(input.selectedLines)) {
    const out: AauScholasticLineQuantity[] = []
    for (const raw of input.selectedLines) {
      if (!raw || typeof raw !== "object") continue
      const id = typeof (raw as { id?: string }).id === "string" ? (raw as { id: string }).id.trim() : ""
      if (!allowed.has(id)) continue
      const quantity = clampQty(Number((raw as { quantity?: number }).quantity))
      out.push({ id, quantity })
    }
    return out
  }

  const ids = Array.isArray(input.selectedLineIds)
    ? input.selectedLineIds.filter((id): id is string => typeof id === "string")
    : []
  return aauScholasticLinesFromSelectedIds(ids).map((line) => ({ id: line.id, quantity: 1 }))
}

export function aauScholasticLineSelectionsFromQuantities(
  quantities: readonly AauScholasticLineQuantity[],
): AauScholasticLineSelection[] {
  const lineById = new Map(AAU_SCHOLASTIC_ALL_CHECKOUT_LINES.map((line) => [line.id, line]))
  return quantities
    .map(({ id, quantity }) => {
      const line = lineById.get(id)
      if (!line || quantity < 1) return null
      return { line, quantity: Math.min(AAU_SCHOLASTIC_MAX_LINE_QUANTITY, Math.floor(quantity)) }
    })
    .filter((x): x is AauScholasticLineSelection => x != null)
}

export function aauScholasticLineQuantitiesFromRecord(
  record: Record<string, number>,
): AauScholasticLineQuantity[] {
  return Object.entries(record)
    .filter(([, qty]) => qty > 0)
    .map(([id, quantity]) => ({ id, quantity: Math.min(AAU_SCHOLASTIC_MAX_LINE_QUANTITY, Math.floor(quantity)) }))
    .filter(({ id }) => AAU_SCHOLASTIC_ALL_CHECKOUT_LINES.some((line) => line.id === id))
}

export function aauScholasticLinesFromSelectedIds(ids: readonly string[]): AauScholasticPriceLine[] {
  const allowed = new Set(AAU_SCHOLASTIC_ALL_CHECKOUT_LINES.map((line) => line.id))
  const picked = new Set(ids.filter((id) => allowed.has(id)))
  return AAU_SCHOLASTIC_ALL_CHECKOUT_LINES.filter((line) => picked.has(line.id))
}

export function sumAauScholasticSelections(selections: readonly AauScholasticLineSelection[]): number {
  return selections.reduce((s, { line, quantity }) => s + line.dollars * quantity, 0)
}

export function aauScholasticFeesFromSelections(selections: readonly AauScholasticLineSelection[]): {
  reg_fee_cents: number
  apparel_fee_cents: number
} {
  let reg_fee_cents = 0
  let apparel_fee_cents = 0
  for (const { line, quantity } of selections) {
    const cents = line.dollars * 100 * quantity
    if (AAU_SCHOLASTIC_APPAREL_LINE_IDS.has(line.id)) apparel_fee_cents += cents
    else reg_fee_cents += cents
  }
  return { reg_fee_cents, apparel_fee_cents }
}

/** @deprecated Use aauScholasticFeesFromSelections */
export function aauScholasticFeesFromSelectedLines(lines: AauScholasticPriceLine[]): {
  reg_fee_cents: number
  apparel_fee_cents: number
} {
  return aauScholasticFeesFromSelections(lines.map((line) => ({ line, quantity: 1 })))
}

export function aauScholasticCheckoutLineItemsFromSelections(
  selections: readonly AauScholasticLineSelection[],
): NhscaCheckoutLineItem[] {
  return selections.map(({ line, quantity }) => ({
    key: line.id,
    name: quantity > 1 ? `${line.label} (×${quantity})` : line.label,
    amountCents: line.dollars * 100,
    quantity,
  }))
}

export function encodeAauScholasticCheckoutLinesMetadataFromSelections(
  selections: readonly AauScholasticLineSelection[],
): string {
  return encodeLineItemsMetadata(aauScholasticCheckoutLineItemsFromSelections(selections))
}

/** @deprecated Use encodeAauScholasticCheckoutLinesMetadataFromSelections */
export function aauScholasticCheckoutLineItemsFromPriceLines(lines: AauScholasticPriceLine[]): NhscaCheckoutLineItem[] {
  return aauScholasticCheckoutLineItemsFromSelections(lines.map((line) => ({ line, quantity: 1 })))
}

/** @deprecated Use encodeAauScholasticCheckoutLinesMetadataFromSelections */
export function encodeAauScholasticCheckoutLinesMetadataFromLines(lines: AauScholasticPriceLine[]): string {
  return encodeAauScholasticCheckoutLinesMetadataFromSelections(lines.map((line) => ({ line, quantity: 1 })))
}

export const AAU_SCHOLASTIC_REG_FEE_CENTS = 75 * 100
export const AAU_SCHOLASTIC_APPAREL_FEE_CENTS = (65 + 40 + 40 + 30) * 100

export function formatAauScholasticDollars(dollars: number): string {
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

export function aauScholasticCheckoutLineItems(): NhscaCheckoutLineItem[] {
  return AAU_SCHOLASTIC_CHECKOUT_LINES.map((line) => ({
    key: line.id,
    name: line.label,
    amountCents: line.dollars * 100,
    quantity: 1,
  }))
}

/** Stripe webhook metadata → itemized `order_items` for AAU register checkout. */
export function encodeAauScholasticCheckoutLinesMetadata(): string {
  return encodeLineItemsMetadata(aauScholasticCheckoutLineItems())
}

export function aauScholasticOrderLineDisplays(): { name: string; amount_cents: number }[] {
  return AAU_SCHOLASTIC_CHECKOUT_LINES.map((line) => ({
    name: line.label,
    amount_cents: line.dollars * 100,
  }))
}

export function aauScholasticAllOrderLineDisplays(): { name: string; amount_cents: number }[] {
  return AAU_SCHOLASTIC_ALL_CHECKOUT_LINES.map((line) => ({
    name: line.label,
    amount_cents: line.dollars * 100,
  }))
}

/** NC United – AAU Scholastic Duals 2026 operations reference (parent-facing). */
export const AAU_SCHOLASTIC_OPERATIONS = {
  eventName: "AAU Scholastic Duals 2026 — NC United National Team",
  division: "AAU Boys All-Star Division (District All-Star)",
  dates: "June 23–27, 2026",
  datesDetail: "Arrive & weigh-ins Tue Jun 23 · competition Wed–Fri · depart Fri PM or Sat Jun 27 AM",
  arrivalWeighIns: "Tuesday, June 23, 2026",
  competitionDates: "June 24–26, 2026",
  departure: "June 26 (PM) or June 27 (AM)",
  venueName: "Broward County Convention Center",
  venueAddress1: "1950 Eisenhower Blvd",
  venueCityStateZip: "Fort Lauderdale, FL 33316",
  hotelName: "Embassy Suites by Hilton Fort Lauderdale 17th Street",
  hotelAddress1: "1100 SE 17th St",
  hotelCityStateZip: "Fort Lauderdale, FL 33316",
  rosterStarters: 14,
  rosterAlternates: 3,
  rosterCoaches: 3,
  rosterTableWorkers: 1,
  rosterStandardTotal: 17,
  extraAlternateFeeDollars: 50,
  teamEntryDeadline: "Friday, May 22, 2026",
} as const

/** AAU tournament director (from 2026 Scholastic entry packet). */
export const AAU_SCHOLASTIC_TOURNAMENT_CONTACT = {
  name: "Jacob Sunde",
  phone: "407-470-1816",
  phoneTel: "+14074701816",
  email: "jsunde@aausports.org",
} as const

export const AAU_SCHOLASTIC_OFFICIAL_LINKS = {
  scholasticDuals: "https://aausports.org/wrestling/scholastic-duals",
  aauMembership: "https://www.aausports.org",
  teamList: "https://www.aauwrestling.net",
  housing: "https://aausports.org/wrestling/scholastic-duals",
} as const

/** District All-Star division — Tue Jun 23 weigh-ins through Fri Jun 26 competition (per AAU entry packet). */
export const AAU_SCHOLASTIC_DUALS_SCHEDULE = [
  {
    day: "Tuesday, June 23",
    detail: "Weigh-ins (singlet required) · tableworkers meeting · coaches meeting",
  },
  { day: "Wednesday, June 24", detail: "Day 1 — competition" },
  { day: "Thursday, June 25", detail: "Day 2 — competition" },
  { day: "Friday, June 26", detail: "Day 3 — competition · departure PM" },
  { day: "Saturday, June 27", detail: "Alternate departure (AM)" },
] as const

export const AAU_SCHOLASTIC_WEIGHT_RULES = [
  "+5 lb allowance applies (HWT = 285)",
  "Cannot wrestle below high school certification weight",
  "Athlete may move up ONE weight class only",
  "Weigh-in certification weight is the lowest class an athlete may wrestle — no changes after certify",
  "Weigh-ins done in singlet; head coach stays after athletes weigh in to register the team",
] as const

export const AAU_SCHOLASTIC_ELIGIBILITY = [
  "District All-Star: athletes from high schools within an AAU district (2025–26 school year)",
  "Graduated 6th, 7th, and incoming freshmen eligible for District All-Star",
  "Class of 2026 graduating seniors eligible",
  "No more than 3 wrestlers from an adjoining AAU district on a roster",
  "Each athlete must have been eligible for the 2025–2026 high school season",
  "Must hold current AAU membership ($22 athlete) — purchase online before the event; not sold on-site",
  "Coaches must verify NCHSAA / state HS eligibility — NC United staff will help, but families should confirm",
] as const

export const AAU_SCHOLASTIC_AT_VENUE = [
  {
    title: "AAU membership",
    body: "Every athlete, coach, and table worker needs a current AAU card from aausports.org ($22 athletes · $55 non-athletes). Cards are not sold at on-site registration.",
  },
  {
    title: "Credentials",
    body: "Athletes and coaches receive credentials required for entry. Replacements cost general-admission pricing if lost.",
  },
  {
    title: "Parking",
    body: "$25 per day at the Broward County Convention Center.",
  },
  {
    title: "Spectator tickets",
    body: "Adults: $19/day or $50 for a 3-day pass. Children (ages 4–9): $14/day or $35 for a 3-day pass. Purchase through AAU / venue links when available.",
  },
  {
    title: "Table worker duty",
    body: "Each team must provide one timer or scorer for every dual. NC United coordinates who covers each match — expect to help if asked.",
  },
  {
    title: "Match format & volume",
    body: "NFHS rules · two-piece singlets allowed · bouts are 2-2-2. Teams may wrestle more than five matches in a day — plan hydration and recovery.",
  },
  {
    title: "Roster rule",
    body: "In dual meets, a team must wrestle at least 80% of its roster or each athlete who does not wrestle receives a loss on their record.",
  },
] as const

export const AAU_SCHOLASTIC_EXTRA_ALTERNATE_RULES = [
  "Roster above 17 athletes = Extra Alternates (EXT) at $50 each via AAU online registration",
  "EXT wrestlers may only compete in exhibition matches while listed as EXT",
  "Substitution into lineup only for injury that would otherwise forfeit a weight — injured wrestler cannot return",
] as const

export const AAU_SCHOLASTIC_DIVISION_NOTES = [
  "No division changes at on-site registration / weigh-ins",
  "Recruitment USB distributed to college coaches uses info entered in AAU online registration — complete athlete profiles fully",
  "Late weigh-in requests must be submitted to AAU one week in advance (contact Jacob Sunde)",
] as const

/** NC United team hotel — included in hotel/van checkout line. */
export const AAU_SCHOLASTIC_TEAM_HOTEL = {
  name: AAU_SCHOLASTIC_OPERATIONS.hotelName,
  googleRating: 4.0,
  googleReviewCount: 4718,
  starsLabel: "3-star hotel",
  websiteUrl: "https://www.hilton.com/en/hotels/fllenes-embassy-suites-fort-lauderdale-17th-street/",
  websiteLabel: "hilton.com",
  phone: "(954) 527-2700",
  phoneTel: "+19545272700",
  addressLine1: AAU_SCHOLASTIC_OPERATIONS.hotelAddress1,
  cityStateZip: AAU_SCHOLASTIC_OPERATIONS.hotelCityStateZip,
  mapsQuery: "1100+SE+17th+St+Fort+Lauderdale+FL+33316",
  photos: [
    {
      src: "/images/aau-scholastic-2026/hotel-exterior.png",
      alt: "Exterior of Embassy Suites by Hilton Fort Lauderdale 17th Street",
    },
    {
      src: "/images/aau-scholastic-2026/hotel-room.png",
      alt: "Guest room at Embassy Suites by Hilton Fort Lauderdale 17th Street",
    },
  ],
} as const

export const AAU_SCHOLASTIC_DUALS_2026 = {
  title: AAU_SCHOLASTIC_OPERATIONS.eventName,
  shortTitle: "AAU Scholastic Duals 2026",
  tagline: `${AAU_SCHOLASTIC_TEAM_LABEL} · AAU Boys All-Star Division`,
  datesLabel: AAU_SCHOLASTIC_OPERATIONS.dates,
  travelNote: AAU_SCHOLASTIC_OPERATIONS.datesDetail,
  venue: AAU_SCHOLASTIC_OPERATIONS.venueName,
  venueAddress: `${AAU_SCHOLASTIC_OPERATIONS.venueAddress1}, ${AAU_SCHOLASTIC_OPERATIONS.venueCityStateZip}`,
  location: "Fort Lauderdale, Florida",
  mapsQuery: "1950+Eisenhower+Blvd+Fort+Lauderdale+FL+33316",
  officialUrl: "https://aausports.org/wrestling/scholastic-duals",
  registerPath: "/national-team/register/aau-2026",
  infoPath: "/national-team/scholastic-duals-2026",
  contactName: "Matt Hickey",
  contactPhone: "(631) 662-5409",
  contactPhoneTel: "+16316625409",
  contactEmail: "info@ncwrestlingunited.com",
  groupMeUrl: "https://groupme.com/join_group/115087580/GOSg0W8P",
  groupMeLabel: "SCHOLASTIC DUALS 2026",
} as const

/** NC United staff — parent-facing contacts for AAU Scholastic Duals. */
export type AauScholasticTeamMember = {
  name: string
  role: string
  /** Display format, e.g. (631) 662-5409 */
  cell?: string
  /** E.164 for tel: links */
  cellTel?: string
}

export const AAU_SCHOLASTIC_NC_UNITED_TEAM: AauScholasticTeamMember[] = [
  {
    name: "Matt Hickey",
    role: "Operations",
    cell: "(631) 662-5409",
    cellTel: "+16316625409",
  },
  {
    name: "Lisa Hickey",
    role: "Operations",
  },
  {
    name: "Isabella Hickey",
    role: "Team operations",
  },
  {
    name: "Justin Perry",
    role: "Leadership",
    cell: "(856) 638-8831",
    cellTel: "+18566388831",
  },
]

export const AAU_SCHOLASTIC_WEIGHTS_DISPLAY = AAU_SCHOLASTIC_WEIGHT_CLASSES.map((w) =>
  w === "285" ? "285" : w,
).join(" · ")

export const AAU_SCHOLASTIC_PARENT_FAQ = [
  {
    q: "Who can register?",
    a: `${AAU_SCHOLASTIC_TEAM_LABEL} families on the roster. Open the registration link on this page, enter athlete and parent info, select the items you want (tournament entry, apparel, etc.), and complete Stripe checkout.`,
  },
  {
    q: "Who is eligible?",
    a: "District All-Star division: graduated 6th, 7th, incoming freshmen, and 2026 seniors who meet AAU rules and were eligible for the 2025–26 high school season. Confirm NCHSAA eligibility with NC United staff.",
  },
  {
    q: "Do we need AAU membership cards?",
    a: "Yes — every athlete ($22), coach, and table worker must have a current AAU membership from aausports.org before the event. Cards are not sold on-site at weigh-ins.",
  },
  {
    q: "How big is the team roster?",
    a: "AAU allows up to 3 coaches, 14 wrestlers, 3 alternates, and 1 table worker (17 athletes standard). Extra alternates (EXT) are +$50 each with exhibition-only rules unless substituting for injury.",
  },
  {
    q: "What does the registration fee cover?",
    a: "You choose at checkout — nothing is bundled by default. Options are tournament registration ($75), singlet ($65), long sleeve ($40), shorts ($40), tee ($30), hotel & team van ($315 — lodging plus NC United van transportation), and flight ($355). Select only the lines your family needs; use quantities when registering more than one athlete in the same checkout. Meals are extra.",
  },
  {
    q: "Can we reuse NHSCA Duals gear for AAU?",
    a: "Yes. If your athlete already has the NC United singlet and apparel from NHSCA Duals, skip those apparel lines at AAU checkout and register for tournament entry, travel, and anything else you still need.",
  },
  {
    q: "Why is the flight line priced at $355?",
    a: "NC United secured a block of 18 flights at a competitive rate before broader World Cup travel demand pushed summer fares higher. Inventory is limited — families who need a flight should select that line at registration.",
  },
  {
    q: "How do I pay?",
    a: "Complete the athlete form, select your items, and continue to secure Stripe checkout. A receipt is emailed to the parent/guardian address you provide.",
  },
  {
    q: "What weight should my wrestler select?",
    a: "Choose the weight class agreed with NC United coaches. AAU Scholastic Duals uses a +5 lb allowance; athletes cannot wrestle below their HS certification weight and may move up only one class.",
  },
  {
    q: "Where do I get updates after I register?",
    a: "Join the team GroupMe (SCHOLASTIC DUALS 2026) for travel, van schedule, and day-of updates — parents and athletes should both join. NC United will also email your receipt at checkout and follow up from info@ncwrestlingunited.com. Roster changes are posted on this page.",
  },
  {
    q: "How do I join the team GroupMe?",
    a: "Open the Join GroupMe link at the top of this page or go to https://groupme.com/join_group/115087580/GOSg0W8P on your phone. Turn notifications on after you join.",
  },
  {
    q: "Who do I contact for AAU tournament questions?",
    a: "Jacob Sunde (AAU) at 407-470-1816 or jsunde@aausports.org for online registration, weigh-ins, or entry packet questions. NC United travel and roster questions go to Matt Hickey / info@ncwrestlingunited.com.",
  },
] as const
