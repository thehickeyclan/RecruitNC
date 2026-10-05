/**
 * Coach views folded into visits, for the "College coach views" panel.
 *
 * A coach reading a profile reloads it, opens the film, comes back - and every one of those was a
 * row. Ferrum looking at one wrestler on 24 Aug was four lines four minutes apart, which reads as
 * four separate looks and buries the program that came back a month later.
 *
 * A visit starts at a program's first view and takes in every further view from that program in
 * the next 24 hours. Anchored on the first view rather than chained view to view, so a program
 * checking in every evening is a visit a day, not one week-long visit. Different programs never
 * merge, even when their views interleave.
 */

export type CoachView = { school: string | null; at: string }
export type CoachVisit = { school: string | null; first: string; last: string; views: number }

const DAY_MS = 24 * 60 * 60 * 1000

/** Visits newest first, the order families read the panel in. */
export function groupCoachVisits(views: ReadonlyArray<CoachView>): CoachVisit[] {
  const oldestFirst = views
    .filter((v) => !Number.isNaN(Date.parse(v.at)))
    .slice()
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))

  const open = new Map<string, CoachVisit>()
  const visits: CoachVisit[] = []
  for (const view of oldestFirst) {
    // Unplaceable addresses share one label on screen, so they share visits too.
    const key = view.school ?? "\u0000unknown"
    const current = open.get(key)
    if (current && Date.parse(view.at) - Date.parse(current.first) < DAY_MS) {
      current.last = view.at
      current.views += 1
      continue
    }
    const visit = { school: view.school, first: view.at, last: view.at, views: 1 }
    open.set(key, visit)
    visits.push(visit)
  }
  return visits.sort((a, b) => Date.parse(b.last) - Date.parse(a.last))
}
