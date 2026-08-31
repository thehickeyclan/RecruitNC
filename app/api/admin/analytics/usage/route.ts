import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import {
  buildDailySeries,
  buildInsights,
  compareMonths,
  findPowerUsers,
  summariseSections,
  summariseWindows,
  type ViewRow,
} from "@/lib/admin/usage-analytics"

/**
 * How the site is actually being used, for the users dashboard.
 *
 * Reads user_analytics, which is the table the global tracker writes and the only one carrying a
 * user id — page_views exists too but every row in it is anonymous, so no question about people
 * can be answered from it.
 *
 * All of the arithmetic lives in lib/admin/usage-analytics.ts where it is tested. This fetches.
 */

export const dynamic = "force-dynamic"

const MAX_ROWS = 60_000

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  // PostgREST caps a request at 1000 rows, and there are more events than that.
  const rows: ViewRow[] = []
  for (let from = 0; from < MAX_ROWS; from += 1000) {
    const { data, error } = await admin
      .from("user_analytics")
      .select("user_id,page_url,created_at")
      .eq("event_type", "page_view")
      .order("created_at", { ascending: false })
      .range(from, from + 999)

    if (error) {
      console.error("[admin usage]", error.message)
      return NextResponse.json({ error: "Could not load usage." }, { status: 500 })
    }
    if (!data?.length) break
    for (const row of data) {
      rows.push({
        userId: row.user_id ? String(row.user_id) : null,
        path: String(row.page_url ?? "/"),
        createdAt: String(row.created_at),
      })
    }
    if (data.length < 1000) break
  }

  const now = new Date()
  const power = findPowerUsers(rows, 25)

  // Names for the power list. The ids on their own tell an admin nothing.
  const byId = new Map<string, { email: string | null; fullName: string | null }>()
  if (power.length) {
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("user_id,email,full_name")
      .in("user_id", power.map((p) => p.userId))
    for (const profile of profiles ?? []) {
      byId.set(String(profile.user_id), {
        email: profile.email ? String(profile.email) : null,
        fullName: profile.full_name ? String(profile.full_name) : null,
      })
    }
  }

  // A year of daily points is a few hundred numbers, so the whole series ships once and the
  // client switches range instantly rather than refetching for every tab.
  const earliest = rows.reduce(
    (oldest, row) => (Date.parse(row.createdAt) < Date.parse(oldest) ? row.createdAt : oldest),
    rows[0]?.createdAt ?? now.toISOString(),
  )

  return NextResponse.json({
    totalEvents: rows.length,
    daily: buildDailySeries(rows, new Date(earliest), now),
    insights: buildInsights(rows, now),
    windows: summariseWindows(rows, now),
    months: compareMonths(rows, now),
    sections: summariseSections(rows),
    powerUsers: power.map((user) => ({
      ...user,
      name: byId.get(user.userId)?.fullName ?? byId.get(user.userId)?.email ?? "Unknown",
      email: byId.get(user.userId)?.email ?? null,
    })),
  })
}
