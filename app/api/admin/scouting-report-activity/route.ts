import { NextRequest, NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { analyticsRangeStart, parseAnalyticsRange } from "@/lib/analytics-range"

export const dynamic = "force-dynamic"

/**
 * Who opened and who downloaded scouting reports, one row per person per wrestler.
 *
 * Opens come from `scouting_report_access` (written when a report is built for someone); downloads
 * from `user_analytics` `scouting_report_download` (logged when the report is printed or saved as a
 * PDF). Staff are left out unless `staff=1`: nearly every report opened so far was opened by an
 * admin checking the page, which would bury the coaches this is for.
 */
type Row = {
  athleteId: string
  athleteName: string
  classYear: number | null
  viewerId: string
  viewerName: string
  viewerEmail: string | null
  institution: string | null
  role: string | null
  staff: boolean
  tier: string | null
  opens: number
  downloads: number
  lastAt: string
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const range = parseAnalyticsRange(request.nextUrl.searchParams.get("range"))
  const since = analyticsRangeStart(range)
  const includeStaff = request.nextUrl.searchParams.get("staff") === "1"
  const admin = createAdminClient()

  let opensQ = admin
    .from("scouting_report_access")
    .select("athlete_id, viewer_user_id, viewer_name, viewer_email, viewer_institution, access_tier, created_at")
    .order("created_at", { ascending: false })
    .limit(5000)
  if (since) opensQ = opensQ.gte("created_at", since)
  let downloadsQ = admin
    .from("user_analytics")
    .select("user_id, event_data, created_at")
    .eq("event_type", "scouting_report_download")
    .order("created_at", { ascending: false })
    .limit(5000)
  if (since) downloadsQ = downloadsQ.gte("created_at", since)

  const [{ data: opens, error: opensError }, { data: downloads, error: downloadsError }] = await Promise.all([opensQ, downloadsQ])
  if (opensError) return NextResponse.json({ error: opensError.message }, { status: 500 })
  if (downloadsError) return NextResponse.json({ error: downloadsError.message }, { status: 500 })

  type Open = { athlete_id: string; viewer_user_id: string; viewer_name: string | null; viewer_email: string | null; viewer_institution: string | null; access_tier: string | null; created_at: string }
  type Download = { user_id: string; event_data: { athlete_id?: string } | null; created_at: string }
  const openRows = (opens ?? []) as Open[]
  const downloadRows = ((downloads ?? []) as Download[]).filter((d) => d.user_id && d.event_data?.athlete_id)

  const viewerIds = [...new Set([...openRows.map((o) => o.viewer_user_id), ...downloadRows.map((d) => d.user_id)].filter(Boolean))]
  const athleteIds = [...new Set([...openRows.map((o) => o.athlete_id), ...downloadRows.map((d) => d.event_data!.athlete_id!)])]

  const [{ data: profiles }, { data: athletes }] = await Promise.all([
    viewerIds.length
      ? admin.from("user_profiles").select("user_id, full_name, email, institution, role, is_admin, schools:school_id (name)").in("user_id", viewerIds)
      : Promise.resolve({ data: [] as unknown[] }),
    athleteIds.length
      ? admin.from("athletes").select("id, name, graduationyear").in("id", athleteIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ])
  const profileById = new Map(
    ((profiles ?? []) as Array<Record<string, unknown>>).map((p) => [String(p.user_id), p]),
  )
  const athleteById = new Map(((athletes ?? []) as Array<Record<string, unknown>>).map((a) => [String(a.id), a]))

  const rows = new Map<string, Row>()
  const rowFor = (athleteId: string, viewerId: string, fallback?: Open): Row => {
    const key = `${athleteId}:${viewerId}`
    const existing = rows.get(key)
    if (existing) return existing
    const p = profileById.get(viewerId)
    const a = athleteById.get(athleteId)
    const school = p?.schools as { name?: string } | Array<{ name?: string }> | null | undefined
    const schoolName = Array.isArray(school) ? school[0]?.name : school?.name
    const role = String(p?.role ?? "") || null
    const row: Row = {
      athleteId,
      athleteName: String(a?.name ?? "Unknown athlete"),
      classYear: a?.graduationyear == null ? null : Number(a.graduationyear),
      viewerId,
      viewerName: String(p?.full_name ?? fallback?.viewer_name ?? p?.email ?? fallback?.viewer_email ?? "Unknown"),
      viewerEmail: (p?.email as string | undefined) ?? fallback?.viewer_email ?? null,
      institution: schoolName || (p?.institution as string | undefined) || fallback?.viewer_institution || null,
      role,
      staff: p?.is_admin === true || role === "admin",
      tier: fallback?.access_tier ?? null,
      opens: 0,
      downloads: 0,
      lastAt: "",
    }
    rows.set(key, row)
    return row
  }

  for (const o of openRows) {
    const row = rowFor(o.athlete_id, o.viewer_user_id, o)
    row.opens += 1
    if (!row.tier) row.tier = o.access_tier
    if (o.created_at > row.lastAt) row.lastAt = o.created_at
  }
  for (const d of downloadRows) {
    const row = rowFor(d.event_data!.athlete_id!, d.user_id)
    row.downloads += 1
    if (d.created_at > row.lastAt) row.lastAt = d.created_at
  }

  const all = [...rows.values()]
  const shown = all.filter((r) => includeStaff || !r.staff).sort((a, b) => b.lastAt.localeCompare(a.lastAt))

  return NextResponse.json({
    range,
    includeStaff,
    summary: {
      opens: shown.reduce((n, r) => n + r.opens, 0),
      downloads: shown.reduce((n, r) => n + r.downloads, 0),
      people: new Set(shown.map((r) => r.viewerId)).size,
      athletes: new Set(shown.map((r) => r.athleteId)).size,
      hiddenStaffRows: all.length - all.filter((r) => !r.staff).length,
    },
    rows: shown,
  })
}
