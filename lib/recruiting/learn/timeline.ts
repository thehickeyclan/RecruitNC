/**
 * The grade-by-grade timeline (13 Oct 2026): what a wrestling family should be doing this year.
 *
 * The rules library says what is allowed; this says when it matters. Three kinds of line, kept
 * apart on the page so nobody mistakes one for another:
 *
 * - **What opens** - the dates a coach may first call, meet or host a wrestler. These are not
 *   written here. They are read from the verified rows in content.ts and placed in the grade the
 *   date falls in, so a date corrected there is corrected here, and the two can never disagree.
 * - **Rules for this year** - facts with a source, held to the same standard as the library.
 * - **What to do** - our plan, labelled as ours. It is advice, not a rule.
 *
 * Division I dates depend on the wrestler (boys by class, girls on their own), so the page asks
 * which, the way the Division I page does.
 */
import { D1_CONTACT, LEARN_PAGES, type D1Track, type SourceKey } from "./content"

export type Grade = 8 | 9 | 10 | 11 | 12

export const GRADES: Grade[] = [8, 9, 10, 11, 12]

export const GRADE_NAME: Record<Grade, string> = {
  8: "Eighth grade",
  9: "Freshman year",
  10: "Sophomore year",
  11: "Junior year",
  12: "Senior year",
}

/** "sophomore" (lib/college-programs/outreach-results gradeLabel) -> 10. */
export function gradeFromLabel(label: string | null | undefined): Grade | null {
  return ({ freshman: 9, sophomore: 10, junior: 11, senior: 12 } as Record<string, Grade>)[String(label ?? "")] ?? null
}

/** The grade a class is in during the school year whose seniors graduate in `seniorYear`. */
export function gradeForClass(graduationYear: number | null | undefined, seniorYear: number): Grade | null {
  if (!graduationYear) return null
  const grade = 12 - (graduationYear - seniorYear)
  return grade >= 8 && grade <= 12 ? (grade as Grade) : null
}

/**
 * The grade a dated rule falls in, read from the rule's own words. June 15 "at the end of
 * sophomore year" and June 15 "immediately before junior year" are the same day, and both belong
 * to the summer a sophomore year ends with. "any" is a rule with no date.
 */
export function gradeOfRule(value: string): Grade | "any" | null {
  const v = value.toLowerCase()
  // "Unlimited, except..." is open now, whatever caveat follows it.
  if (/any time|^unlimited/.test(v)) return "any"
  if (/before junior year|sophomore/.test(v)) return 10
  if (/junior/.test(v)) return 11
  if (/senior/.test(v)) return 12
  return null
}

export type Opening = { level: string; what: string; when: string; href: string }

const firstSection = (slug: string) => LEARN_PAGES.find((p) => p.slug === slug)!.sections[0]

/** Every dated contact and visit rule, with its level, for one kind of wrestler. */
function datedRules(track: D1Track): Opening[] {
  const from = (level: string, slug: string, rows: Array<{ label: string; value: string }> | undefined) =>
    (rows ?? [])
      // A thing that is never allowed (Division III tryouts) has no date to wait for.
      .filter((r) => !/^not allowed/i.test(r.value))
      .map((r) => ({ level, what: r.label, when: r.value, href: `/recruiting/learn/${slug}` }))
  return [
    ...from("Division I", "division-1", D1_CONTACT[track].rows),
    ...from("Division II", "division-2", firstSection("division-2").rows),
    ...from("Division III", "division-3", firstSection("division-3").rows),
    ...from("Junior college", "njcaa", firstSection("njcaa").rows?.filter((r) => /visit/i.test(r.label))),
  ]
}

/** What first opens in a grade. */
export function openingsFor(grade: Grade, track: D1Track): Opening[] {
  return datedRules(track).filter((rule) => gradeOfRule(rule.when) === grade)
}

/** What is open at any age: no date to wait for. */
export function alwaysOpen(track: D1Track): Opening[] {
  return datedRules(track).filter((rule) => gradeOfRule(rule.when) === "any")
}

/** Rules the reader would otherwise have to place himself; a test keeps this empty of surprises. */
export function unplacedRules(track: D1Track): Opening[] {
  return datedRules(track).filter((rule) => gradeOfRule(rule.when) === null)
}

export type TimelineFact = { text: string; sources: SourceKey[]; href?: string }
export type TimelineStep = { text: string; href?: string; cta?: string }

export type TimelineGrade = {
  grade: Grade
  /** The one thing this year is for. */
  headline: string
  facts: TimelineFact[]
  /** Our plan for the year, in order. Advice, not rules. */
  steps: TimelineStep[]
}

export const TIMELINE: TimelineGrade[] = [
  {
    grade: 8,
    headline: "Nothing is being decided yet. Set up the two things that start counting in ninth grade.",
    facts: [
      {
        text: "The NCAA says to register with its Eligibility Center before ninth grade. A Profile Page is enough for now and carries no fee.",
        sources: ["cbsa"],
        href: "/recruiting/learn/eligibility-center",
      },
      {
        text: "North Carolina's amateur rule is enforced from the day a student first enters ninth grade. Know the prize rule before then.",
        sources: ["nchsaa"],
        href: "/recruiting/learn/staying-eligible-in-north-carolina",
      },
    ],
    steps: [
      { text: "Claim the wrestler's profile so every result is attached to it from the start.", href: "/athletes", cta: "Find the profile" },
      { text: "Ask the high school counselor which ninth grade classes are NCAA-approved core courses before the schedule is set." },
      { text: "Read the North Carolina page once, together. It is the rule most likely to be broken by accident.", href: "/recruiting/learn/staying-eligible-in-north-carolina", cta: "Read it" },
    ],
  },
  {
    grade: 9,
    headline: "Grades and results start counting. No college coach needs to hear from you yet, but everything you do now is on the record they will read.",
    facts: [
      {
        text: "Division I and II count 16 core courses, taken across the four years that start in ninth grade. This year's classes are part of that count.",
        sources: ["cbsa"],
        href: "/recruiting/learn/division-1",
      },
      {
        text: "A Division I core-course GPA must be at least 2.3, and Division II 2.2. A weak freshman year is paid back for three years.",
        sources: ["cbsa"],
      },
      {
        text: "From now on a wrestler at an NCHSAA school may not accept payment for competing. A prize must be an item worth $250 or less, approved by the principal and superintendent.",
        sources: ["nchsaa"],
        href: "/recruiting/learn/staying-eligible-in-north-carolina",
      },
    ],
    steps: [
      { text: "Finish the profile: photo, school, club, weight and grades.", href: "/my-recruiting#plan", cta: "Open your plan" },
      { text: "Wrestle a full schedule, in season and out. Results from the national events are what a coach looks up first.", href: "/recruiting/tournaments", cta: "Events coaches watch" },
      { text: "Look at the map with no pressure: which levels and which parts of the country are realistic to visit.", href: "/recruiting/college-map", cta: "Open the map" },
      { text: "Start saving match video. Nobody needs it yet; you will not be able to go back and film it later." },
    ],
  },
  {
    grade: 10,
    headline: "The year you become visible. Build the list and get into each program's database, so that when coaches are allowed to answer, they already know the name.",
    facts: [
      {
        text: "If a Division I or II school is recruiting you, the NCAA says to move to an Academic and Athletics Certification account this year. It is $120 for a US student, with a waiver through your counselor.",
        sources: ["cbsa", "ecRegister"],
        href: "/recruiting/learn/eligibility-center",
      },
      {
        text: "Division II, Division III, NAIA and junior college coaches may call and write at any age. Division I coaches may not until the dates shown here.",
        sources: ["d2Manual", "d3Manual", "naiaHs", "njcaaBylaws", "d1Manual"],
      },
    ],
    steps: [
      { text: "Build a list of about 20 schools, across levels. Most wrestlers who compete in college do it outside Division I.", href: "/recruiting/college-map", cta: "Build your list" },
      { text: "Fill out the recruiting questionnaire for every school on the list. No rule stops you, and it puts you in their system before they can reply.", href: "/recruiting/college-map?list=1", cta: "Your list" },
      { text: "Email the coaches at the levels that are allowed to answer you now. For Division I, write anyway and expect silence until the date.", href: "/my-recruiting#plan", cta: "Email a coach" },
      { text: "Put your schedule on the profile so a coach knows where to watch.", href: "/my-recruiting#plan", cta: "Add your schedule" },
      { text: "Check the core-course count with your counselor before junior year schedules are set." },
    ],
  },
  {
    grade: 11,
    headline: "The recruiting year. Conversations become real, visits start, and the academic checkpoint for Division I falls at the end of it.",
    facts: [
      {
        text: "Division I: 10 of the 16 core courses, including 7 in English, math and science, must be finished before senior year starts. Those grades are then locked in.",
        sources: ["cbsa"],
        href: "/recruiting/learn/division-1",
      },
      {
        text: "A Division I school gets seven recruiting opportunities with you a year, contacts and evaluations combined.",
        sources: ["d1Manual"],
        href: "/recruiting/learn/division-1",
      },
      {
        text: "Before a Division I or II official visit you must be registered with the Eligibility Center, be on the school's request list and have sent a transcript.",
        sources: ["d1Manual", "d2Manual", "cbsa"],
        href: "/recruiting/learn/eligibility-center",
      },
      {
        text: "A verbal commitment binds neither you nor the school.",
        sources: ["cbsa"],
      },
    ],
    steps: [
      { text: "Answer every coach within a day, and move schools along your list as they reply, visit and offer.", href: "/recruiting/college-map?list=1", cta: "Your list" },
      { text: "Write again after each big result. A results update is the best reason to email twice.", href: "/my-recruiting#plan", cta: "Email a coach" },
      { text: "Take unofficial visits to the schools that are answering. Ask what the roster looks like at your weight." },
      { text: "Send your transcript to the Eligibility Center at the end of the year, and take the SAT or ACT if a college on your list wants it for admission." },
      { text: "Cut the list toward the programs that are talking to you, and keep at least two you would be happy to attend." },
    ],
  },
  {
    grade: 12,
    headline: "Offers, visits and a signature. Decide on the school, not the level, and get everything in writing.",
    facts: [
      {
        text: "A Division I school may not put a scholarship or revenue-share offer in writing before August 1 of senior year, and nothing can be signed before the signing date.",
        sources: ["d1Manual", "houseQa"],
        href: "/recruiting/learn/division-1",
      },
      {
        text: "The first signing date for Division I and II wrestling is the second Wednesday in November. Junior colleges may sign from November 1.",
        sources: ["d1Manual", "d2Manual", "njcaaChart"],
      },
      {
        text: "The days around the November signing date are a dead period in Division I and II: no visits and no meeting a coach in person.",
        sources: ["d1Calendar", "d2Calendar"],
      },
      {
        text: "What you sign is the school's athletics aid agreement. Once you sign, other NCAA scholarship schools must stop recruiting you, and you may sign with one school only.",
        sources: ["d1Manual", "cbsa"],
      },
      {
        text: "At Division I schools in the House settlement the wrestling roster is limited to 30. A scholarship may be full or partial.",
        sources: ["d1Manual", "houseQa"],
      },
      {
        text: "Headed to an NAIA school? Register with the NAIA Eligibility Center; it is separate from the NCAA's.",
        sources: ["naiaGuide"],
        href: "/recruiting/learn/naia",
      },
    ],
    steps: [
      { text: "Take your official visits early in the fall, before the signing-week dead period." },
      { text: "Ask each coach, in writing: is this a roster spot, how much aid, for how many years, and did your school opt in to the settlement?" },
      { text: "Compare the full cost after all aid, not the scholarship number. At Division III and for most partial awards, academic aid is the larger part." },
      { text: "Keep wrestling and keep your grades. Final certification uses your final transcript." },
      { text: "Not signed by spring? Coaches are still filling rosters after the college transfer windows close. Keep writing.", href: "/my-recruiting#plan", cta: "Email a coach" },
    ],
  },
]

export const timelineFor = (grade: Grade) => TIMELINE.find((g) => g.grade === grade)!
