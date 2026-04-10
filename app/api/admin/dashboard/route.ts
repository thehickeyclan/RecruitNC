import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const GUILD_API_URL = process.env.GUILD_API_URL ?? "https://www.wrestlingguild.com"
const GUILD_API_SECRET = process.env.GUILD_API_SECRET ?? ""

type Period = "today" | "this_week" | "this_month" | "this_year"

const PERIODS: readonly Period[] = ["today", "this_week", "this_month", "this_year"]

const EMPTY_GUILD_BY_TYPE = {
  "1-on-1": { count: 0, revenue: 0 },
  "2-athlete": { count: 0, revenue: 0 },
  group: { count: 0, revenue: 0 },
} as const

type GuildStatsNormalized = {
  bookingCount: number
  bookingRevenue: number
  bookingDelta: number
  bySessionType: Record<string, { count: number; revenue: number }>
  dataAvailable: boolean
  message?: string
}

async function fetchGuildStats(period: string): Promise<GuildStatsNormalized> {
  try {
    const url = `${GUILD_API_URL.replace(/\/$/, "")}/api/admin/stats?period=${encodeURIComponent(period)}`
    const res = await fetch(url, {
      headers: { "x-guild-api-secret": GUILD_API_SECRET },
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`Guild API ${res.status}`)
    const raw = (await res.json()) as Record<string, unknown>

    const byRaw = raw.bySessionType as Record<string, { count?: number; revenue?: number }> | undefined
    const bySessionType: Record<string, { count: number; revenue: number }> = {
      "1-on-1": {
        count: Number(byRaw?.["1-on-1"]?.count ?? 0),
        revenue: Number(byRaw?.["1-on-1"]?.revenue ?? 0),
      },
      "2-athlete": {
        count: Number(byRaw?.["2-athlete"]?.count ?? 0),
        revenue: Number(byRaw?.["2-athlete"]?.revenue ?? 0),
      },
      group: {
        count: Number(byRaw?.group?.count ?? 0),
        revenue: Number(byRaw?.group?.revenue ?? 0),
      },
    }

    const bookingCount = Number(raw.bookingCount ?? 0)
    const bookingRevenue = Number(raw.bookingRevenue ?? 0)
    const bookingDelta =
      typeof raw.bookingDelta === "number" && !Number.isNaN(raw.bookingDelta)
        ? raw.bookingDelta
        : 0

    return {
      bookingCount,
      bookingRevenue,
      bookingDelta,
      bySessionType,
      dataAvailable: raw.dataAvailable !== false,
      ...(typeof raw.message === "string" ? { message: raw.message } : {}),
    }
  } catch (e) {
    console.error("[dashboard] Guild fetch failed:", e)
    return {
      bookingCount: 0,
      bookingRevenue: 0,
      bookingDelta: 0,
      bySessionType: { ...EMPTY_GUILD_BY_TYPE },
      dataAvailable: false,
      message: "Guild data temporarily unavailable",
    }
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

function getPeriodWindows(period: Period): {
  current: { start: Date; end: Date }
  previous: { start: Date; end: Date }
} {
  const now = new Date()
  const tod = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

  switch (period) {
    case "today": {
      const start = tod(now)
      const prev = new Date(start)
      prev.setUTCDate(prev.getUTCDate() - 1)
      return {
        current: { start, end: now },
        previous: { start: prev, end: start },
      }
    }
    case "this_week": {
      const day = now.getUTCDay()
      const monday = tod(now)
      monday.setUTCDate(monday.getUTCDate() - ((day + 6) % 7))
      const prevMonday = new Date(monday)
      prevMonday.setUTCDate(prevMonday.getUTCDate() - 7)
      return {
        current: { start: monday, end: now },
        previous: { start: prevMonday, end: monday },
      }
    }
    case "this_month": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      const prevStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
      return {
        current: { start, end: now },
        previous: { start: prevStart, end: start },
      }
    }
    case "this_year": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
      const prevStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1))
      const prevEnd = new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 31, 23, 59, 59))
      return {
        current: { start, end: now },
        previous: { start: prevStart, end: prevEnd },
      }
    }
  }
}

function delta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const raw = searchParams.get("period") ?? "this_week"
  const period = (PERIODS.includes(raw as Period) ? raw : "this_week") as Period
  const { current, previous } = getPeriodWindows(period)

  const supabase = createAdminClient()

  const guildStats = await fetchGuildStats(period)

  // ── BLUE ──────────────────────────────────────────────────────────────
  const { data: blueActive } = await supabase
    .from("blue_memberships")
    .select("id, status, created_at")
    .in("status", ["active", "paused"])

  const allBlue = blueActive ?? []
  const subscribers = allBlue.length
  const MRR_PER_SEAT = 55

  // Subscribers at end of previous period
  const prevSubscribers = allBlue.filter((m) => new Date(m.created_at) < previous.end).length

  const mrr = subscribers * MRR_PER_SEAT
  const prevMrr = prevSubscribers * MRR_PER_SEAT

  // New subs in current period
  const newThisPeriod = allBlue.filter(
    (m) => new Date(m.created_at) >= current.start && new Date(m.created_at) <= current.end,
  ).length

  const newPrevPeriod = allBlue.filter(
    (m) => new Date(m.created_at) >= previous.start && new Date(m.created_at) < previous.end,
  ).length

  // ── STORE ─────────────────────────────────────────────────────────────
  const { data: storeCurrent } = await supabase
    .from("orders")
    .select("id, total")
    .or("channel.eq.store,channel.is.null")
    .not("shipping_method->>name", "eq", "National team event")
    .not("shipping_method->>name", "eq", "Practice Drop-in")
    .not("shipping_method->>name", "eq", "Blue membership")
    .gte("created_at", current.start.toISOString())
    .lte("created_at", current.end.toISOString())

  const { data: storePrevious } = await supabase
    .from("orders")
    .select("id, total")
    .or("channel.eq.store,channel.is.null")
    .not("shipping_method->>name", "eq", "National team event")
    .not("shipping_method->>name", "eq", "Practice Drop-in")
    .not("shipping_method->>name", "eq", "Blue membership")
    .gte("created_at", previous.start.toISOString())
    .lte("created_at", previous.end.toISOString())

  const storeOrders = storeCurrent ?? []
  const storePrev = storePrevious ?? []

  const orderCount = storeOrders.length
  const orderRevenue = storeOrders.reduce((s, r) => s + Number(r.total ?? 0), 0)
  const prevOrderRevenue = storePrev.reduce((s, r) => s + Number(r.total ?? 0), 0)

  // ── DROP-IN ───────────────────────────────────────────────────────────
  const { data: dropInCurrent } = await supabase
    .from("drop_in_requests")
    .select("id, payment_amount_cents")
    .eq("payment_status", "paid")
    .gte("created_at", current.start.toISOString())
    .lte("created_at", current.end.toISOString())

  const { data: dropInPrevious } = await supabase
    .from("drop_in_requests")
    .select("id, payment_amount_cents")
    .eq("payment_status", "paid")
    .gte("created_at", previous.start.toISOString())
    .lte("created_at", previous.end.toISOString())

  const dropIns = dropInCurrent ?? []
  const dropInPrev = dropInPrevious ?? []
  const dropInCount = dropIns.length
  const dropInRevenue = dropIns.reduce((s, r) => s + (r.payment_amount_cents ?? 0) / 100, 0)
  const prevDropInRevenue = dropInPrev.reduce((s, r) => s + (r.payment_amount_cents ?? 0) / 100, 0)

  // ── SPARTAN ───────────────────────────────────────────────────────────
  const { data: spartanCurrent } = await supabase
    .from("spartan_donations")
    .select("id, amount_cents, athlete_code, athlete_display_name, donor_email")
    .eq("status", "paid")
    .gte("created_at", current.start.toISOString())
    .lte("created_at", current.end.toISOString())

  const { data: spartanPrevious } = await supabase
    .from("spartan_donations")
    .select("id, amount_cents, donor_email")
    .eq("status", "paid")
    .gte("created_at", previous.start.toISOString())
    .lte("created_at", previous.end.toISOString())

  const spartanRows = spartanCurrent ?? []
  const spartanPrev = spartanPrevious ?? []

  const spartanTotal = spartanRows.reduce((s, r) => s + (r.amount_cents ?? 0) / 100, 0)
  const prevSpartanTotal = spartanPrev.reduce((s, r) => s + (r.amount_cents ?? 0) / 100, 0)
  const spartanDonorCount = new Set(spartanRows.map((r) => r.donor_email).filter(Boolean)).size

  const byAthlete: Record<string, { name: string; total: number }> = {}
  spartanRows.forEach((r) => {
    const key = r.athlete_code || "__general__"
    const name = r.athlete_code ? r.athlete_display_name || r.athlete_code : "General Fund"
    if (!byAthlete[key]) byAthlete[key] = { name, total: 0 }
    byAthlete[key].total += (r.amount_cents ?? 0) / 100
  })
  const spartanByAthlete = Object.values(byAthlete).sort((a, b) => b.total - a.total)

  return NextResponse.json({
    period,
    blue: {
      mrr,
      mrrDelta: delta(mrr, prevMrr),
      subscribers,
      subscribersDelta: subscribers - prevSubscribers,
      newThisPeriod,
      newPrevPeriod,
    },
    guild: {
      bookingCount: guildStats.bookingCount,
      bookingRevenue: guildStats.bookingRevenue,
      bookingDelta: guildStats.bookingDelta,
      bySessionType: guildStats.bySessionType,
      dataAvailable: guildStats.dataAvailable,
      ...(guildStats.message ? { message: guildStats.message } : {}),
    },
    store: {
      orderCount,
      orderRevenue,
      orderDelta: delta(orderRevenue, prevOrderRevenue),
    },
    dropIn: {
      count: dropInCount,
      revenue: dropInRevenue,
      revenueDelta: delta(dropInRevenue, prevDropInRevenue),
    },
    spartan: {
      total: spartanTotal,
      totalDelta: delta(spartanTotal, prevSpartanTotal),
      donorCount: spartanDonorCount,
      byAthlete: spartanByAthlete,
    },
  })
}
