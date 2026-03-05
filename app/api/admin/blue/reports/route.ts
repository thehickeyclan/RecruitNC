import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const MONTHS_BACK = 24
const BLUE_PRICE = 55

/** ISO week key e.g. "2026-W14" */
function weekKey(d: Date): string {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  t.setDate(t.getDate() + 4 - (t.getDay() || 7))
  const y = t.getFullYear()
  const start = new Date(y, 0, 1)
  const week = Math.ceil((((t.getTime() - start.getTime()) / 86400000) + 1) / 7)
  return `${y}-W${String(week).padStart(2, "0")}`
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999)
}

export type BlueReportsData = {
  membershipTrend: { month: string; newCount: number; endedCount: number; activeAtEnd: number; estimatedMRR: number }[]
  currentActive: number
  currentPaused: number
  estimatedMRR: number
  byClass: { graduationYear: number; count: number; isAnticipatedChurn: boolean }[]
  anticipatedChurnCount: number
  /** Total rows in blue_signups (everyone who submitted the registration form). */
  signupTotal: number
  signupPaid: number
  signupPending: number
  /** Churn: ended (cancelled) in period. */
  churnThisMonth: number
  churnLast12Months: number
  /** New MRR from new subscriptions in period (newCount × BLUE_PRICE). */
  newMRRThisMonth: number
  newSubsThisMonth: number
  /** Signups table error if any (e.g. table missing). */
  signupsError?: string
  /** Upcoming billing: date string (YYYY-MM-DD) → { date, amountCents, count }. Next 90 days. */
  upcomingBilling: { date: string; amountCents: number; count: number }[]
  /** Expected billing by month (next 12 months): from renewal dates. */
  billingByMonth: { period: string; amount: number; count: number }[]
  /** Expected billing by week (next 26 weeks): from renewal dates. */
  billingByWeek: { period: string; amount: number; count: number }[]
  /** Per-membership next billing (for table): { membershipId, athleteName, nextBillingAt, amountCents }[]. */
  upcomingBillingRows?: { membershipId: string; athleteName: string; nextBillingAt: string; amountCents: number }[]
  /** Drop-ins from orders (practice drop-in); not MRR. Store/orders tracks all orders. */
  dropInCountThisMonth?: number
  dropInRevenueThisMonth?: number
  dropInCountLast12Months?: number
  dropInRevenueLast12Months?: number
}

/**
 * GET: Blue reports — MRR, churn, signups, class distribution.
 * MRR and all subscription metrics use only blue_memberships (Blue subs). Store/orders is the
 * source of truth for all other revenue (apparel, tournaments, etc.). Drop-ins are included
 * separately from orders and are not MRR.
 */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  type MembershipRow = { id: string; athlete_id: string; status: string; started_at: string; ended_at: string | null; created_at: string; next_billing_at?: string; stripe_subscription_id?: string | null }
  let rows: MembershipRow[] | null = null
  const { data: rowsWithBilling, error: err1 } = await admin
    .from("blue_memberships")
    .select("id, athlete_id, status, started_at, ended_at, created_at, next_billing_at, stripe_subscription_id")
    .order("created_at", { ascending: true })
  let billingColumnExists = true
  if (err1) {
    if (err1.code === "42P01") return NextResponse.json({ error: "Table blue_memberships does not exist." }, { status: 503 })
    if (err1.code === "42703") {
      billingColumnExists = false
      const { data: rowsBasic, error: err2 } = await admin
        .from("blue_memberships")
        .select("id, athlete_id, status, started_at, ended_at, created_at, stripe_subscription_id")
        .order("created_at", { ascending: true })
      if (err2) return NextResponse.json({ error: err2.message }, { status: 500 })
      rows = (rowsBasic as MembershipRow[]) ?? null
    } else {
      return NextResponse.json({ error: err1.message }, { status: 500 })
    }
  } else {
    rows = (rowsWithBilling as MembershipRow[]) ?? null
  }

  // One row per athlete (same as subscriptions list): prefer the membership with stripe_subscription_id so MRR/stats match reality
  const allRows = rows ?? []
  const byAthlete = new Map<string, MembershipRow>()
  for (const r of allRows) {
    const existing = byAthlete.get(r.athlete_id)
    const hasStripe = !!(r as MembershipRow).stripe_subscription_id
    const existingHasStripe = existing ? !!(existing as MembershipRow).stripe_subscription_id : false
    const preferThis =
      !existing ||
      (hasStripe && !existingHasStripe) ||
      (hasStripe === existingHasStripe && r.created_at > (existing?.created_at ?? ""))
    if (preferThis) byAthlete.set(r.athlete_id, r)
  }
  const dedupedRows = Array.from(byAthlete.values())

  // Signups (blue_signups): everyone who submitted the registration form
  let signupTotal = 0
  let signupPaid = 0
  let signupPending = 0
  let signupsError: string | undefined
  const { data: signupRows, error: signupErr } = await admin.from("blue_signups").select("id, status")
  if (signupErr) {
    if (signupErr.code === "42P01") signupsError = "Table blue_signups does not exist."
    else signupsError = signupErr.message
  } else if (signupRows && Array.isArray(signupRows)) {
    signupTotal = signupRows.length
    signupPaid = signupRows.filter((r) => (r as { status?: string }).status === "paid").length
    signupPending = signupTotal - signupPaid
  }

  const now = new Date()
  const currentYear = now.getFullYear()

  // Build last N months
  const months: { year: number; month: number; key: string }[] = []
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth(), key: monthKey(d) })
  }

  const trend = months.map(({ year, month, key }) => {
    const endDate = endOfMonth(year, month + 1)
    const newCount = dedupedRows.filter((r) => {
      const created = new Date(r.created_at)
      return created.getFullYear() === year && created.getMonth() === month
    }).length
    const endedCount = dedupedRows.filter((r) => {
      const ended = r.ended_at ? new Date(r.ended_at) : null
      return ended && ended.getFullYear() === year && ended.getMonth() === month
    }).length
    const activeAtEnd = dedupedRows.filter((r) => {
      const started = new Date(r.started_at)
      const ended = r.ended_at ? new Date(r.ended_at) : null
      return started <= endDate && (!ended || ended > endDate)
    }).length
    return {
      month: key,
      newCount,
      endedCount,
      activeAtEnd,
      estimatedMRR: activeAtEnd * BLUE_PRICE,
    }
  })

  const activeRows = dedupedRows.filter((r) => r.status === "active")
  const pausedRows = dedupedRows.filter((r) => r.status === "paused")
  const currentActive = activeRows.length
  const currentPaused = pausedRows.length
  const estimatedMRR = (currentActive + currentPaused) * BLUE_PRICE

  // By class (graduation year) for active + paused
  const athleteIds = [...new Set([...activeRows, ...pausedRows].map((r) => r.athlete_id))]
  let byClass: { graduationYear: number; count: number; isAnticipatedChurn: boolean }[] = []
  if (athleteIds.length > 0) {
    const { data: athletes } = await admin
      .from("athletes")
      .select("id, graduationyear")
      .in("id", athleteIds)
    const gradMap = (athletes ?? []).reduce(
      (acc, a) => {
        const id = String(a.id)
        const y = Number((a as { graduationyear?: number }).graduationyear)
        acc[id] = Number.isFinite(y) ? y : 0
        return acc
      },
      {} as Record<string, number>
    )
    const classCounts: Record<number, number> = {}
    for (const r of [...activeRows, ...pausedRows]) {
      const y = gradMap[r.athlete_id] || 0
      if (y >= currentYear) classCounts[y] = (classCounts[y] ?? 0) + 1
    }
    const years = Object.keys(classCounts)
      .map(Number)
      .filter((y) => y >= currentYear)
      .sort((a, b) => a - b)
    byClass = years.map((graduationYear) => ({
      graduationYear,
      count: classCounts[graduationYear] ?? 0,
      isAnticipatedChurn: graduationYear === currentYear,
    }))
  }

  const anticipatedChurnCount = byClass.find((c) => c.graduationYear === currentYear)?.count ?? 0

  // Current month = last bucket in trend (we built months from oldest to newest)
  const currentMonthTrend = trend[trend.length - 1]
  const last12Trends = trend.slice(-12)
  const churnThisMonth = currentMonthTrend?.endedCount ?? 0
  const churnLast12Months = last12Trends.reduce((s, t) => s + t.endedCount, 0)
  const newSubsThisMonth = currentMonthTrend?.newCount ?? 0
  const newMRRThisMonth = newSubsThisMonth * BLUE_PRICE

  // Projected MRR: bucket each member's renewal (next_billing_at) by week and by month
  const billingRows = dedupedRows.filter(
    (r) => (r.status === "active" || r.status === "paused") && (r as { next_billing_at?: string }).next_billing_at
  ) as Array<{ id: string; athlete_id: string; next_billing_at: string }>
  const dayBuckets: Record<string, number> = {}
  const weekBuckets: Record<string, number> = {}
  const monthBuckets: Record<string, number> = {}
  const ninetyDaysOut = new Date(now)
  ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90)
  for (const r of billingRows) {
    const d = new Date(r.next_billing_at)
    if (d < now) continue
    const dateKey = r.next_billing_at.slice(0, 10)
    if (d <= ninetyDaysOut) {
      dayBuckets[dateKey] = (dayBuckets[dateKey] ?? 0) + 1
    }
    const wk = weekKey(d)
    weekBuckets[wk] = (weekBuckets[wk] ?? 0) + 1
    const monthKeyB = monthKey(d)
    monthBuckets[monthKeyB] = (monthBuckets[monthKeyB] ?? 0) + 1
  }
  const upcomingBilling = Object.entries(dayBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, amountCents: count * BLUE_PRICE * 100, count }))
  const next12Months: { key: string }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    next12Months.push({ key: monthKey(d) })
  }
  const billingByMonth = next12Months.map(({ key }) => ({
    period: key,
    amount: (monthBuckets[key] ?? 0) * BLUE_PRICE,
    count: monthBuckets[key] ?? 0,
  }))
  const next26Weeks: { key: string }[] = []
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  for (let i = 0; i < 26; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i * 7)
    next26Weeks.push({ key: weekKey(d) })
  }
  const billingByWeek = next26Weeks.map(({ key }) => ({
    period: key,
    amount: (weekBuckets[key] ?? 0) * BLUE_PRICE,
    count: weekBuckets[key] ?? 0,
  }))

  let upcomingBillingRows: { membershipId: string; athleteName: string; nextBillingAt: string; amountCents: number }[] = []
  if (billingRows.length > 0) {
    const bAthleteIds = [...new Set(billingRows.map((r) => r.athlete_id))]
    const { data: bAthletes } = await admin.from("athletes").select("id, name, firstname, lastname, firstName, lastName").in("id", bAthleteIds)
    const nameMap = (bAthletes ?? []).reduce(
      (acc, a) => {
        const row = a as Record<string, unknown>
        const id = String(row.id)
        const name = String(row.name ?? "").trim()
          || [row.firstname ?? row.firstName, row.lastname ?? row.lastName].filter(Boolean).join(" ").trim()
        acc[id] = name || "—"
        return acc
      },
      {} as Record<string, string>
    )
    upcomingBillingRows = billingRows
      .filter((r) => new Date(r.next_billing_at) >= now)
      .sort((a, b) => a.next_billing_at.localeCompare(b.next_billing_at))
      .slice(0, 60)
      .map((r) => ({
        membershipId: r.id,
        athleteName: nameMap[r.athlete_id] ?? "—",
        nextBillingAt: r.next_billing_at,
        amountCents: BLUE_PRICE * 100,
      }))
  }

  // Drop-ins: from orders only (practice drop-in). Not MRR; store/orders is source for all orders.
  let dropInCountThisMonth = 0
  let dropInRevenueThisMonth = 0
  let dropInCountLast12Months = 0
  let dropInRevenueLast12Months = 0
  const { data: orderRows } = await admin
    .from("orders")
    .select("id, total, created_at, shipping_method")
    .eq("status", "paid")
  if (orderRows && Array.isArray(orderRows)) {
    const twelveMonthsAgo = new Date(now)
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    for (const o of orderRows) {
      const method = (o as { shipping_method?: { name?: string } }).shipping_method
      const name = (method?.name ?? "").toString().toLowerCase()
      if (!name.includes("practice") && !name.includes("drop-in")) continue
      const created = new Date((o as { created_at: string }).created_at)
      const total = Number((o as { total?: number }).total ?? 0)
      if (created >= twelveMonthsAgo) {
        dropInCountLast12Months += 1
        dropInRevenueLast12Months += total
      }
      if (created >= thisMonthStart) {
        dropInCountThisMonth += 1
        dropInRevenueThisMonth += total
      }
    }
  }

  const data: BlueReportsData = {
    membershipTrend: trend,
    currentActive,
    currentPaused,
    estimatedMRR,
    byClass,
    anticipatedChurnCount,
    signupTotal,
    signupPaid,
    signupPending,
    churnThisMonth,
    churnLast12Months,
    newMRRThisMonth,
    newSubsThisMonth,
    upcomingBilling,
    billingByMonth,
    billingByWeek,
    ...(upcomingBillingRows.length > 0 && { upcomingBillingRows }),
    ...(signupsError && { signupsError }),
    dropInCountThisMonth,
    dropInRevenueThisMonth,
    dropInCountLast12Months,
    dropInRevenueLast12Months,
  }

  return NextResponse.json(data)
}
