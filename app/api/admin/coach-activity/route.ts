import { NextRequest, NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { analyticsRangeStart, parseAnalyticsRange } from "@/lib/analytics-range"

export const dynamic = "force-dynamic"

/**
 * College coaches, grouped by program: who signed in when, and which athlete profiles they opened.
 *
 * Built from what is already recorded. `user_analytics` logs a `profile_view` for every athlete
 * page a signed-in user opens, with the athlete id in `event_data`; sign-in times come from auth.
 * A coach's program is the school they are assigned to, falling back to the college they typed
 * at sign-up, so a coach who has not been assigned yet still appears under their own program.
 */

type Visit = { athleteId: string; name: string; classYear: number | null; school: string | null; views: number; lastViewedAt: string }
type CoachRow = {
  userId: string
  name: string
  email: string
  verified: boolean
  reviewed: boolean
  lastLoginAt: string | null
  lastActiveAt: string | null
  profileViews: number
  uniqueAthletes: number
  visits: Visit[]
}
type ProgramRow = {
  program: string
  coaches: CoachRow[]
  profileViews: number
  uniqueAthletes: number
  lastActiveAt: string | null
}

const latest = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b)

export async function GET(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const range = parseAnalyticsRange(request.nextUrl.searchParams.get("range"))
  const since = analyticsRangeStart(range)

  const admin = createAdminClient()

  const { data: profiles, error: profileError } = await admin
    .from("user_profiles")
    .select("user_id, full_name, email, institution, verified_coach, verification_status, schools:school_id (name)")
    .in("role", ["college_coach", "college-coach"])
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  const coaches = (profiles ?? []) as Array<{
    user_id: string
    full_name: string | null
    email: string | null
    institution: string | null
    verified_coach: boolean | null
    verification_status: string | null
    schools: { name: string | null } | { name: string | null }[] | null
  }>
  const coachIds = coaches.map((c) => c.user_id)

  // Sign-in times live on the auth user, not the profile.
  const lastSignIn = new Map<string, string | null>()
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) break
    for (const u of data.users) lastSignIn.set(u.id, u.last_sign_in_at ?? null)
    if (data.users.length < 1000) break
  }

  // Every event by these coaches in the window: profile views for the list, anything for "last active".
  type Event = { user_id: string; event_type: string; created_at: string; event_data: Record<string, unknown> | null; page_url: string | null }
  const events: Event[] = []
  if (coachIds.length) {
    for (let from = 0; ; from += 1000) {
      let q = admin
        .from("user_analytics")
        .select("user_id, event_type, created_at, event_data, page_url")
        .in("user_id", coachIds)
        .order("created_at", { ascending: false })
        .range(from, from + 999)
      if (since) q = q.gte("created_at", since)
      const { data, error } = await q
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      events.push(...((data ?? []) as Event[]))
      if (!data || data.length < 1000) break
    }
  }

  const athleteIdOf = (e: Event): string | null => {
    const fromData = e.event_data && typeof e.event_data.athlete_id === "string" ? e.event_data.athlete_id : null
    if (fromData) return fromData
    const m = String(e.page_url ?? "").match(/^\/athletes\/([0-9a-f-]{36})/i)
    return m ? m[1] : null
  }

  const views = events.filter((e) => e.event_type === "profile_view" && athleteIdOf(e))
  const athleteIds = [...new Set(views.map((e) => athleteIdOf(e)!))]
  const athletes = new Map<string, { name: string; graduationyear: number | null; highschool: string | null }>()
  for (let i = 0; i < athleteIds.length; i += 500) {
    const { data } = await admin.from("athletes").select("id, name, graduationyear, highschool").in("id", athleteIds.slice(i, i + 500))
    for (const a of data ?? []) athletes.set(String(a.id), a as never)
  }

  const coachRows: CoachRow[] = coaches.map((c) => {
    const mine = events.filter((e) => e.user_id === c.user_id)
    const visitsById = new Map<string, Visit>()
    for (const e of mine) {
      if (e.event_type !== "profile_view") continue
      const id = athleteIdOf(e)
      if (!id) continue
      const a = athletes.get(id)
      const v = visitsById.get(id) ?? {
        athleteId: id,
        name: a?.name ?? (typeof e.event_data?.athlete_name === "string" ? e.event_data.athlete_name : "Unknown athlete"),
        classYear: a?.graduationyear ?? null,
        school: a?.highschool ?? null,
        views: 0,
        lastViewedAt: e.created_at,
      }
      v.views += 1
      v.lastViewedAt = latest(v.lastViewedAt, e.created_at)!
      visitsById.set(id, v)
    }
    const visits = [...visitsById.values()].sort((x, y) => y.lastViewedAt.localeCompare(x.lastViewedAt))
    const status = String(c.verification_status ?? "").toLowerCase()
    return {
      userId: c.user_id,
      name: c.full_name?.trim() || c.email || "Coach",
      email: c.email ?? "",
      verified: c.verified_coach === true,
      reviewed: status === "approved",
      lastLoginAt: lastSignIn.get(c.user_id) ?? null,
      lastActiveAt: mine[0]?.created_at ?? null,
      profileViews: visits.reduce((n, v) => n + v.views, 0),
      uniqueAthletes: visits.length,
      visits,
    }
  })

  const programOf = (c: (typeof coaches)[number]) => {
    const school = Array.isArray(c.schools) ? c.schools[0]?.name : c.schools?.name
    return school?.trim() || c.institution?.trim() || "No program given"
  }

  const byProgram = new Map<string, ProgramRow>()
  coaches.forEach((c, i) => {
    const key = programOf(c)
    const row = byProgram.get(key) ?? { program: key, coaches: [], profileViews: 0, uniqueAthletes: 0, lastActiveAt: null }
    row.coaches.push(coachRows[i])
    byProgram.set(key, row)
  })
  for (const p of byProgram.values()) {
    p.coaches.sort((a, b) => b.profileViews - a.profileViews || (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? ""))
    p.profileViews = p.coaches.reduce((n, c) => n + c.profileViews, 0)
    p.uniqueAthletes = new Set(p.coaches.flatMap((c) => c.visits.map((v) => v.athleteId))).size
    p.lastActiveAt = p.coaches.reduce<string | null>((m, c) => latest(m, latest(c.lastActiveAt, c.lastLoginAt)), null)
  }
  const programs = [...byProgram.values()].sort(
    (a, b) => b.profileViews - a.profileViews || (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? ""),
  )

  // The athletes coaches are looking at, across every program.
  const mostViewed = new Map<string, { athleteId: string; name: string; classYear: number | null; views: number; programs: Set<string> }>()
  for (const p of programs)
    for (const c of p.coaches)
      for (const v of c.visits) {
        const m = mostViewed.get(v.athleteId) ?? { athleteId: v.athleteId, name: v.name, classYear: v.classYear, views: 0, programs: new Set<string>() }
        m.views += v.views
        m.programs.add(p.program)
        mostViewed.set(v.athleteId, m)
      }

  return NextResponse.json({
    range,
    summary: {
      programs: programs.length,
      activePrograms: programs.filter((p) => p.profileViews > 0).length,
      coaches: coachRows.length,
      activeCoaches: coachRows.filter((c) => c.profileViews > 0 || c.lastActiveAt).length,
      profileViews: coachRows.reduce((n, c) => n + c.profileViews, 0),
      uniqueAthletes: athleteIds.length,
    },
    programs,
    mostViewed: [...mostViewed.values()]
      .sort((a, b) => b.programs.size - a.programs.size || b.views - a.views)
      .slice(0, 15)
      .map((m) => ({ ...m, programs: [...m.programs] })),
  })
}
