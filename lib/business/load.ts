import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { collegeCoachIds, type AuthRow, type ProfileRow, type StarRow } from "@/lib/admin/coach-usage"
import { collegeForCoach } from "@/lib/college-domain-schools"
import type { AthleteDim, Gender, Metric, MetricEvent, SiteKey } from "@/lib/business/metrics"
import { athleteStateCode } from "@/lib/recruiting/states"

/**
 * Everything the Business charts read, loaded once per page.
 *
 * Reads only. Every column named here is a count, a date or a key - no family name, phone, email
 * or address, and from `college_coach_stars` only the three columns that say who starred whom and
 * when. That table also carries the coach's own CRM notes on the same row: parent_name,
 * parent_phone, parent_email, athlete_cell, financial_efc, ability_to_pay, financial_notes. A
 * `select("*")` here would hand all of it to an account that must never see it (Matt,
 * 4 November 2026), so the select stays narrow and `StarRow` is the shape that enforces it.
 *
 * Supabase caps an unpaged select at 1,000 rows, so every read here pages with a stable
 * `.order("id")`. Without the order, paging can return the same row twice and miss another.
 */

const PAGE = 1000
const MAX_ROWS = 400_000

async function page<T>(
  admin: SupabaseClient,
  table: string,
  columns: string,
  build: (q: any) => any = (q) => q,
  orderBy = "id",
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await build(admin.from(table).select(columns)).order(orderBy).range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE) break
  }
  return out
}

type AthleteRow = {
  id: string
  state: string | null
  is_nc_athlete: boolean | null
  gender: string | null
  graduationyear: number | string | null
  created_at: string | null
  claimed_at: string | null
  claimed_by_user_id: string | null
}

export type BusinessData = {
  /** Every wrestler's state and gender, for attributing the five wrestler-shaped series. */
  dims: Map<string, AthleteDim>
  events: Record<Metric, MetricEvent[]>
  /** When this was read, for the "as of" line. */
  readAt: string
}

function genderOf(raw: string | null): Gender | null {
  const g = String(raw ?? "").trim().toLowerCase()
  return g === "male" ? "Male" : g === "female" ? "Female" : null
}

function siteOf(event_data: { site?: string | null } | null): SiteKey {
  const s = event_data?.site
  return s === "rw" || s === "ncu" || s === "app" ? s : "untagged"
}

export async function loadBusinessData(admin: SupabaseClient): Promise<BusinessData> {
  // graduationyear is lower case while firstName is camel case: the column names are not
  // consistent, and the wrong case fails silently in PostgREST.
  const athletes = await page<AthleteRow>(
    admin,
    "athletes",
    "id, state, is_nc_athlete, gender, graduationyear, created_at, claimed_at, claimed_by_user_id",
  )

  /*
   * A profile is claimed when a FAMILY holds it: the wrestler's own account, or a parent link.
   * Parent links live in their own table, so `athletes.claimed_at` alone misses every profile a
   * parent claimed and the wrestler never did - 84 of North Carolina's 291 on 4 November 2026.
   * A parent-held profile is as claimed as any: it gets the weekly email and shows the names.
   */
  const links = await page<{ athlete_id: string | null; created_at: string | null }>(
    admin,
    "parent_athlete_links",
    "id, athlete_id, created_at",
  )
  const parentHeldSince = new Map<string, string>()
  for (const l of links) {
    if (!l.athlete_id || !l.created_at) continue
    const id = String(l.athlete_id)
    const at = parentHeldSince.get(id)
    if (!at || l.created_at < at) parentHeldSince.set(id, l.created_at)
  }

  const dims = new Map<string, AthleteDim>()
  const athleteOfUser = new Map<string, string>()
  const created: MetricEvent[] = []
  const claimed: MetricEvent[] = []
  for (const a of athletes) {
    const id = String(a.id)
    const year = Number(a.graduationyear)
    const heldByWrestler = Boolean(a.claimed_by_user_id)
    const heldByParentSince = parentHeldSince.get(id)
    dims.set(id, {
      state: athleteStateCode(a),
      gender: genderOf(a.gender),
      classYear: Number.isInteger(year) && year > 2000 && year < 2100 ? year : null,
      claimed: heldByWrestler || Boolean(heldByParentSince),
    })
    if (a.claimed_by_user_id) athleteOfUser.set(String(a.claimed_by_user_id), id)
    if (a.created_at) created.push({ at: a.created_at, athleteId: id })
    // The day the family got it: the earlier of the wrestler's claim and the first parent link.
    const dates = [heldByWrestler ? a.claimed_at : null, heldByParentSince ?? null].filter((d): d is string => Boolean(d)).sort()
    if (dates.length) claimed.push({ at: dates[0], athleteId: id })
  }

  const edits = await page<{ athlete_id: string | null; created_at: string }>(
    admin,
    "athlete_audit_log",
    "id, athlete_id, created_at",
    (q) => q.eq("change_type", "athlete_edit"),
  )

  // Three columns, deliberately: see the note at the top of this file.
  const stars = await page<StarRow & { id: string }>(admin, "college_coach_stars", "id, coach_user_id, athlete_id, starred_at")

  const analytics = await page<{ user_id: string | null; event_type: string; created_at: string; event_data: { site?: string | null; athlete_id?: string | null } | null }>(
    admin,
    "user_analytics",
    "id, user_id, event_type, created_at, event_data",
    (q) => q.in("event_type", ["profile_view", "signin_completed"]),
  )

  const profiles = await page<ProfileRow & { id: string }>(
    admin,
    "user_profiles",
    "id, user_id, email, role, profile_type, verified_coach, institution, is_admin",
  )
  // The program a coach recruits for, by the same rule the college-interest report uses. A
  // program is named on these pages; the coach never is.
  const programOf = new Map<string, string>()
  for (const p of profiles) {
    const school = collegeForCoach({ institution: p.institution as string, email: p.email as string })
    if (school) programOf.set(String(p.user_id), school)
  }
  const users: AuthRow[] = []
  for (let p = 1; p < 50; p++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: p, perPage: PAGE })
    if (error) throw new Error(`auth users: ${error.message}`)
    users.push(...((data.users ?? []) as unknown as AuthRow[]))
    if (!data.users || data.users.length < PAGE) break
  }
  const coaches = collegeCoachIds(profiles, users)

  const views: MetricEvent[] = []
  const signIns: MetricEvent[] = []
  for (const e of analytics) {
    if (e.event_type === "profile_view") {
      if (!e.user_id || !coaches.has(String(e.user_id))) continue
      const athleteId = e.event_data?.athlete_id ? String(e.event_data.athlete_id) : null
      views.push({
        at: e.created_at,
        athleteId,
        site: siteOf(e.event_data),
        by: programOf.get(String(e.user_id)) ?? null,
        byUser: String(e.user_id),
      })
    } else if (e.event_type === "signin_completed") {
      // A sign-in belongs to an account. Its state and gender are the wrestler that account has
      // claimed; an account that has claimed nobody has neither, and is counted as unassigned.
      const athleteId = e.user_id ? (athleteOfUser.get(String(e.user_id)) ?? null) : null
      signIns.push({ at: e.created_at, athleteId, site: siteOf(e.event_data) })
    }
  }

  return {
    dims,
    readAt: new Date().toISOString(),
    events: {
      profiles_created: created,
      profiles_claimed: claimed,
      profile_edits: edits.filter((r) => r.athlete_id).map((r) => ({ at: r.created_at, athleteId: String(r.athlete_id) })),
      coach_views: views,
      coach_stars: stars
        .filter((s) => s.starred_at)
        .map((s) => ({
          at: String(s.starred_at),
          athleteId: String(s.athlete_id),
          by: programOf.get(String(s.coach_user_id)) ?? null,
          byUser: String(s.coach_user_id),
        })),
      sign_ins: signIns,
    },
  }
}
