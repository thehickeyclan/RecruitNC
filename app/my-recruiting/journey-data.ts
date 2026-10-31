import "server-only"

/**
 * The recruiting path and reach-out checklist read off one family's Command Center data
 * (./load.ts), so the home page, My List and the Reach out page show the same ticks.
 */
import { easternToday } from "@/lib/college-programs/admissions-format"
import { COLLEGE_LIST_STATUSES } from "@/lib/college-programs/list"
import { allowedNow } from "@/lib/recruiting/allowed-now"
import { journeySteps } from "@/lib/recruiting/journey"
import { visitPhase } from "@/lib/recruiting/visits"
import type { ReachState } from "@/components/portal/reach-out-checklist"
import type { CommandCenter } from "./load"

/** The three moves for one school and one wrestler. */
export function reachStateFor(cc: CommandCenter, schoolId: string, athleteId: string): ReachState {
  const s = cc.schools.find((x) => x.id === schoolId)
  const contacted = s ? COLLEGE_LIST_STATUSES.indexOf(s.status) >= COLLEGE_LIST_STATUSES.indexOf("contacted") : false
  return {
    interest: s?.onRecruitNC && cc.interest.available ? cc.interest.sent.some((x) => x.athleteId === athleteId && x.schoolId === schoolId) : null,
    formDone: Boolean(s?.questionnaireDone),
    // Recorded from the composer or ticked; a college already at "Reached out" or later was written to.
    emailed: Boolean(s?.emailedAt) || contacted,
  }
}

export function journeyFor(cc: CommandCenter, athleteId?: string) {
  const athlete = cc.athletes.find((a) => a.id === athleteId) ?? cc.athletes[0]
  const wrestler = cc.wrestlers.find((w) => w.id === athlete?.id) ?? cc.wrestlers[0]
  if (!athlete || !wrestler) return null
  const today = easternToday()
  const allowed = allowedNow({ gender: athlete.gender, classYear: athlete.classYear })
  const mine = cc.visits.visits.filter((v) => v.athleteId === athlete.id)
  const steps = journeySteps({
    firstName: athlete.firstName,
    grade: wrestler.grade,
    schools: cc.schools
      .filter((s) => !s.noTeam)
      .map((s) => {
        const r = reachStateFor(cc, s.id, athlete.id)
        return { status: s.status, level: s.level, interest: r.interest, formDone: r.formDone, emailed: r.emailed }
      }),
    rulesSeen: cc.rulesSeen,
    allowedLine: allowed?.line ?? null,
    upcomingEvents: wrestler.events.filter((e) => (e.endDate ?? e.startDate) >= today).length,
    unreadMessages: cc.unread,
    upcomingVisits: mine.filter((v) => visitPhase(v, today) === "upcoming").length,
    visitsToConfirm: mine.filter((v) => visitPhase(v, today) === "confirm").length,
  })
  return { athlete, wrestler, steps, allowed, today }
}

/** Reminders show only once sending is on, so a family is never promised one that will not arrive. Always on a developer's machine. */
export const remindersOn = () => process.env.FAMILY_REMINDER_SEND === "1" || process.env.NODE_ENV !== "production"
