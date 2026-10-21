import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { isApprovedCoach } from "@/lib/coach-messages"
import { easternToday, groupRecruitsByEvent, isOnBetween, isStillOn, weekendEnd, type EventWithRecruits, type RecruitAtEvent } from "@/lib/college-programs/competing-next"

/**
 * Alerts about where a program's recruits compete (Matt, 20 Oct 2026: "notifications should go to
 * the program's home page, under alerts"). Read from the events families enter - nothing is
 * stored twice - and only ever for coaches staff have approved, since it is a minor's schedule.
 */

export type EventAdded = { athleteId: string; name: string; title: string; startDate: string; endDate: string | null; location: string | null; addedAt: string }
export type CompetingAlerts = { added: EventAdded[]; weekend: EventWithRecruits[] }

/** How far back "just added" reaches. */
const ADDED_DAYS = 14

export async function loadCompetingAlerts(admin: SupabaseClient, recruits: Map<string, RecruitAtEvent>, now: Date = new Date()): Promise<CompetingAlerts> {
  const ids = [...recruits.keys()]
  if (!ids.length) return { added: [], weekend: [] }
  const { data, error } = await admin.from("athlete_upcoming_events").select("athlete_id, title, start_date, end_date, location, created_at").in("athlete_id", ids)
  if (error) return { added: [], weekend: [] }
  const today = easternToday(now)
  const end = weekendEnd(today)
  const since = new Date(now.getTime() - ADDED_DAYS * 864e5).toISOString()
  const rows = (data ?? []).map((r) => ({
    athleteId: String(r.athlete_id),
    title: String(r.title),
    startDate: String(r.start_date),
    endDate: r.end_date ? String(r.end_date) : null,
    location: r.location ? String(r.location) : null,
    addedAt: String(r.created_at),
  }))
  const live = rows.filter((r) => isStillOn(r, today))
  return {
    added: live
      .filter((r) => r.addedAt >= since)
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
      .slice(0, 8)
      .map((r) => ({ ...r, name: recruits.get(r.athleteId)?.name ?? "A recruit" })),
    weekend: groupRecruitsByEvent(live.filter((r) => isOnBetween(r, today, end)), recruits),
  }
}

/**
 * Every approved coach with the wrestlers on their program's shared board (the staff's stars,
 * the same board Coach Home shows), for the Thursday notification.
 */
export async function approvedCoachBoards(admin: SupabaseClient): Promise<Array<{ userId: string; athleteIds: string[] }>> {
  const { data: profiles } = await admin.from("user_profiles").select("user_id, school_id, role, verified_coach, verification_status").eq("verified_coach", true)
  const coaches = (profiles ?? []).filter((p) => isApprovedCoach(p as never))
  if (!coaches.length) return []
  const { data: stars } = await admin.from("college_coach_stars").select("athlete_id, coach_user_id").in("coach_user_id", coaches.map((c) => String(c.user_id)))
  const byCoach = new Map<string, Set<string>>()
  for (const s of stars ?? []) {
    const k = String(s.coach_user_id)
    if (!byCoach.has(k)) byCoach.set(k, new Set())
    byCoach.get(k)!.add(String(s.athlete_id))
  }
  // A program's board is its whole staff's stars; a coach with no school has his own.
  const bySchool = new Map<string, Set<string>>()
  for (const c of coaches) {
    if (!c.school_id) continue
    const k = String(c.school_id)
    if (!bySchool.has(k)) bySchool.set(k, new Set())
    for (const a of byCoach.get(String(c.user_id)) ?? []) bySchool.get(k)!.add(a)
  }
  return coaches
    .map((c) => ({ userId: String(c.user_id), athleteIds: [...(c.school_id ? (bySchool.get(String(c.school_id)) ?? new Set<string>()) : (byCoach.get(String(c.user_id)) ?? new Set<string>()))] }))
    .filter((c) => c.athleteIds.length > 0)
}

/** How many college programs (approved coaches) follow a wrestler: the count, never the names. */
export async function programsFollowing(admin: SupabaseClient, athleteId: string): Promise<number> {
  const { data: stars } = await admin.from("college_coach_stars").select("coach_user_id").eq("athlete_id", athleteId)
  const coachIds = [...new Set((stars ?? []).map((s) => String(s.coach_user_id)))]
  if (!coachIds.length) return 0
  const { data: profiles } = await admin.from("user_profiles").select("user_id, school_id, role, verified_coach, verification_status").in("user_id", coachIds)
  const programs = new Set((profiles ?? []).filter((p) => isApprovedCoach(p as never)).map((p) => (p.school_id ? `s:${p.school_id}` : `u:${p.user_id}`)))
  return programs.size
}
