/**
 * A family's first day in the Command Center (Matt, 5 Nov 2026): while nothing is saved, the home
 * page is one "Start here" card with three moves, always in this order, each ticked once done.
 *
 *   1. Finish the profile: coaches read it first, and it was 20% for Mandi Nelsen's son.
 *   2. What matters to your family (priorities survey v3): it shapes the suggestions below.
 *   3. Save five colleges, from the shortlist and then the map (the shortlist is often fewer than five).
 *   4. Add the next event, so coaches who follow the wrestler can come watch.
 */
import { FIRST_LIST_GOAL } from "@/lib/recruiting/first-list-goal"

export type FirstDayMove = { key: "profile" | "priorities" | "colleges" | "event"; label: string; why: string; href: string; done: boolean }

export function firstDayMoves(input: { firstName: string; athleteId: string; profilePercent: number; profileTodo: string | null; saved: number; upcomingEvents: number; suggested: number; prioritiesDone: boolean }): FirstDayMove[] {
  const name = input.firstName
  const saved = Math.min(input.saved, FIRST_LIST_GOAL)
  return [
    {
      key: "profile",
      label: `Finish ${name}'s profile`,
      why: input.profilePercent >= 100 ? "100% done." : `${input.profilePercent}% done. Coaches read it first.`,
      href: `/athletes/${input.athleteId}${input.profileTodo && input.profilePercent < 100 ? `?edit=${input.profileTodo}` : ""}`,
      done: input.profilePercent >= 100,
    },
    {
      key: "priorities",
      label: "What matters to your family",
      why: input.prioritiesDone ? "Answered. Change it any time." : "About 3 minutes. Tell us what matters before you build the list.",
      href: `/my-recruiting/priorities?w=${input.athleteId}`,
      done: input.prioritiesDone,
    },
    {
      key: "colleges",
      label: `Save ${FIRST_LIST_GOAL} colleges`,
      why: `${saved} of ${FIRST_LIST_GOAL} saved. ${input.suggested >= FIRST_LIST_GOAL ? "Start with the shortlist below." : input.suggested > 0 ? "Start with the shortlist below, then the map." : "Find them on the college map."}`,
      href: input.suggested > 0 ? "#cc-starter" : "/recruiting/college-map",
      done: input.saved >= FIRST_LIST_GOAL,
    },
    {
      key: "event",
      label: "Add the next event",
      why: input.upcomingEvents > 0 ? "On the schedule." : `Coaches who follow ${name} see it and can come watch.`,
      href: "/my-recruiting/plan#schedule",
      done: input.upcomingEvents > 0,
    },
  ]
}
