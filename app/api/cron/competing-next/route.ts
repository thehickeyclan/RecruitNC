import { NextResponse, type NextRequest } from "next/server"

import { approvedCoachBoards } from "@/lib/college-programs/competing-alerts"
import { easternToday, easternWeekday, groupRecruitsByEvent, isOnBetween, weekendBody, weekendEnd } from "@/lib/college-programs/competing-next"
import { sendToTokens } from "@/lib/push-send"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Where wrestlers compete next, kept tidy and passed on (Matt, 20 Oct 2026).
 *
 * Every day: an event that has ended is deleted. It is a minor's whereabouts; once it is over it
 * is history nobody needs (it already stopped showing the day after it ended).
 *
 * Thursdays: one notification to each approved coach whose program follows wrestlers competing
 * between today and Sunday - "This weekend: 3 of your recruits are competing". A digest, never one
 * per entry, for the reason the results digest is one. `push_sent_result_digests` keyed
 * "weekend:<Sunday>" means a re-run never sends the same weekend twice.
 */

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = createAdminClient()
  const today = easternToday()

  // Ended: the last day (or the only day) is before today in North Carolina.
  const [a, b] = await Promise.all([
    admin.from("athlete_upcoming_events").delete({ count: "exact" }).not("end_date", "is", null).lt("end_date", today),
    admin.from("athlete_upcoming_events").delete({ count: "exact" }).is("end_date", null).lt("start_date", today),
  ])
  const deleted = (a.count ?? 0) + (b.count ?? 0)

  const force = new URL(request.url).searchParams.get("weekend") === "1"
  if (easternWeekday() !== 4 && !force) return NextResponse.json({ deleted, weekend: "not Thursday" })

  const end = weekendEnd(today)
  const boards = await approvedCoachBoards(admin)
  const allIds = [...new Set(boards.flatMap((b) => b.athleteIds))]
  if (!allIds.length) return NextResponse.json({ deleted, notified: 0 })
  const [{ data: events }, { data: athletes }] = await Promise.all([
    admin.from("athlete_upcoming_events").select("athlete_id, title, start_date, end_date, location").in("athlete_id", allIds),
    admin.from("athletes").select("id, name, graduationyear, weightclass, highschool").in("id", allIds),
  ])
  const rows = (events ?? [])
    .map((r) => ({ athleteId: String(r.athlete_id), title: String(r.title), startDate: String(r.start_date), endDate: r.end_date ? String(r.end_date) : null, location: r.location ? String(r.location) : null }))
    .filter((r) => isOnBetween(r, today, end))
  if (!rows.length) return NextResponse.json({ deleted, notified: 0 })
  const recruitsAll = new Map(
    (athletes ?? []).map((x) => [String(x.id), { id: String(x.id), name: String(x.name ?? "A recruit"), classYear: x.graduationyear ? Number(x.graduationyear) : null, weight: null, highSchool: (x.highschool as string | null) ?? null }]),
  )

  const sent: Array<{ user: string; recruits: number; sent: number }> = []
  for (const board of boards) {
    const mine = new Set(board.athleteIds)
    const weekend = groupRecruitsByEvent(rows.filter((r) => mine.has(r.athleteId)), recruitsAll)
    const count = new Set(weekend.flatMap((e) => e.recruits.map((r) => r.id))).size
    if (!count) continue
    const key = `weekend:${end}`
    const { error: claim } = await admin.from("push_sent_result_digests").insert({ user_id: board.userId, event_key: key, event_label: `Recruits competing, weekend of ${end}`, athletes_followed: count })
    if (claim) continue
    // "alert_results", the wrestlers-you-follow switch: "alert_events" is the calendar's, and no coach has it on.
    const { data: devices } = await admin.from("push_devices").select("expo_push_token").eq("user_id", board.userId).eq("alert_results", true)
    const tokens = [...new Set((devices ?? []).map((d) => String(d.expo_push_token)).filter(Boolean))]
    if (!tokens.length) continue
    // The tap opens a wrestler's profile: a route every app version has (a new path in an old bundle is "Unmatched Route").
    const first = weekend[0].recruits[0]
    const outcome = await sendToTokens("alert_results", tokens, {
      title: `This weekend: ${count} of your recruit${count === 1 ? " is" : "s are"} competing`,
      body: weekendBody(weekend),
      data: { kind: "recruits_competing", weekend: end, path: `/athlete/${first.id}` },
    })
    await admin.from("push_sent_result_digests").update({ recipients: outcome.sent }).eq("user_id", board.userId).eq("event_key", key)
    sent.push({ user: board.userId, recruits: count, sent: outcome.sent })
  }
  return NextResponse.json({ deleted, notified: sent.length, sent })
}
