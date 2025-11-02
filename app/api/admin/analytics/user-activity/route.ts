import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"

// Helper to paginate through all users via Admin API
async function listAllUsers() {
  const supabase = createServiceRoleClient()
  const perPage = 1000
  let page = 1
  let all: any[] = []

  // Loop until no more users returned
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data?.users ?? []
    all = all.concat(users)
    if (users.length < perPage) break
    page += 1
  }

  return all
}

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function formatYMD(d: Date) {
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10)
}

function startOfISOWeekUTC(d: Date) {
  // ISO week starts Monday: 1..7 for Mon..Sun
  const day = d.getUTCDay() || 7 // Sunday -> 7
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  start.setUTCDate(start.getUTCDate() - (day - 1))
  return start
}

function formatISOWeek(d: Date) {
  // Format YYYY-Www (approx): derive week number
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  // Thursday in current week decides the year.
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((+dt - +yearStart) / 86400000 + 1) / 7)
  const yr = dt.getUTCFullYear()
  return `${yr}-W${String(weekNo).padStart(2, "0")}`
}

function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

function formatYM(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export async function GET() {
  try {
    const users = await listAllUsers()

    const now = new Date()
    const today = startOfDayUTC(now)

    // Prepare buckets
    // Daily - last 30 days
    const dailyBuckets = Array.from({ length: 30 }).map((_, idx) => {
      const day = new Date(today)
      day.setUTCDate(today.getUTCDate() - (29 - idx))
      return formatYMD(day)
    })

    // Weekly - last 12 ISO weeks (starting Mondays)
    const currentWeekStart = startOfISOWeekUTC(now)
    const weeklyStarts: Date[] = Array.from({ length: 12 }).map((_, idx) => {
      const start = new Date(currentWeekStart)
      start.setUTCDate(currentWeekStart.getUTCDate() - (11 - idx) * 7)
      return start
    })
    const weeklyKeys = weeklyStarts.map((d) => formatISOWeek(d))

    // Monthly - last 12 months
    const currentMonthStart = startOfMonthUTC(now)
    const monthlyStarts: Date[] = Array.from({ length: 12 }).map((_, idx) => {
      const start = new Date(
        Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - (11 - idx), 1),
      )
      return start
    })
    const monthlyKeys = monthlyStarts.map((d) => formatYM(d))

    // Accumulators
    const dailySignups: Record<string, number> = Object.fromEntries(dailyBuckets.map((k) => [k, 0]))
    const dailyLogins: Record<string, number> = Object.fromEntries(dailyBuckets.map((k) => [k, 0]))
    const weeklySignups: Record<string, number> = Object.fromEntries(weeklyKeys.map((k) => [k, 0]))
    const weeklyLogins: Record<string, number> = Object.fromEntries(weeklyKeys.map((k) => [k, 0]))
    const monthlySignups: Record<string, number> = Object.fromEntries(monthlyKeys.map((k) => [k, 0]))
    const monthlyLogins: Record<string, number> = Object.fromEntries(monthlyKeys.map((k) => [k, 0]))

    const totalUsers = users.length
    let signupsToday = 0
    let loginsToday = 0
    let activeLast30Days = 0
    const usersLoggedInToday: Array<{ id: string; email: string; last_sign_in_at: string }> = []

    const last30Days = new Date(today)
    last30Days.setUTCDate(today.getUTCDate() - 29)

    for (const u of users) {
      const createdAtStr: string | null = u?.created_at ?? null
      const lastSignInStr: string | null = u?.last_sign_in_at ?? null

      // Created At
      if (createdAtStr) {
        const c = new Date(createdAtStr)
        // Daily
        const cDay = startOfDayUTC(c)
        const cKey = formatYMD(cDay)
        if (cDay >= last30Days && cKey in dailySignups) dailySignups[cKey] += 1
        if (formatYMD(cDay) === formatYMD(today)) signupsToday += 1

        // Weekly
        const cWeek = startOfISOWeekUTC(c)
        const wKey = formatISOWeek(cWeek)
        if (wKey in weeklySignups) weeklySignups[wKey] += 1

        // Monthly
        const cMonth = startOfMonthUTC(c)
        const mKey = formatYM(cMonth)
        if (mKey in monthlySignups) monthlySignups[mKey] += 1
      }

      // Last Sign In At
      if (lastSignInStr) {
        const l = new Date(lastSignInStr)

        const lDay = startOfDayUTC(l)
        const lKey = formatYMD(lDay)
        if (lDay >= last30Days && lKey in dailyLogins) dailyLogins[lKey] += 1
        if (formatYMD(lDay) === formatYMD(today)) {
          loginsToday += 1
          usersLoggedInToday.push({
            id: u.id,
            email: u.email || "",
            last_sign_in_at: lastSignInStr,
          })
        }

        const lWeek = startOfISOWeekUTC(l)
        const lwKey = formatISOWeek(lWeek)
        if (lwKey in weeklyLogins) weeklyLogins[lwKey] += 1

        const lMonth = startOfMonthUTC(l)
        const lmKey = formatYM(lMonth)
        if (lmKey in monthlyLogins) monthlyLogins[lmKey] += 1

        // Active users last 30 days
        if (lDay >= last30Days) activeLast30Days += 1
      }
    }

    // Shape response arrays for charts
    const daily = dailyBuckets.map((k) => ({
      date: k,
      signups: dailySignups[k] ?? 0,
      logins: dailyLogins[k] ?? 0,
    }))
    const weekly = weeklyKeys.map((k) => ({
      week: k,
      signups: weeklySignups[k] ?? 0,
      logins: weeklyLogins[k] ?? 0,
    }))
    const monthly = monthlyKeys.map((k) => ({
      month: k,
      signups: monthlySignups[k] ?? 0,
      logins: monthlyLogins[k] ?? 0,
    }))

    return NextResponse.json({
      success: true,
      summary: {
        totalUsers,
        signupsToday,
        loginsToday,
        activeLast30Days,
      },
      usersLoggedInToday,
      daily,
      weekly,
      monthly,
    })
  } catch (error: any) {
    console.error("User activity analytics error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Analytics failed" }, { status: 500 })
  }
}
