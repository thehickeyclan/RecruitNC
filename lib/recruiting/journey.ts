/**
 * "Your recruiting path": the Command Center's five steps, in Matt's order (28 Oct 2026).
 *
 *   1. Research colleges   2. Select colleges   3. Understand rules and timing
 *   4. Reach out           5. Monitor and engage
 *
 * The portal had a tool for every stage but was laid out by tool, with no "start here". Each step
 * here has one status read off the family's own data (never a calendar guess), one short label
 * with a number in it, one primary button and one Scout question. A new family sees step 1 open;
 * a family who has done the work sees ticks.
 */
import { COLLEGE_LIST_STATUSES, type CollegeListStatus } from "@/lib/college-programs/list"

/** A step's "Ask Scout" link: Scout opens and asks the question (app/my-recruiting/scout). */
export const scoutHref = (question: string) => `/my-recruiting/scout?ask=${encodeURIComponent(question)}`

export type JourneyKey = "research" | "select" | "rules" | "reach" | "monitor"
export type JourneyStatus = "done" | "now" | "later"

export type JourneyStep = {
  n: 1 | 2 | 3 | 4 | 5
  key: JourneyKey
  title: string
  status: JourneyStatus
  /** The number and short label on the card: "23 schools saved". */
  label: string
  /** The explanation, behind a tap. */
  detail: string
  /** Progress toward the step's goal, for the bar; null when the step has no count. */
  progress: { value: number; of: number } | null
  cta: { label: string; href: string }
  scout: { label: string; question: string }
}

export type JourneySchool = {
  status: CollegeListStatus
  level: string
  /** The family told the coaches they are interested; null when the program's coaches are not on the platform. */
  interest: boolean | null
  formDone: boolean
  emailed: boolean
}

export type JourneyInput = {
  firstName: string
  /** "freshman" ... "senior", or null. */
  grade: string | null
  schools: JourneySchool[]
  /** The family has opened the rules: Learn pages or the Rules page (from the page-view log). */
  rulesSeen: boolean
  /** One line of what is allowed now, from lib/recruiting/allowed-now.ts; null without a class year. */
  allowedLine: string | null
  upcomingEvents: number
  unreadMessages: number
  upcomingVisits: number
  /** Visits whose date has passed with no answer yet to "did it happen?". */
  visitsToConfirm: number
}

/** The list goal (Matt, 28 Oct 2026: My List toward 10, balanced across levels). */
export const LIST_GOAL = 10
/** Saved schools that count as having done the research. */
export const RESEARCH_GOAL = 3
/** Schools reached out to before step 4 is ticked. */
export const REACH_GOAL = 5

/** At least two levels, and not every school Division I. */
export function isBalanced(levels: string[]): boolean {
  const set = new Set(levels)
  return set.size >= 2 && !(set.size === 1 && set.has("D1"))
}

const atLeast = (status: CollegeListStatus, at: CollegeListStatus) => COLLEGE_LIST_STATUSES.indexOf(status) >= COLLEGE_LIST_STATUSES.indexOf(at)

/** A school counts as reached once any of the three reach-out moves is done, or a coach is already talking. */
export function reachedOut(s: JourneySchool): boolean {
  return Boolean(s.interest) || s.formDone || s.emailed || atLeast(s.status, "contacted")
}

/** All three moves done: the ones that apply (no "interested" button where the coaches are not on the platform). */
export function fullyReached(s: JourneySchool): boolean {
  return (s.interest !== false) && s.formDone && (s.emailed || atLeast(s.status, "contacted"))
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function journeySteps(input: JourneyInput): JourneyStep[] {
  const { firstName, schools } = input
  const count = schools.length
  const levels = [...new Set(schools.map((s) => s.level))]
  const balanced = isBalanced(schools.map((s) => s.level))
  const reached = schools.filter(reachedOut).length
  const reachGoal = Math.min(REACH_GOAL, Math.max(1, count))
  const formsLeft = schools.filter((s) => !s.formDone).length

  const done: Record<JourneyKey, boolean> = {
    research: count >= RESEARCH_GOAL,
    select: count >= LIST_GOAL && balanced,
    rules: input.rulesSeen,
    reach: count > 0 && reached >= reachGoal,
    // Monitoring never finishes; it is ticked while nothing is waiting on the family.
    monitor: input.upcomingEvents > 0 && input.unreadMessages === 0 && input.visitsToConfirm === 0,
  }

  const steps: Omit<JourneyStep, "status">[] = [
    {
      n: 1,
      key: "research",
      title: "Research colleges",
      label: count ? `${plural(count, "school")} saved` : "Start on the map",
      detail: `Look at every level, not just Division I: most college wrestlers compete outside it. Open a college to see its coaches, lineup and cost, and save the ones ${firstName} would be glad to attend.`,
      progress: { value: Math.min(count, RESEARCH_GOAL), of: RESEARCH_GOAL },
      cta: { label: count ? "Find more colleges" : "Open the college map", href: "/recruiting/college-map" },
      scout: { label: "Which colleges fit?", question: `What colleges fit ${firstName}'s results?` },
    },
    {
      n: 2,
      key: "select",
      title: "Select your colleges",
      label: count >= LIST_GOAL ? (balanced ? `${count} schools, ${plural(levels.length, "level")}` : `${count} schools, one level`) : `${count} of ${LIST_GOAL} on My List`,
      detail: balanced
        ? `Aim for ${LIST_GOAL} schools across levels, with at least two ${firstName} would be happy to attend.`
        : count
          ? `Every school on the list is ${levels[0] ?? "one level"}. Add a few at other levels so you can compare what each would offer.`
          : `Aim for ${LIST_GOAL} schools across levels. Save them from the map or a college's page.`,
      progress: { value: Math.min(count, LIST_GOAL), of: LIST_GOAL },
      cta: { label: count ? "Open My List" : "Build My List", href: count ? "/my-recruiting/colleges" : "/recruiting/college-map" },
      scout: { label: "Is my list balanced?", question: `Is ${firstName}'s college list balanced across levels?` },
    },
    {
      n: 3,
      key: "rules",
      title: "Understand the rules and timing",
      label: input.allowedLine ?? "The rules for your class",
      detail: "What each level's coaches may do, and when, for this wrestler's class. Every rule comes from the NCAA, NAIA and NJCAA's own documents.",
      progress: null,
      cta: { label: "See what's allowed now", href: "/my-recruiting/rules" },
      scout: { label: "When can coaches call?", question: `When can college coaches call ${firstName}?` },
    },
    {
      n: 4,
      key: "reach",
      title: "Reach out",
      label: count ? `${reached} of ${count} schools reached` : "Add schools first",
      detail:
        count === 0
          ? "Once a school is on My List, three moves put you on its coaches' radar: tell them you're interested, fill out the interest form, and email the coach."
          : formsLeft
            ? `Three moves for each school: tell the coaches you're interested, fill out the interest form, and email the coach. ${plural(formsLeft, "interest form")} still to fill.`
            : "Three moves for each school: tell the coaches you're interested, fill out the interest form, and email the coach.",
      progress: count ? { value: Math.min(reached, reachGoal), of: reachGoal } : null,
      cta: { label: count ? "Reach out" : "Build My List", href: count ? "/my-recruiting/reach-out" : "/recruiting/college-map" },
      scout: { label: "Draft a coach email", question: `Draft an email from ${firstName} to a coach on our list.` },
    },
    {
      n: 5,
      key: "monitor",
      title: "Monitor and engage",
      label:
        input.unreadMessages > 0
          ? `${plural(input.unreadMessages, "message")} waiting`
          : input.visitsToConfirm > 0
            ? `${plural(input.visitsToConfirm, "visit")} to confirm`
            : input.upcomingVisits > 0
              ? `${plural(input.upcomingVisits, "visit")} coming up`
              : input.upcomingEvents > 0
                ? `${plural(input.upcomingEvents, "event")} on the schedule`
                : "Add the next event",
      detail: `Answer coaches quickly, keep ${firstName}'s schedule current so coaches know where to watch, and record visits and calls as they happen.`,
      progress: null,
      cta:
        input.unreadMessages > 0
          ? { label: "Open messages", href: "/inbox" }
          : input.visitsToConfirm > 0 || input.upcomingEvents === 0
            ? { label: input.upcomingEvents === 0 && input.visitsToConfirm === 0 ? "Add to the schedule" : "Confirm the visit", href: "/my-recruiting/plan" }
            : { label: "See activity", href: "/my-recruiting/activity" },
      scout: { label: "What should we do next?", question: `What should we do next in ${firstName}'s recruiting?` },
    },
  ]

  // The first step not done is the one to do now; the rest wait. Done steps stay ticked whatever order they were done in.
  const current = steps.find((s) => !done[s.key])?.key ?? null
  return steps.map((s) => ({ ...s, status: done[s.key] ? "done" : s.key === current ? "now" : "later" }))
}
