import "server-only"

/**
 * The records behind "What changed for you" (lib/recruiting/whats-changed.ts) for one wrestler,
 * read off the Command Center loader (./load.ts) plus the inbox and the college rosters.
 */
import type { SupabaseClient } from "@supabase/supabase-js"

import { listThreads } from "@/lib/coach-messages"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import data from "@/lib/college-programs/programs-2026-27.json"
import { DIVISION_SHORT, primaryDivision, type CollegeMapSchool } from "@/lib/college-programs/types"
import { mapSchoolIdFor } from "@/lib/college-programs/load"
import { nearestCollegeWeights } from "@/lib/college-programs/roster-depth"
import { roomByWeight, roomFor, weightsPublished } from "@/lib/college-programs/roster-room"
import { listTarget } from "@/lib/college-programs/roadmap"
import type { FamilyNeed } from "@/lib/recruiting/needs-server"
import { visitPhase } from "@/lib/recruiting/visits"
import { buildFeed, coachConfirmedNeeds, type Feed, type FeedNeed } from "@/lib/recruiting/whats-changed"
import { reachStateFor } from "./journey-data"
import type { CommandCenter } from "./load"

/** D1, D2, D3, NAIA or NJCAA for every program this season, on the list or not. */
const LEVEL = new Map([...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS].map((s) => [s.id, DIVISION_SHORT[primaryDivision(s)]]))

/**
 * Possible needs at the wrestler's weight on the list's colleges, from each college's own roster:
 * at the college weights nearest the weight he last competed at, in the fall he would arrive,
 * nobody still there. Always labelled inferred: redshirts, transfers and the coach's own
 * recruiting change every room (lib/college-programs/roster-room.ts).
 */
export function inferredNeeds(schools: Array<{ id: string; name: string; level: string }>, team: "mens" | "womens", weight: number, classYear: number): FeedNeed[] {
  const near = nearestCollegeWeights(weight, team)
  const out: FeedNeed[] = []
  for (const s of schools) {
    const room = roomFor(s.id, team)
    if (!room || !weightsPublished(room)) continue
    const rows = roomByWeight(room, team, classYear).filter((r) => near.includes(r.weight))
    /*
     * Only a weight nobody on the roster will still hold: everyone there finishes by then, or no one
     * is listed. The board's "likely need" (one or none staying) marked 13 of Gemma Amiott's 23
     * colleges for Jake at 149, too many to mean anything. The weight at or above his comes first.
     */
    const row = rows.find((r) => r.staying === 0)
    if (!row) continue
    const line =
      row.now === 0
        ? `No one listed at ${row.weight} on the ${room.season} roster`
        : row.now === 1
          ? `The one wrestler at ${row.weight} finishes by ${classYear}`
          : `All ${row.now} at ${row.weight} finish by ${classYear}`
    out.push({ schoolId: s.id, name: s.name, level: s.level, weight: row.weight, source: "inferred", line })
  }
  return out
}

/** `needs`: loadNeedsForAthlete for this wrestler, read once by the page. */
export async function loadWhatsChanged(admin: SupabaseClient, cc: CommandCenter, athleteId: string, weight: number | null, needs: FamilyNeed[] = [], now = new Date(), skip: string[] = []): Promise<Feed | null> {
  const athlete = cc.athletes.find((a) => a.id === athleteId)
  const wrestler = cc.wrestlers.find((w) => w.id === athleteId)
  if (!athlete || !wrestler) return null
  const today = now.toISOString().slice(0, 10)
  const team: "mens" | "womens" = cc.focus?.gender ?? (athlete.gender?.toLowerCase().startsWith("f") ? "womens" : "mens")
  const listed = cc.schools.filter((s) => !s.noTeam)
  const threads = cc.hidePersonal ? [] : await listThreads(admin, cc.viewerId, { athleteId }).catch(() => [])
  const confirmed = coachConfirmedNeeds(needs, listed, now)
  const inferred = weight && athlete.classYear ? inferredNeeds(listed, team, weight, athlete.classYear) : []
  const views = (cc.views.get(athleteId)?.visits ?? []).flatMap((v) => {
    if (!v.school) return []
    const schoolId = mapSchoolIdFor(v.school)
    return [{ school: v.school, schoolId, level: schoolId ? (LEVEL.get(schoolId) ?? null) : null, at: v.at }]
  })
  const schoolName = new Map(cc.schools.map((s) => [s.id, s.name]))
  return buildFeed({
    firstName: athlete.firstName,
    now: now.toISOString(),
    weight,
    views,
    list: cc.schools.map((s) => ({ id: s.id, name: s.name, level: s.level, status: s.status, contacted: reachStateFor(cc, s.id, athleteId).emailed, savedAt: s.savedAt })),
    needs: [...confirmed, ...inferred],
    threads: threads.map((t) => ({ id: t.id, program: t.program, unread: t.unread, yourTurn: t.yourTurn && !t.stopped, at: t.lastMessageAt })),
    visits: cc.visits.visits
      .filter((v) => v.athleteId === athleteId && (visitPhase(v, today) === "upcoming" || visitPhase(v, today) === "confirm"))
      .map((v) => ({ id: v.id, schoolId: v.schoolId, schoolName: schoolName.get(v.schoolId) ?? v.schoolId, startsOn: v.startsOn, kind: v.kind, needsConfirm: visitPhase(v, today) === "confirm" })),
    reminders: cc.reminders.reminders.filter((r) => !r.athleteId || r.athleteId === athleteId).map((r) => ({ id: r.id, note: r.note, remindAt: r.remindAt })),
    listTarget: listTarget(wrestler.grade),
    upcomingEvents: wrestler.events.filter((e) => (e.endDate ?? e.startDate) >= today).length,
    skip,
  })
}
