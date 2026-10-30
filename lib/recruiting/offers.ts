/**
 * "What will it cost us?" (Matt, 30 Oct 2026): the family types in what a college offered and sees
 * what they will owe, per year and over four years (scripts/add-college-offers.sql).
 *
 * A parent's words, the day the first Beyond the Mat article went out: "I'm like just tell me what
 * I'm gonna owe." The portal showed the published price and the average after aid; neither is a
 * family's own bill. The offer letter is. So the family enters the college's numbers, and only
 * those: never income, never anything about the family's finances.
 *
 * The arithmetic is the Learn library's own "Comparing offers" (lib/recruiting/learn/content.ts):
 * the full yearly cost, less every grant and scholarship, is what the family pays or borrows.
 * Three rules the screens depend on:
 *
 * - **A loan is never a discount.** It is borrowed money the family pays back, so it is shown
 *   beside the bottom line and never subtracted from it.
 * - **Aid counts only for the years it covers.** A one-year award leaves years two to four at the
 *   full price.
 * - **An athletic award not promised every year gets its worst case shown**: what four years cost
 *   if it stops after the first. That is the question to ask the coach in writing.
 */

export const RENEWS = ["yes", "no", "unknown"] as const
export type Renews = (typeof RENEWS)[number]
export const RENEWS_LABEL: Record<Renews, string> = { yes: "Yes, in writing", no: "No, one year", unknown: "Not sure" }

/** The yearly dollar figures a family can type in, in the order the form shows them. */
export const OFFER_FIELDS = ["grants", "merit", "athletic", "revenueShare", "otherAid", "loans"] as const
export type OfferField = (typeof OFFER_FIELDS)[number]

export const OFFER_FIELD_LABEL: Record<OfferField, { label: string; help: string }> = {
  grants: { label: "Grants", help: "From the government or the college. Free money: never paid back." },
  merit: { label: "Merit or academic aid", help: "A scholarship for grades. Free money." },
  athletic: { label: "Athletic scholarship", help: "The wrestling money from the coach." },
  // The library's "Comparing offers": subtract "any revenue share that is in the written offer".
  revenueShare: { label: "Revenue share or NIL", help: "Only what is in a written agreement with the college. Not a hoped-for deal." },
  otherAid: { label: "Other aid", help: "Outside scholarships, or anything else not paid back." },
  loans: { label: "Loans offered", help: "Borrowed money. Paid back later, with interest. It never lowers what you owe." },
}

export type Offer = {
  athleteId: string
  schoolId: string
  /** The cost of attendance on the offer letter, when it gives one; otherwise the published cost is used. */
  cost: number | null
  grants: number
  merit: number
  athletic: number
  revenueShare: number
  otherAid: number
  loans: number
  /** How many of the four years the offer covers. */
  years: number
  renews: Renews
  updatedAt: string | null
}

/** The largest yearly figure we accept: no college costs more. */
export const MAX_AMOUNT = 200_000

/** "$12,400", "12400", "12,400.50" → 12400. Empty → 0. Anything else → null. */
export function parseDollars(v: unknown): number | null {
  if (v == null || v === "") return 0
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? Math.round(v) : null
  if (typeof v !== "string") return null
  const s = v.replace(/[$,\s]/g, "")
  if (!s) return 0
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  return Math.round(Number(s))
}

/** The fields a family sends, checked. A string is the error to show. */
export function cleanOffer(body: Record<string, unknown> | null): Omit<Offer, "athleteId" | "schoolId" | "updatedAt"> | string {
  if (!body) return "Something went wrong. Try again."
  const out: Record<OfferField, number> = { grants: 0, merit: 0, athletic: 0, revenueShare: 0, otherAid: 0, loans: 0 }
  for (const f of OFFER_FIELDS) {
    const n = parseDollars(body[f])
    if (n == null) return `${OFFER_FIELD_LABEL[f].label}: enter a dollar amount.`
    if (n > MAX_AMOUNT) return `${OFFER_FIELD_LABEL[f].label}: that is more than a year at any college.`
    out[f] = n
  }
  let cost: number | null = null
  if (body.cost != null && body.cost !== "") {
    const n = parseDollars(body.cost)
    if (n == null || n > MAX_AMOUNT) return "Cost of attendance: enter a yearly dollar amount."
    cost = n > 0 ? n : null
  }
  const years = Number(body.years ?? 4)
  if (!Number.isInteger(years) || years < 1 || years > 4) return "Pick how many years the offer covers."
  const renews = typeof body.renews === "string" && (RENEWS as readonly string[]).includes(body.renews) ? (body.renews as Renews) : "unknown"
  if (OFFER_FIELDS.every((f) => out[f] === 0)) return "Enter at least one amount from the offer."
  return { cost, ...out, years, renews }
}

export function offerFromRow(row: Record<string, unknown>): Offer {
  const n = (v: unknown) => (v == null ? 0 : Number(v) || 0)
  const renews = String(row.renews ?? "unknown")
  return {
    athleteId: String(row.athlete_id),
    schoolId: String(row.school_id),
    cost: row.cost_of_attendance == null ? null : Number(row.cost_of_attendance),
    grants: n(row.grants),
    merit: n(row.merit),
    athletic: n(row.athletic),
    revenueShare: n(row.revenue_share),
    otherAid: n(row.other_aid),
    loans: n(row.loans),
    years: Math.min(4, Math.max(1, Number(row.years) || 4)),
    renews: (RENEWS as readonly string[]).includes(renews) ? (renews as Renews) : "unknown",
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  }
}

export function offerToRow(o: Omit<Offer, "athleteId" | "schoolId" | "updatedAt">) {
  return { cost_of_attendance: o.cost, grants: o.grants, merit: o.merit, athletic: o.athletic, revenue_share: o.revenueShare, other_aid: o.otherAid, loans: o.loans, years: o.years, renews: o.renews }
}

export type BottomLine = {
  /** The yearly cost the sum starts from, and where it came from. */
  cost: number
  costFrom: "offer" | "published"
  /** Grants, scholarships and written revenue share: everything not paid back. */
  freeMoney: number
  /** What the family pays or borrows in a year the offer covers. */
  perYear: number
  /** The four years added up, at this year's price; years the offer does not cover are at full cost. */
  fourYears: number
  /** Four years if the athletic award stops after the first; null when it is promised or there is none. */
  ifNotRenewed: number | null
  /** Loans offered a year: part of what is owed, paid back later. */
  loans: number
}

/**
 * What the family owes under one offer. `published` is the college's published full yearly cost
 * (lib/college-programs/tuition.ts yearlyCostFor). Null when there is no cost to start from.
 */
export function bottomLine(o: Pick<Offer, "cost" | OfferField | "years" | "renews">, published: number | null): BottomLine | null {
  const cost = o.cost ?? published
  if (cost == null || cost <= 0) return null
  const freeMoney = o.grants + o.merit + o.athletic + o.revenueShare + o.otherAid
  const yearOwed = (aid: number) => Math.max(0, cost - aid)
  const years = Math.min(4, Math.max(1, o.years))
  const sum = (aidInYear: (y: number) => number) => [1, 2, 3, 4].reduce((t, y) => t + yearOwed(aidInYear(y)), 0)
  const fourYears = sum((y) => (y <= years ? freeMoney : 0))
  const ifNotRenewed = o.athletic > 0 && o.renews !== "yes" && years > 1 ? sum((y) => (y <= years ? freeMoney - (y > 1 ? o.athletic : 0) : 0)) : null
  return {
    cost,
    costFrom: o.cost != null ? "offer" : "published",
    freeMoney,
    perYear: yearOwed(freeMoney),
    fourYears,
    ifNotRenewed: ifNotRenewed != null && ifNotRenewed > fourYears ? ifNotRenewed : null,
    loans: o.loans,
  }
}

export const dollars = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

/** Schools with an offer, cheapest over four years first: "which is cheaper for us" at a glance. */
export function rankOffers<T extends { line: BottomLine | null }>(rows: T[]): T[] {
  return rows.filter((r) => r.line).sort((a, b) => a.line!.fourYears - b.line!.fourYears)
}

/** Where to read "What will we actually owe?". */
export const OWE_GUIDE = "/recruiting/learn/what-will-we-owe"
/** The calculator, on My List. */
export const OFFER_CALCULATOR = "/my-recruiting/colleges#cost"
