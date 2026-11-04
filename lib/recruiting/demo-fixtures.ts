import { addDays, easternAt, easternDay, type Reminder } from "@/lib/recruiting/reminders"
import type { Offer } from "@/lib/recruiting/offers"
import type { Visit } from "@/lib/recruiting/visits"

/**
 * Sample visits and reminders for a developer's machine before the tables exist
 * (scripts/add-command-center-visits-reminders.sql), so the screens can be seen and screenshotted
 * with a real family's list. Only with CC_DEMO_FIXTURES=1 and never in production; nothing is saved.
 */
export const demoFixturesOn = () => process.env.NODE_ENV !== "production" && process.env.CC_DEMO_FIXTURES === "1"

export function demoVisits(athleteId: string, schoolIds: string[]): Visit[] {
  const today = easternDay()
  const [a, b] = schoolIds
  const out: Visit[] = []
  if (a) out.push({ id: "demo-visit-1", athleteId, schoolId: a, kind: "official", startsOn: addDays(today, 9), endsOn: addDays(today, 10), who: "Wrestler, Mom and Dad", notes: "Meet the head coach at 10. Practice at 3.", outcome: "planned" })
  if (b) out.push({ id: "demo-visit-2", athleteId, schoolId: b, kind: "unofficial", startsOn: addDays(today, -3), endsOn: null, who: "Wrestler and Dad", notes: null, outcome: "planned" })
  return out
}

export function demoReminders(athleteId: string, schools: Array<{ id: string; name: string }>): Reminder[] {
  const today = easternDay()
  const [a, b] = schools
  const out: Reminder[] = []
  if (a) out.push({ id: "demo-rem-1", athleteId, schoolId: a.id, visitId: "demo-visit-1", topic: "visit", remindAt: easternAt(addDays(today, 8), 18).toISOString(), note: `${a.name} official visit tomorrow. Pack the visit checklist.`, sentAt: null })
  if (b) out.push({ id: "demo-rem-2", athleteId, schoolId: b.id, visitId: null, topic: "school", remindAt: easternAt(addDays(today, 7), 9).toISOString(), note: `Follow up with the ${b.name} coach.`, sentAt: null })
  return out
}

/** Sample offers for three colleges on the list (scripts/add-college-offers.sql), so the comparison can be seen. */
export function demoOffers(athleteId: string, schoolIds: string[]): Offer[] {
  const [a, b, c] = schoolIds
  const base = { athleteId, cost: null, revenueShare: 0, otherAid: 0, updatedAt: null }
  const out: Offer[] = []
  if (a) out.push({ ...base, schoolId: a, grants: 0, merit: 8000, athletic: 15000, loans: 5500, years: 4, renews: "unknown" })
  if (b) out.push({ ...base, schoolId: b, grants: 2000, merit: 20000, athletic: 0, loans: 5500, years: 4, renews: "yes" })
  if (c) out.push({ ...base, schoolId: c, grants: 0, merit: 5000, athletic: 6000, loans: 0, years: 1, renews: "no" })
  return out
}
