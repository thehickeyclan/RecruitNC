import { AAU_SCHOLASTIC_WEIGHT_CLASSES } from "@/lib/national-team-weight-classes"
import {
  encodeLineItemsMetadata,
  type NhscaCheckoutLineItem,
} from "@/lib/nhsca-hub-checkout-pricing"

/** DB / Stripe `event_slug` for AAU Scholastic Duals 2026 registrations. */
export const AAU_SCHOLASTIC_EVENT_SLUG = "aau-2026"

export type AauScholasticPriceLine = {
  id: string
  label: string
  dollars: number
}

/** Paid at Stripe checkout (registration + apparel). */
export const AAU_SCHOLASTIC_CHECKOUT_LINES: AauScholasticPriceLine[] = [
  { id: "tournament_reg", label: "Tournament registration", dollars: 75 },
  { id: "singlet", label: "Singlet", dollars: 65 },
  { id: "long_sleeve", label: "Long sleeve shirt", dollars: 40 },
  { id: "shorts", label: "Shorts", dollars: 40 },
  { id: "tee", label: "Tee", dollars: 30 },
]

/** Travel estimates — coordinated separately; not charged at registration checkout. */
export const AAU_SCHOLASTIC_TRAVEL_LINES: AauScholasticPriceLine[] = [
  { id: "hotel_van", label: "Hotel and Van", dollars: 315 },
  { id: "flight", label: "Flight", dollars: 355 },
]

export function sumAauScholasticLines(lines: AauScholasticPriceLine[]): number {
  return lines.reduce((s, line) => s + line.dollars, 0)
}

export const AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS = sumAauScholasticLines(AAU_SCHOLASTIC_CHECKOUT_LINES)
export const AAU_SCHOLASTIC_TRAVEL_TOTAL_DOLLARS = sumAauScholasticLines(AAU_SCHOLASTIC_TRAVEL_LINES)
export const AAU_SCHOLASTIC_ESTIMATED_TRIP_TOTAL_DOLLARS =
  AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS + AAU_SCHOLASTIC_TRAVEL_TOTAL_DOLLARS

export const AAU_SCHOLASTIC_PRICING_CONTEXT =
  "Same model as NHSCA Duals: most families purchased the full NC United apparel bundle. At registration, check each item you want (tournament entry, singlet, shirts, etc.) and pay only for your selection in one Stripe checkout. Hotel, van, and flight are coordinated separately."

export const AAU_SCHOLASTIC_DEFAULT_SELECTED_LINE_IDS = AAU_SCHOLASTIC_CHECKOUT_LINES.map((line) => line.id)

export function aauScholasticLinesFromSelectedIds(ids: readonly string[]): AauScholasticPriceLine[] {
  const allowed = new Set(AAU_SCHOLASTIC_CHECKOUT_LINES.map((line) => line.id))
  const picked = new Set(ids.filter((id) => allowed.has(id)))
  return AAU_SCHOLASTIC_CHECKOUT_LINES.filter((line) => picked.has(line.id))
}

export function aauScholasticFeesFromSelectedLines(lines: AauScholasticPriceLine[]): {
  reg_fee_cents: number
  apparel_fee_cents: number
} {
  let reg_fee_cents = 0
  let apparel_fee_cents = 0
  for (const line of lines) {
    const cents = line.dollars * 100
    if (line.id === "tournament_reg") reg_fee_cents += cents
    else apparel_fee_cents += cents
  }
  return { reg_fee_cents, apparel_fee_cents }
}

export function aauScholasticCheckoutLineItemsFromPriceLines(lines: AauScholasticPriceLine[]): NhscaCheckoutLineItem[] {
  return lines.map((line) => ({
    key: line.id,
    name: line.label,
    amountCents: line.dollars * 100,
    quantity: 1,
  }))
}

export function encodeAauScholasticCheckoutLinesMetadataFromLines(lines: AauScholasticPriceLine[]): string {
  return encodeLineItemsMetadata(aauScholasticCheckoutLineItemsFromPriceLines(lines))
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

/** NC United – AAU Scholastic Duals 2026 operations reference (parent-facing). */
export const AAU_SCHOLASTIC_OPERATIONS = {
  eventName: "AAU Scholastic Duals 2026 – Boys All-Star Division",
  division: "Boys All-Star (District All-Star)",
  arrivalWeighIns: "Tuesday, June 23, 2026",
  competitionDates: "June 24–26, 2026",
  departure: "June 26 (PM) or June 27 (AM)",
  venueName: "Broward County Convention Center",
  venueAddress1: "1950 Eisenhower Blvd",
  venueCityStateZip: "Fort Lauderdale, FL 33316",
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

export const AAU_SCHOLASTIC_DUALS_2026 = {
  title: AAU_SCHOLASTIC_OPERATIONS.eventName,
  shortTitle: "AAU Scholastic Duals 2026",
  tagline: "Boys All-Star Division · District All-Star teams",
  datesLabel: "June 23–26, 2026",
  travelNote: "Arrival & weigh-ins Tue Jun 23 · competition Wed–Fri · depart Fri PM or Sat AM",
  venue: AAU_SCHOLASTIC_OPERATIONS.venueName,
  venueAddress: `${AAU_SCHOLASTIC_OPERATIONS.venueAddress1}, ${AAU_SCHOLASTIC_OPERATIONS.venueCityStateZip}`,
  location: "Fort Lauderdale, Florida",
  mapsQuery: "1950+Eisenhower+Blvd+Fort+Lauderdale+FL+33316",
  officialUrl: "https://aausports.org/wrestling/scholastic-duals",
  registerPath: "/national-team/register/aau-2026",
  hubPath: "/national-team/hub",
  contactName: "Matt Hickey",
  contactPhone: "(631) 662-5409",
  contactPhoneTel: "+16316625409",
  contactEmail: "info@ncwrestlingunited.com",
} as const

export const AAU_SCHOLASTIC_WEIGHTS_DISPLAY = AAU_SCHOLASTIC_WEIGHT_CLASSES.map((w) =>
  w === "285" ? "285" : w,
).join(" · ")

export const AAU_SCHOLASTIC_PARENT_FAQ = [
  {
    q: "Who can register?",
    a: "NC United Scholastic Duals families on the team roster. Open the registration link on this page, enter athlete and parent info, select the items you want (tournament entry, apparel, etc.), and complete Stripe checkout.",
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
    a: "You choose at checkout. Options are tournament registration ($75), singlet ($65), long sleeve ($40), shorts ($40), and tee ($30) — check only what you need. Most NHSCA Duals families bought the full bundle ($250 at checkout). Hotel and van ($315) and flight ($355) are separate travel costs; plan on about $920 all-in per athlete before meals and local ground transport. Staff share booking details in the Team Hub.",
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
    a: "Registered families use the NC United Team Hub for rosters, gear sizing, travel notes, and chat. Link your account after payment on the confirmation screen.",
  },
  {
    q: "Who do I contact for AAU tournament questions?",
    a: "Jacob Sunde (AAU) at 407-470-1816 or jsunde@aausports.org for online registration, weigh-ins, or entry packet questions. NC United travel and roster questions go to Matt Hickey / info@ncwrestlingunited.com.",
  },
] as const
