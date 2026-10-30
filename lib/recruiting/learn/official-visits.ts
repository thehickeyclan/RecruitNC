/**
 * "Get ready for your official visit" (Matt, 28 Oct 2026): a checklist and the questions to ask.
 *
 * This guide states no rule of its own. Every fact - the eligibility steps, who pays, how long a
 * visit lasts, the limits by level, the dead period - is read from the rules library
 * (content.ts, timeline.ts, working.ts) by heading, so a rule corrected there is corrected here,
 * and a heading renamed there fails the test (official-visits.test.ts) rather than vanishing from
 * the page. What we could not source is left out; NOT_INCLUDED lists it for Matt.
 */
import { D1_CONTACT, LEARN_PAGES, sectionId, type D1Track, type LearnSection, type SourceKey } from "./content"
import { TIMELINE } from "./timeline"
import { COACH_QUESTIONS } from "./working"

export function section(slug: string, heading: string): LearnSection {
  const page = LEARN_PAGES.find((p) => p.slug === slug)
  const s = page?.sections.find((x) => x.heading === heading)
  if (!s) throw new Error(`Learn library has no "${heading}" on ${slug}`)
  return s
}
const row = (s: LearnSection, label: string) => {
  const r = s.rows?.find((x) => x.label === label)
  if (!r) throw new Error(`No row "${label}" in "${s.heading}"`)
  return r.value
}
const bullet = (s: LearnSection, starts: string) => {
  const b = s.bullets?.find((x) => x.startsWith(starts))
  if (!b) throw new Error(`No bullet starting "${starts}" in "${s.heading}"`)
  return b
}
const fact = (text: string) => {
  const f = TIMELINE.flatMap((g) => g.facts).find((x) => x.text.startsWith(text))
  if (!f) throw new Error(`No timeline fact starting "${text}"`)
  return f
}
const step = (text: string) => {
  const s = TIMELINE.flatMap((g) => g.steps).find((x) => x.text.startsWith(text))
  if (!s) throw new Error(`No timeline step starting "${text}"`)
  return s.text
}

export type GuideLine = { text: string; sources: SourceKey[]; href: string }
export type ChecklistItem = { text: string; kind: "rule" | "advice" | "tool"; sources?: SourceKey[]; href?: string }

const WHO_PAYS = section("questions-families-ask", "Who pays for a recruiting visit?")
const PARENTS = section("questions-families-ask", "Do parents go on the visit?")
const D1_VISITS = section("division-1", "Offers, visits and what you can do now")
const D2_CONTACT = section("division-2", "When a Division II coach can contact you")
const D3_CONTACT = section("division-3", "When a Division III coach can contact you")
const NAIA_CONTACT = section("naia", "Contact, visits and tryouts")
const NJCAA_VISITS = section("njcaa", "Visits and signing")
const EC_ACCOUNT = section("eligibility-center", "Which account")
const D1_SCHOLARSHIPS = section("division-1", "Scholarships and roster spots")
const GRANT = section("questions-families-ask", "What is the difference between a grant and a scholarship?")
const REVENUE = section("questions-families-ask", "What is revenue sharing?")
const TRANSFER = section("division-1", "The transfer window, and why it matters to a high school senior")

const WHO_PAYS_HREF = `/recruiting/learn/questions-families-ask#${sectionId(WHO_PAYS.heading)}`
const PARENTS_HREF = `/recruiting/learn/questions-families-ask#${sectionId(PARENTS.heading)}`

/** What an official visit is, in the library's words. */
export const WHAT_IT_IS = WHO_PAYS.intro!.replace(/^It depends on the kind of visit\.\s*/, "")

/** Before the visit: the eligibility steps (Division I and II) and the account the NCAA requires. */
export const BEFORE_YOU_GO: GuideLine[] = [
  { text: bullet(D1_VISITS, "Before an official visit"), sources: D1_VISITS.sources, href: "/recruiting/learn/division-1" },
  { text: bullet(D2_CONTACT, "Before an official visit"), sources: D2_CONTACT.sources, href: "/recruiting/learn/division-2" },
  { text: `Academic and Athletics Certification account: ${row(EC_ACCOUNT, "Academic and Athletics Certification account")}`, sources: EC_ACCOUNT.sources, href: `/recruiting/learn/eligibility-center#${sectionId(EC_ACCOUNT.heading)}` },
  { text: section("division-3", "Academic standard").bullets![1], sources: ["cbsa"], href: "/recruiting/learn/division-3" },
]

/** "June 15 immediately before junior year; one per school, 48 hours at most" -> when, and the limit. */
const whenAndLimit = (value: string) => {
  const [when, ...rest] = value.split(";")
  return { when: when.trim(), limit: rest.join(";").trim() }
}

/** When official visits open and their limits, by level. Division I depends on the wrestler. */
export function limitsByLevel(track: D1Track): Array<{ level: string; when: string; limit: string; href: string; sources: SourceKey[] }> {
  const d1 = D1_CONTACT[track].rows!.find((r) => r.label === "Official (paid) visit")!.value
  const d1Length = row(WHO_PAYS, "Division I official visit").split(";").slice(-1)[0].trim()
  return [
    { level: "Division I", when: d1, limit: `${bullet(D1_VISITS, "Official visits are unlimited overall").split(". ").slice(0, 2).join(". ").replace(/\.?$/, ".")} ${d1Length.charAt(0).toUpperCase()}${d1Length.slice(1)}.`, href: "/recruiting/learn/division-1", sources: [...new Set([...D1_CONTACT[track].sources, "d1Manual" as const])] },
    { level: "Division II", ...whenAndLimit(row(D2_CONTACT, "Official (paid) visit")), href: "/recruiting/learn/division-2", sources: D2_CONTACT.sources },
    { level: "Division III", ...whenAndLimit(row(D3_CONTACT, "Official (paid) visit")), href: "/recruiting/learn/division-3", sources: D3_CONTACT.sources },
    { level: "NAIA", when: "No recruiting calendar", limit: bullet(NAIA_CONTACT, "A school may pay for your visit"), href: "/recruiting/learn/naia", sources: NAIA_CONTACT.sources },
    { level: "Junior college", ...whenAndLimit(row(NJCAA_VISITS, "Official (paid) visit")), href: "/recruiting/learn/njcaa", sources: NJCAA_VISITS.sources },
  ]
}

/** Who pays, by level: the library's rows, verbatim. */
export const WHO_PAYS_ROWS = { rows: WHO_PAYS.rows!, bullets: WHO_PAYS.bullets ?? [], sources: WHO_PAYS.sources, href: WHO_PAYS_HREF }

/** Parents on the visit: the rule, and our advice beside it. */
export const PARENTS_ON_VISIT = { bullets: PARENTS.bullets ?? [], advice: PARENTS.advice ?? null, sources: PARENTS.sources, href: PARENTS_HREF }

/** Timing: the signing-week dead period, and our advice to go early. */
export const TIMING = {
  deadPeriod: fact("The days around the November signing date are a dead period"),
  advice: step("Take your official visits early in the fall"),
}

/** The checklist, in order. Rules carry their sources; our advice is labelled as ours. */
export const VISIT_CHECKLIST: ChecklistItem[] = [
  { text: "Open an Academic and Athletics Certification account with the NCAA Eligibility Center (Division I and II).", kind: "rule", sources: EC_ACCOUNT.sources, href: `/recruiting/learn/eligibility-center#${sectionId(EC_ACCOUNT.heading)}` },
  { text: "Make sure you are on the school's request list (Division I and II).", kind: "rule", sources: D1_VISITS.sources, href: "/recruiting/learn/division-1" },
  { text: "Send your transcript (Division I and II).", kind: "rule", sources: D2_CONTACT.sources, href: "/recruiting/learn/division-2" },
  { text: "Know what the college pays for before you book travel.", kind: "rule", sources: WHO_PAYS.sources, href: WHO_PAYS_HREF },
  { text: "Put the visit in the Command Center: dates and who is going. Upcoming visits show on your home page.", kind: "tool", href: "/my-recruiting/plan#visits" },
  { text: "Go with at least one parent, and let the wrestler do the talking with the coach.", kind: "advice", href: PARENTS_HREF },
  { text: "Bring the questions below, and write down what was said straight after.", kind: "advice", href: "/recruiting/learn/working-the-process" },
  { text: "When you are home, tell the Command Center the visit happened. It moves the college to Visited on My List.", kind: "tool", href: "/my-recruiting/plan#visits" },
]

/**
 * Questions to ask on the visit: the library's coach questions, and the questions its own advice
 * says to ask about the roster spot, the money and transfers. Ours, not rules.
 */
export const VISIT_QUESTIONS: Array<{ group: string; questions: string[] }> = [
  { group: "The roster and the room", questions: COACH_QUESTIONS.filter((q) => /lineup|my weight|next step/i.test(q)) },
  {
    group: "The spot and the money",
    questions: [
      ...COACH_QUESTIONS.filter((q) => /House settlement|roster spot/i.test(q)),
      D1_SCHOLARSHIPS.advice!.replace(/^With a limit of 30, an invitation to walk on is not a roster spot\. /, ""),
      GRANT.advice!.split(". ")[0] + ".",
      REVENUE.advice!.replace(/^A cap is not a promise\. /, ""),
    ],
  },
  { group: "School and transfers", questions: [...COACH_QUESTIONS.filter((q) => /study/i.test(q)), TRANSFER.advice!.split(". ").slice(-1)[0]] },
]

export const VISIT_SOURCES_CHECKED = "2026-10-13"

/**
 * Left out because the Learn library does not source it (for Matt, 28 Oct 2026): what to pack and
 * wear; what a visit day usually looks like; whether a wrestler may practise or work out with the
 * team on a visit (the library covers tryouts, not visits); hosting and entertainment limits; a
 * Division I visit's length in hours (the library gives "two nights at most"); an NAIA visit's
 * length; how many family members a Division II or III college may house; and how long the
 * Eligibility Center takes to process a transcript.
 */
export const NOT_INCLUDED = [
  "What to pack and wear",
  "What a visit day usually looks like",
  "Whether a wrestler may practise or work out with the team on a visit",
  "Hosting and entertainment limits on a visit",
  "A Division I visit's length in hours (the library gives two nights at most)",
  "An NAIA visit's length",
  "How many family members a Division II or III college may house",
  "How long the Eligibility Center takes to process a transcript",
]
