import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const GUILD_API_URL = (process.env.GUILD_API_URL ?? "").trim().replace(/\/$/, "")
const GUILD_API_STATS_PATH = (process.env.GUILD_API_STATS_PATH ?? "api/admin/stats").replace(/^\/+/, "").replace(/\/+$/, "")
const GUILD_API_SECRET = process.env.GUILD_API_SECRET ?? ""

const STORE_API_URL = (process.env.STORE_API_URL ?? "").trim().replace(/\/$/, "")
const STORE_API_STATS_PATH = (process.env.STORE_API_STATS_PATH ?? "api/admin/stats").replace(/^\/+/, "").replace(/\/+$/, "")
const STORE_API_SECRET = process.env.STORE_API_SECRET ?? ""

type Period = "today" | "this_week" | "this_month" | "this_year"

const PERIODS: readonly Period[] = ["today", "this_week", "this_month", "this_year"]

function getPeriodWindows(period: Period): { start: Date; end: Date } {
  const now = new Date()
  const tod = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

  switch (period) {
    case "today":
      return { start: tod(now), end: now }
    case "this_week": {
      const day = now.getUTCDay()
      const monday = tod(now)
      monday.setUTCDate(monday.getUTCDate() - ((day + 6) % 7))
      return { start: monday, end: now }
    }
    case "this_month":
      return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), end: now }
    case "this_year":
      return { start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), end: now }
  }
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

async function fetchGuildRevenue(period: string) {
  if (!GUILD_API_URL) {
    return { bookingCount: 0, bookingRevenue: 0, bySessionType: {} as Record<string, unknown>, dataAvailable: false }
  }
  try {
    const url = `${GUILD_API_URL}/${GUILD_API_STATS_PATH}?period=${encodeURIComponent(period)}`
    const headers: HeadersInit = { ...(GUILD_API_SECRET ? { "x-guild-api-secret": GUILD_API_SECRET } : {}) }
    const res = await fetch(url, { headers, cache: "no-store" })
    if (!res.ok) throw new Error(`Guild API ${res.status}`)
    return await res.json()
  } catch {
    return { bookingCount: 0, bookingRevenue: 0, bySessionType: {}, dataAvailable: false }
  }
}

async function fetchStoreRevenue(period: string) {
  if (!STORE_API_URL) {
    return { orderCount: 0, orderRevenue: 0, dataAvailable: false }
  }
  try {
    const url = `${STORE_API_URL}/${STORE_API_STATS_PATH}?period=${encodeURIComponent(period)}`
    const headers: HeadersInit = { ...(STORE_API_SECRET ? { "x-store-api-secret": STORE_API_SECRET } : {}) }
    const res = await fetch(url, { headers, cache: "no-store" })
    if (!res.ok) throw new Error(`Store API ${res.status}`)
    return await res.json()
  } catch {
    return { orderCount: 0, orderRevenue: 0, dataAvailable: false }
  }
}

async function fetchStoreProducts(period: string) {
  if (!STORE_API_URL) return []
  try {
    const url = `${STORE_API_URL}/${STORE_API_STATS_PATH}/products?period=${encodeURIComponent(period)}`
    const headers: HeadersInit = { ...(STORE_API_SECRET ? { "x-store-api-secret": STORE_API_SECRET } : {}) }
    const res = await fetch(url, { headers, cache: "no-store" })
    if (!res.ok) return []
    const data = (await res.json()) as { products?: unknown[] }
    return data.products ?? []
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get("period") ?? "this_month"
  const period = (PERIODS.includes(raw as Period) ? raw : "this_month") as Period
  const { start, end } = getPeriodWindows(period)

  const [guildData, storeData, storeProducts] = await Promise.all([
    fetchGuildRevenue(period),
    fetchStoreRevenue(period),
    fetchStoreProducts(period),
  ])

  // Blue: new memberships in window × flat seat rate (same convention as admin dashboard aggregates).
  const { data: blueData } = await supabase
    .from("blue_memberships")
    .select("id, status, created_at")
    .in("status", ["active", "paused"])

  const allBlue = blueData ?? []
  const newThisPeriod = allBlue.filter((m) => new Date(m.created_at) >= start && new Date(m.created_at) <= end)
  const MRR_PER_SEAT = 55
  const blueRevenue = newThisPeriod.length * MRR_PER_SEAT

  const { data: dropInData } = await supabase
    .from("drop_in_requests")
    .select("id, payment_amount_cents")
    .eq("payment_status", "paid")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())

  const dropIns = dropInData ?? []
  const dropInRevenue = dropIns.reduce((s, r) => s + (r.payment_amount_cents ?? 0) / 100, 0)

  const { data: spartanData } = await supabase
    .from("spartan_donations")
    .select("id, amount_cents, athlete_code, athlete_display_name")
    .eq("status", "paid")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())

  const spartanRows = spartanData ?? []
  const spartanTotal = spartanRows.reduce((s, r) => s + (r.amount_cents ?? 0) / 100, 0)

  const spartanByAthlete: Record<string, { name: string; total: number }> = {}
  spartanRows.forEach((r) => {
    const key = r.athlete_code || "__general__"
    const name = r.athlete_code ? r.athlete_display_name || r.athlete_code : "General Fund"
    if (!spartanByAthlete[key]) spartanByAthlete[key] = { name, total: 0 }
    spartanByAthlete[key].total += (r.amount_cents ?? 0) / 100
  })

  const bookingRevenue = Number(guildData.bookingRevenue ?? 0)
  const orderRevenue = Number(storeData.orderRevenue ?? 0)
  const orderCount = Number(storeData.orderCount ?? 0)

  const grandTotal = blueRevenue + bookingRevenue + orderRevenue + dropInRevenue + spartanTotal

  return NextResponse.json({
    period,
    grandTotal,
    blue: {
      total: blueRevenue,
      newMembers: newThisPeriod.length,
      totalActive: allBlue.length,
    },
    guild: {
      total: bookingRevenue,
      count: Number(guildData.bookingCount ?? 0),
      bySessionType: guildData.bySessionType ?? {},
      dataAvailable: guildData.dataAvailable !== false,
    },
    store: {
      total: orderRevenue,
      count: orderCount,
      products: storeProducts,
      dataAvailable: storeData.dataAvailable !== false,
    },
    dropIn: {
      total: dropInRevenue,
      count: dropIns.length,
    },
    spartan: {
      total: spartanTotal,
      byAthlete: Object.values(spartanByAthlete).sort((a, b) => b.total - a.total),
    },
  })
}
