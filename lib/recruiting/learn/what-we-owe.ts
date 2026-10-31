/**
 * "What will we actually owe?" (Matt, 30 Oct 2026): the money guide for a parent who has never
 * done this. A parent, after the first Beyond the Mat article: "This whole process is so
 * overwhelming. I'm like just tell me what I'm gonna owe."
 *
 * Like the official-visit guide, this states no fact of its own. The two prices, the four sources
 * of money, the Net Price Calculator and the questions for the coach are read from the Learn
 * library (content.ts, timeline.ts) by heading, so a fact corrected there is corrected here and a
 * heading renamed there fails the test (what-we-owe.test.ts). Grants and scholarships are named
 * only where the library names them: the federal Pell Grant, and no outside scholarship at all.
 * NOT_INCLUDED lists what was left out for Matt.
 */
import { sectionId, type SourceKey } from "./content"
import { section } from "./official-visits"
import { TIMELINE } from "./timeline"

const bullet = (heading: { heading: string; bullets?: string[] }, starts: string) => {
  const b = heading.bullets?.find((x) => x.startsWith(starts))
  if (!b) throw new Error(`No bullet starting "${starts}" in "${heading.heading}"`)
  return b
}
const step = (text: string) => {
  const s = TIMELINE.flatMap((g) => g.steps).find((x) => x.text.startsWith(text))
  if (!s) throw new Error(`No timeline step starting "${text}"`)
  return s.text
}

const NEED = section("paying-for-college", "Need-based financial aid")
const ACADEMICS = section("paying-for-college", "How academics change the price")
const FULL_RIDE = section("paying-for-college", "How common is a full ride?")
const COVERS = section("paying-for-college", "What an athletic scholarship covers, and for how long")
const COMPARING = section("paying-for-college", "Comparing offers")
const GRANT = section("questions-families-ask", "What is the difference between a grant and a scholarship?")

const PAYING = "/recruiting/learn/paying-for-college"
const at = (slug: string, heading: string) => `/recruiting/learn/${slug}#${sectionId(heading)}`

export type MoneyCard = { title: string; tag: string; lines: string[]; sources: SourceKey[]; href: string }

/** The two prices. The library's definition of net price, and the published price in our own words about our own pages. */
export const TWO_PRICES: MoneyCard[] = [
  {
    title: "The published price",
    tag: "Sticker price",
    lines: ["What a year costs before any aid: tuition and fees, housing and food, and books. Every college on My List shows it.", "It is the newest price the US Department of Education has released, a year or two behind today's."],
    sources: ["cbsa"],
    href: at("paying-for-college", NEED.heading),
  },
  {
    title: "The price after aid",
    tag: "Net price",
    lines: [bullet(NEED, "Net price is what a student pays")],
    sources: NEED.sources,
    href: at("paying-for-college", NEED.heading),
  },
]

/** Where the money comes from: four sources, each in the library's words. */
export const FOUR_SOURCES: MoneyCard[] = [
  {
    title: "Government grants",
    tag: "Starts with the FAFSA",
    lines: [
      bullet(NEED, "Need-based aid comes from"),
      // The one grant the library names: the federal Pell Grant.
      bullet(ACADEMICS, "Colleges award their own academic scholarships").split(". ").slice(1).join(". "),
    ],
    sources: ["fafsa", "netPrice", "cbsa"],
    href: at("paying-for-college", NEED.heading),
  },
  {
    title: "The college's own aid",
    tag: "Merit and need",
    lines: [bullet(GRANT, "A need-based grant is different"), bullet(GRANT, "An academic or merit scholarship"), ACADEMICS.advice!.split(". ").slice(0, 2).join(". ") + "."],
    sources: GRANT.sources,
    href: at("questions-families-ask", GRANT.heading),
  },
  {
    title: "Athletic scholarship",
    tag: "From the coach",
    lines: [bullet(GRANT, "\"Grant-in-aid\" is the NCAA's own term"), bullet(FULL_RIDE, "Across all teams"), FULL_RIDE.advice!.split(". ")[0] + "."],
    sources: FULL_RIDE.sources,
    href: at("paying-for-college", FULL_RIDE.heading),
  },
  {
    title: "Outside scholarships",
    tag: "From anyone else",
    lines: ["Money from outside the college. Our library has verified none by name, so we list none here.", bullet(NEED, "A wrestler must report all financial aid")],
    sources: ["cbsa"],
    href: at("paying-for-college", NEED.heading),
  },
]

/** Athletic money by level, the library's rows verbatim. */
export const BY_LEVEL = { rows: FULL_RIDE.rows!, href: at("paying-for-college", FULL_RIDE.heading), sources: FULL_RIDE.sources }

/** The Net Price Calculator: the way to a personal estimate before any offer. */
export const CALCULATOR = {
  what: bullet(NEED, "Every college has a net price calculator"),
  advice: NEED.advice!,
  sources: NEED.sources,
}

/** Loans, in the library's words: the line that makes a loan owed money. */
export const LOANS = bullet(NEED, "Net price is what a student pays").split(". ").slice(1).join(". ")

/** What to ask each coach, in writing. Every question is the library's advice. */
export const ASK_THE_COACH: Array<{ ask: string; why: string; href: string }> = [
  { ask: "How much?", why: GRANT.advice!.split(". ")[0] + ".", href: at("questions-families-ask", GRANT.heading) },
  { ask: "For how many years?", why: bullet(COVERS, "In Division I, athletic aid is awarded"), href: at("paying-for-college", COVERS.heading) },
  { ask: "Does it renew?", why: `${bullet(COVERS, "In many cases the head coach decides")} ${bullet(COVERS, "If a college plans to reduce")}`, href: at("paying-for-college", COVERS.heading) },
]
/** The library's own written-questions lines, shown under the three. */
export const ASK_IN_WRITING = [COVERS.advice!, step("Ask each coach, in writing")]

/** The bottom line: the library's "Comparing offers", which the calculator does for you. */
export const BOTTOM_LINE = { intro: COMPARING.intro!, steps: COMPARING.bullets!, sources: COMPARING.sources, href: at("paying-for-college", COMPARING.heading) }

export const GUIDE_PAGES = { paying: PAYING }

/**
 * Left out because no official source has been added for it (for Matt; 30 Oct 2026, cut down 31 Oct
 * when the money words were sourced: lib/recruiting/learn/money-words.ts now covers the CSS Profile,
 * the Pell Grant, federal student loan types, Parent PLUS loans with this year's limit and rate,
 * work-study and 529 plans). Each is a fair question a parent will ask; none goes in until a source
 * is added to the library.
 */
export const NOT_INCLUDED = [
  "The exact date the FAFSA opens each year, and college or state FAFSA deadlines",
  "Any state grant by name, such as North Carolina's own need-based grants",
  "Any outside scholarship by name, or where to search for them",
  "Yearly limits and interest rates on the student's own federal loans (subsidized and unsubsidized)",
  "Private (bank) student loans",
  "Whether an outside scholarship reduces the college's own aid",
  "Asking a college to reconsider an aid offer (appeals)",
  "Education tax credits",
  "How a 529 plan counts on the FAFSA",
]
