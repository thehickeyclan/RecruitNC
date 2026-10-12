import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { weeklyCounts, weekStart } from "@/lib/admin/weekly-buckets"

export const dynamic = "force-dynamic"

const WEEKS = 12
const PAGE = 1000

/**
 * Claimed profiles and profile edits by week, for /admin/card-analytics.
 * Admin-only by way of the middleware gate (lib/admin-api-gate.ts).
 */
export async function GET() {
  const admin = createAdminClient()
  const now = new Date()
  // A day of slack before the first Monday: the window is Eastern weeks, the filter is UTC.
  const since = new Date(Date.parse(weeklyCounts([], WEEKS, now)[0].weekStart) - 86_400_000).toISOString()

  const [{ count: totalClaimed, error: totalErr }, { data: claims, error: claimsErr }] = await Promise.all([
    admin.from("athletes").select("id", { count: "exact", head: true }).not("claimed_by_user_id", "is", null),
    admin.from("athletes").select("claimed_at").not("claimed_by_user_id", "is", null).gte("claimed_at", since).limit(PAGE * 5),
  ])
  if (totalErr || claimsErr) {
    return NextResponse.json({ error: (totalErr ?? claimsErr)!.message }, { status: 500 })
  }

  // One row per field changed, so a busy week runs past PostgREST's page size.
  const edits: Array<{ created_at: string; athlete_id: string | null }> = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("athlete_audit_log")
      .select("created_at, athlete_id")
      .eq("change_type", "athlete_edit")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    edits.push(...((data ?? []) as typeof edits))
    if (!data || data.length < PAGE) break
  }

  const profilesByWeek = new Map<string, Set<string>>()
  for (const e of edits) {
    if (!e.athlete_id) continue
    const key = weekStart(new Date(e.created_at))
    if (!profilesByWeek.has(key)) profilesByWeek.set(key, new Set())
    profilesByWeek.get(key)!.add(e.athlete_id)
  }

  return NextResponse.json({
    totalClaimed: totalClaimed ?? 0,
    claimsByWeek: weeklyCounts((claims ?? []).map((r) => (r as { claimed_at: string | null }).claimed_at), WEEKS, now),
    editsByWeek: weeklyCounts(edits.map((e) => e.created_at), WEEKS, now).map((b) => ({
      ...b,
      profiles: profilesByWeek.get(b.weekStart)?.size ?? 0,
    })),
  })
}
