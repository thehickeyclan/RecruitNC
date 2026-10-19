/**
 * The Recruiting Roadmap's checklist (15 Oct 2026, from the mock-up Matt had ChatGPT draw): five
 * grades, each with a name, a short checklist a family ticks off, and the outcome the year is for.
 *
 * Advice, not rules: the rules and dates for each year stay in timeline.ts and the library they
 * cite. Every item that has a place to do it links there. Item ids are stored on the family's
 * account when ticked, so an id is never renamed or reused.
 */
import type { Grade } from "@/lib/recruiting/learn/timeline"

export type RoadmapItem = { id: string; text: string; href?: string }
export type RoadmapYear = { grade: Grade; title: string; outcome: string; items: RoadmapItem[] }

export const ROADMAP: RoadmapYear[] = [
  {
    grade: 8,
    title: "Build the foundation",
    outcome: "Skills, habits and a verified profile.",
    items: [
      { id: "g8-profile", text: "Claim the wrestler's RecruitNC profile", href: "/athletes" },
      { id: "g8-compete", text: "Wrestle good tournaments, and enjoy the sport", href: "/recruiting/learn/tournaments" },
      { id: "g8-core", text: "Ask the counselor which 9th grade classes are NCAA core courses", href: "/recruiting/learn/eligibility-center" },
      { id: "g8-ec", text: "Make a free Eligibility Center Profile Page", href: "/recruiting/learn/eligibility-center" },
      { id: "g8-nc", text: "Read the NC prize and NIL rule together", href: "/recruiting/learn/staying-eligible-in-north-carolina" },
      { id: "g8-levels", text: "Learn the five college levels", href: "/recruiting/learn/division-1" },
    ],
  },
  {
    grade: 9,
    title: "Build the record",
    outcome: "A record coaches will want to read.",
    items: [
      { id: "g9-grades", text: "Strong grades in core courses", href: "/recruiting/learn/eligibility-center" },
      { id: "g9-schedule", text: "Put the season's tournaments on the schedule", href: "/my-recruiting/plan" },
      { id: "g9-events", text: "Wrestle the events college coaches watch", href: "/recruiting/learn/tournaments" },
      { id: "g9-profile", text: "Keep the profile complete", href: "/my-recruiting" },
      { id: "g9-video", text: "Save match video from the big events" },
      { id: "g9-explore", text: "Start a college list on the map", href: "/recruiting/college-map" },
    ],
  },
  {
    grade: 10,
    title: "Become visible",
    outcome: "Coaches know the name.",
    items: [
      { id: "g10-list", text: "Build the college list", href: "/recruiting/college-map" },
      { id: "g10-questionnaires", text: "Fill out each program's recruiting questionnaire", href: "/my-recruiting/colleges" },
      { id: "g10-email", text: "Email coaches an introduction", href: "/my-recruiting/colleges" },
      { id: "g10-video", text: "Make a short highlight video" },
      { id: "g10-camps", text: "Choose summer camps at colleges on the list", href: "/recruiting/learn/working-the-process#camps" },
      { id: "g10-grades", text: "Keep the grades up", href: "/recruiting/learn/eligibility-center" },
    ],
  },
  {
    grade: 11,
    title: "The recruiting year",
    outcome: "Real conversations with coaches.",
    items: [
      { id: "g11-answer", text: "Answer every coach within a day", href: "/inbox" },
      { id: "g11-updates", text: "Email a results update after each big event", href: "/my-recruiting/colleges" },
      { id: "g11-events", text: "Wrestle the big national events", href: "/recruiting/learn/tournaments" },
      { id: "g11-visits", text: "Take unofficial visits", href: "/recruiting/learn/questions-families-ask" },
      { id: "g11-tests", text: "Take the SAT or ACT" },
      { id: "g11-compare", text: "Compare colleges on fit and full cost", href: "/recruiting/compare" },
    ],
  },
  {
    grade: 12,
    title: "Make the decision",
    outcome: "The right college, in writing.",
    items: [
      { id: "g12-official", text: "Take official visits", href: "/recruiting/learn/division-1" },
      { id: "g12-wrestlers", text: "Talk to wrestlers on each roster" },
      { id: "g12-fafsa", text: "File the FAFSA", href: "/recruiting/learn/paying-for-college" },
      { id: "g12-offers", text: "Compare offers on the full yearly cost", href: "/recruiting/compare" },
      { id: "g12-writing", text: "Get every offer in writing", href: "/recruiting/learn/paying-for-college" },
      { id: "g12-finish", text: "Finish strong, in class and on the mat" },
    ],
  },
]

export const ROADMAP_IDS = new Set(ROADMAP.flatMap((y) => y.items.map((i) => i.id)))

/** What a family has ticked, from their account: known ids only. */
export function cleanDone(raw: unknown): string[] {
  return Array.isArray(raw) ? [...new Set(raw.filter((id): id is string => typeof id === "string" && ROADMAP_IDS.has(id)))] : []
}
