/**
 * "This month" in the Recruiting Command Center: the next few things a family should do.
 *
 * Every step is read off what the family has actually done - profile, list, emails, schedule -
 * never off a calendar. The NCAA contact dates differ by division and change; a step that told a
 * sophomore "coaches can call you on June 15" would be wrong for most of the schools on his list.
 *
 * The order is the order recruiting goes in: be worth looking at, know where you are aiming,
 * get into their system, introduce yourself, tell them where to watch you.
 */

import { COLLEGE_LIST_STATUSES, type CollegeListStatus } from "@/lib/college-programs/list"

export type PlanStep = {
  key: "profile" | "list" | "questionnaires" | "email" | "schedule" | "follow-up"
  title: string
  detail: string
  done: boolean
  /** Where the step is done. `email` and `schedule` are handled on the page itself. */
  action: { kind: "link"; href: string } | { kind: "email" } | { kind: "schedule" } | null
}

export type PlanInput = {
  firstName: string
  athleteId: string
  /** "freshman" ... "senior", or null outside high school. */
  grade: string | null
  profilePercent: number
  /** The first unfinished profile item: what to add and which editor opens. */
  profileTodo: { todo: string; edit: string } | null
  listStatuses: CollegeListStatus[]
  /** The level of each saved school ("D1", "NAIA"), so a list that is all one level can be named. */
  listLevels?: string[]
  /** Saved schools that have a questionnaire and are still only "interested". */
  questionnairesWaiting: number
  scheduleCount: number
}

/** A wide list early, a short one late. */
export function listTarget(grade: string | null): number {
  if (grade === "freshman") return 10
  if (grade === "senior") return 10
  return 20
}

/**
 * What to say about the list. Two things a real family's list showed (13 Oct 2026): a senior with
 * nothing saved was told to "narrow" it, and a junior with 17 schools had saved only Division I.
 */
export function listDetail(grade: string | null, count: number, levels: string[]): string {
  const only = levels.length >= 5 && new Set(levels).size === 1 ? levels[0] : null
  if (only === "D1") {
    return `All ${levels.length} are Division I. Most wrestlers who compete in college do it outside Division I, and the roster is limited to 30 at Division I colleges in the House settlement. Add Division II, Division III and NAIA programs you would be glad to attend.`
  }
  if (only) return `All ${levels.length} are ${only}. Add a few programs at other levels so you can compare what each would offer.`
  if (grade === "senior") {
    return count === 0
      ? "Start today. Programs at every level are still filling rosters in senior year. Save the ones you would attend and write to them this week."
      : "Narrow it to the programs that are answering you, with at least two you would be happy to attend."
  }
  return "Go wide and across levels. Most wrestlers who compete in college do it outside Division I."
}

const reached = (statuses: CollegeListStatus[], at: CollegeListStatus) =>
  statuses.filter((s) => COLLEGE_LIST_STATUSES.indexOf(s) >= COLLEGE_LIST_STATUSES.indexOf(at)).length

export function planSteps(input: PlanInput): PlanStep[] {
  const { firstName, athleteId, grade, listStatuses } = input
  const target = listTarget(grade)
  const emailed = reached(listStatuses, "contacted")
  const talking = reached(listStatuses, "talking")

  const steps: PlanStep[] = [
    {
      key: "profile",
      title: input.profilePercent === 100 ? "Profile is complete" : `Finish ${firstName}'s profile`,
      detail:
        input.profilePercent === 100
          ? "Coaches read it before they answer an email. Keep the video and grades current."
          : `${input.profilePercent}% done. Next: ${input.profileTodo?.todo.toLowerCase() ?? "finish the profile"}. A coach opens the profile before replying.`,
      done: input.profilePercent === 100,
      action:
        input.profilePercent === 100
          ? null
          : { kind: "link", href: `/athletes/${athleteId}${input.profileTodo ? `?edit=${input.profileTodo.edit}` : ""}` },
    },
    {
      key: "list",
      title: listStatuses.length >= target ? `${listStatuses.length} schools on your list` : `Build your list: ${listStatuses.length} of ${target} schools`,
      detail: listDetail(grade, listStatuses.length, input.listLevels ?? []),
      done: listStatuses.length >= target,
      action: { kind: "link", href: "/recruiting/college-map" },
    },
  ]

  if (listStatuses.length > 0) {
    steps.push({
      key: "questionnaires",
      title:
        input.questionnairesWaiting > 0
          ? `Fill out ${input.questionnairesWaiting} recruiting questionnaire${input.questionnairesWaiting === 1 ? "" : "s"}`
          : "Questionnaires are sent",
      detail: "It puts the wrestler in the program's own database. Do it before you email, so you can say you have.",
      done: input.questionnairesWaiting === 0,
      action: input.questionnairesWaiting > 0 ? { kind: "link", href: "/recruiting/college-map?list=1" } : null,
    })
    steps.push({
      key: "email",
      title: emailed > 0 ? `${emailed} coach${emailed === 1 ? "" : "es"} emailed` : "Email your first coach",
      detail:
        emailed > 0
          ? "One school at a time. Write to the next one when you have something real to say about it."
          : "Start with the school you know best. The email is drafted from verified results; the reason is yours.",
      done: emailed >= Math.min(5, listStatuses.length),
      action: { kind: "email" },
    })
  }

  steps.push({
    key: "schedule",
    title: input.scheduleCount > 0 ? `${input.scheduleCount} event${input.scheduleCount === 1 ? "" : "s"} on the schedule` : "Add where you're wrestling next",
    detail: "Coaches recruit in person. Your schedule goes in every email so they know where to watch.",
    done: input.scheduleCount > 0,
    action: { kind: "schedule" },
  })

  if (emailed > 0) {
    steps.push({
      key: "follow-up",
      title: talking > 0 ? `${talking} program${talking === 1 ? "" : "s"} talking to you` : "Follow up after your next tournament",
      detail:
        talking > 0
          ? "Answer within a day, and mark visits and offers on your list as they happen."
          : "A results update is the best reason to write again. Silence from a Division I coach is often a rule, not a no.",
      done: talking > 0,
      action: { kind: "email" },
    })
  }
  return steps
}
