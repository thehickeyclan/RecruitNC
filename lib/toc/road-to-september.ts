/**
 * "Road to September 18" — the public launch timeline on the TOC page.
 *
 * One list drives the whole strip. Each milestone carries its real moment (ET), so the
 * section advances itself as dates pass — past items get a check, the next one highlights,
 * no deploys. The page is force-dynamic, so every request renders current state.
 *
 * Discipline rule from the launch plan: precise dates only where we're certain (announce,
 * tickets); softer display text ("Week of…") where a slip must not become a public miss.
 */

import { TOC_TICKET_SALE_AT_MS } from "@/lib/toc/ticket-sale"

export type TocRoadMilestone = {
  /** Display date — may be soft ("Week of Aug 24"). */
  dateLabel: string
  label: string
  detail?: string
  /** When this milestone happens (ms epoch, ET). Drives done/next/upcoming state. */
  atMs: number
}

export const TOC_ROAD_MILESTONES: TocRoadMilestone[] = [
  {
    dateLabel: "Fri · Jul 24",
    label: "Tournament announced",
    detail: "The inaugural NC United Tournament of Champions goes public.",
    atMs: Date.parse("2026-07-24T08:00:00-04:00"),
  },
  {
    dateLabel: "Sun · Aug 16",
    label: "Field reveals begin",
    detail: "The field, revealed weight class by weight class.",
    atMs: Date.parse("2026-08-16T08:00:00-04:00"),
  },
  {
    dateLabel: "Week of Aug 24",
    label: "Athlete-family ticket presale",
    detail: "Families of competing athletes get first access by email.",
    atMs: Date.parse("2026-08-24T09:00:00-04:00"),
  },
  {
    dateLabel: "Fri · Aug 28",
    label: "Full field revealed · tickets on sale",
    detail: "Final fields announced — public tickets open. Limited seating.",
    atMs: TOC_TICKET_SALE_AT_MS,
  },
  {
    dateLabel: "Fri · Sep 11",
    label: "Brackets released",
    detail: "Seeds and full brackets for all ten weights.",
    atMs: Date.parse("2026-09-11T09:00:00-04:00"),
  },
  {
    dateLabel: "Sep 18–19",
    label: "Tournament of Champions",
    detail: "One weigh-in Friday night. Champions crowned Saturday.",
    atMs: Date.parse("2026-09-18T07:00:00-04:00"),
  },
]

export type TocRoadState = "done" | "next" | "upcoming"

/** done = its moment passed; next = first one still ahead; the rest upcoming. */
export function tocRoadStates(
  milestones: readonly TocRoadMilestone[] = TOC_ROAD_MILESTONES,
  nowMs: number = Date.now(),
): TocRoadState[] {
  let nextAssigned = false
  return milestones.map((m) => {
    if (nowMs >= m.atMs) return "done"
    if (!nextAssigned) {
      nextAssigned = true
      return "next"
    }
    return "upcoming"
  })
}
