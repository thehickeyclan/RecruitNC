import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe, readStripeSecretKey } from "@/lib/stripe"
import {
  buildCohortRetention,
  buildSeniorChurnByMonth,
  dollarsFromCents,
  fetchStripeMrrCentsBySubscriptionId,
} from "@/lib/blue-reports-stripe-mrr"
import { sumWiqStandardMrrCents } from "@/lib/blue-billing-rates"
import { fetchBlueStripeSubscriptionStats } from "@/lib/blue-stripe-subscription-stats"

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
  currentCancelled: number
  /** Ending at period end (still active in Stripe until date). */
  currentCanceling?: number
  /** Total Blue Program subscriptions in Stripe (all statuses). */
  stripeRecruitncTotal?: number
  /** Tile counts pulled live from Stripe, not DB. */
  recruitncCountsFromStripe?: boolean
  /** Internal test subscriptions excluded from Stripe totals. */
  stripeTestAccountsExcluded?: number
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
  /** Sum of Stripe subscription monthly amounts (promo-aware). */
  stripeMRR?: number
  /** estimatedMRR minus senior churn in next 12 months (June graduations). */
  projectedMRRAfterSeniorChurn?: number
  seniorChurnByMonth?: { month: string; count: number; mrrImpact: number }[]
  cohortRetention?: { signupMonth: string; started: number; stillActive: number }[]
  pendingPaymentCount?: number
  failedPaymentMembers?: { membershipId: string; athleteName: string; payerEmail: string | null }[]
  paidSignupsMissingMembership?: number
  /** WrestlingIQ external registry (billing stays in WIQ). */
  wiqBillable?: number
  wiqActive?: number
  wiqPaused?: number
  wiqEstimatedMrr?: number
  /** WIQ MRR at $50/mo standard (ignores $51 fee line; keeps promos/comps). */
  wiqStandardMrr?: number
  wiqMissingFromReport?: number
  wiqLastImportAt?: string | null
  /** RecruitNC active + WIQ billable. */
  combinedBillable?: number
  /** RecruitNC still billable (active + paused + ending at period end). */
  recruitncBillable?: number
  /** Stripe MRR + WIQ standard MRR. */
  combinedStandardMrr?: number
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

  type MembershipRow = { id: string; athlete_id: string; payer_user_id?: string; status: string; started_at: string; ended_at: string | null; created_at: string; next_billing_at?: string; stripe_subscription_id?: string | null }
  let rows: MembershipRow[] | null = null
  const { data: rowsWithBilling, error: err1 } = await admin
    .from("blue_memberships")
    .select("id, athlete_id, payer_user_id, status, started_at, ended_at, created_at, next_billing_at, stripe_subscription_id")
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
  const hasStripeSub = (r: MembershipRow) => !!(r.stripe_subscription_id && String(r.stripe_subscription_id).trim())
  const dedupedWithStripe = dedupedRows.filter(hasStripeSub)

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
    const newCount = dedupedWithStripe.filter((r) => {
      const created = new Date(r.created_at)
      return created.getFullYear() === year && created.getMonth() === month
    }).length
    const endedCount = dedupedWithStripe.filter((r) => {
      const ended = r.ended_at ? new Date(r.ended_at) : null
      return ended && ended.getFullYear() === year && ended.getMonth() === month
    }).length
    const activeAtEnd = dedupedWithStripe.filter((r) => {
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

  // Only count rows with a live Stripe subscription for MRR and active count (excludes orphan/duplicate rows)
  const activeRows = dedupedRows.filter((r) => r.status === "active" && hasStripeSub(r))
  const pausedRows = dedupedRows.filter((r) => r.status === "paused" && hasStripeSub(r))
  const cancelledRows = dedupedRows.filter(
    (r) => (r.status === "cancelled" || r.status === "alumni") && hasStripeSub(r),
  )
  let currentActive = activeRows.length
  let currentPaused = pausedRows.length
  let currentCancelled = cancelledRows.length
  let currentCanceling: number | undefined
  let stripeRecruitncTotal: number | undefined
  let stripeTestAccountsExcluded: number | undefined
  let recruitncBillable = activeRows.length + pausedRows.length
  let recruitncCountsFromStripe = false
  let estimatedMRR = (currentActive + currentPaused) * BLUE_PRICE

  // By class (graduation year) for active + paused (same: only with Stripe sub)
  const athleteIds = [...new Set([...activeRows, ...pausedRows].map((r) => r.athlete_id))]
  let byClass: { graduationYear: number; count: number; isAnticipatedChurn: boolean }[] = []
  const gradMap: Record<string, number> = {}
  if (athleteIds.length > 0) {
    const { data: athletes } = await admin
      .from("athletes")
      .select("id, graduationyear")
      .in("id", athleteIds)
    for (const a of athletes ?? []) {
      const id = String(a.id)
      const y = Number((a as { graduationyear?: number }).graduationyear)
      gradMap[id] = Number.isFinite(y) ? y : 0
    }
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
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const newSubsThisMonth = dedupedRows.filter(
    (r) => hasStripeSub(r) && new Date(r.created_at) >= thisMonthStart
  ).length
  const newMRRThisMonth = newSubsThisMonth * BLUE_PRICE

  // Projected MRR: bucket each member's renewal (next_billing_at) by week and by month (only with Stripe sub)
  const billingRows = dedupedRows.filter(
    (r) =>
      hasStripeSub(r) &&
      (r.status === "active" || r.status === "paused") &&
      (r as { next_billing_at?: string }).next_billing_at
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
    const bAthleteIds = [...new Set(billingRows.map((r) => r.athlete_id).filter(Boolean))]
    const { data: bAthletes } =
      bAthleteIds.length > 0
        ? await admin.from("athletes").select("id, name, firstName, lastName, graduationyear, highschool").in("id", bAthleteIds)
        : { data: [] }
    const nameMap = (bAthletes ?? []).reduce(
      (acc, a) => {
        const row = a as Record<string, unknown>
        const id = String(row.id ?? "").toLowerCase()
        const name =
          String(row.name ?? "").trim() ||
          [row.firstName ?? row.firstname, row.lastName ?? row.lastname]
            .filter(Boolean)
            .map(String)
            .join(" ")
            .trim()
        acc[id] = name || `Athlete …${id.slice(-6)}`
        return acc
      },
      {} as Record<string, string>
    )
    const needName = bAthleteIds.filter((id) => (nameMap[String(id).toLowerCase()] ?? "").startsWith("Athlete …"))
    if (needName.length > 0) {
      const { data: signups } = await admin
        .from("blue_signups")
        .select("athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school")
        .order("created_at", { ascending: false })
      const athletesNeedingName = (bAthletes ?? []).filter((a) => {
        const id = String((a as { id?: string }).id ?? "").toLowerCase()
        return needName.includes(id) || needName.includes((a as { id?: string }).id)
      }) as Array<{ id: string; graduationyear?: number | null; highschool?: string | null }>
      const norm = (s: string) => (s ?? "").toString().trim().toLowerCase()
      for (const ath of athletesNeedingName) {
        const aid = String(ath.id ?? "").toLowerCase()
        const grad = ath.graduationyear != null ? Number(ath.graduationyear) : null
        const school = norm(ath.highschool ?? "")
        const matches = (signups ?? []).filter(
          (s) =>
            (grad == null || Number((s as { athlete_graduation_year?: number }).athlete_graduation_year) === grad) &&
            (!school || norm((s as { athlete_high_school?: string }).athlete_high_school ?? "") === school)
        ) as Array<{ athlete_first_name?: string; athlete_last_name?: string }>
        const match = matches[0]
        if (match && ((match.athlete_first_name ?? "").trim() || (match.athlete_last_name ?? "").trim())) {
          const first = (match.athlete_first_name ?? "").trim()
          const last = (match.athlete_last_name ?? "").trim()
          const full = [first, last].filter(Boolean).join(" ").trim()
          if (full) {
            nameMap[aid] = full
            await admin
              .from("athletes")
              .update({ name: full, firstName: first || null, lastName: last || null } as Record<string, unknown>)
              .eq("id", ath.id)
          }
        }
      }
    }
    upcomingBillingRows = billingRows
      .filter((r) => new Date(r.next_billing_at) >= now)
      .sort((a, b) => a.next_billing_at.localeCompare(b.next_billing_at))
      .slice(0, 60)
      .map((r) => ({
        membershipId: r.id,
        athleteName: nameMap[String(r.athlete_id ?? "").toLowerCase()] ?? nameMap[r.athlete_id] ?? "—",
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
    currentCancelled,
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

  const pendingPaymentCount = dedupedRows.filter((r) => r.status === "pending_payment" && hasStripeSub(r)).length

  let pendingFromStripe = pendingPaymentCount

  let paidSignupsMissingMembership = 0
  if (!signupsError && signupPaid > 0) {
    const { data: paidSignups } = await admin.from("blue_signups").select("id").eq("status", "paid")
    const paidIds = (paidSignups ?? []).map((s) => (s as { id: string }).id)
    if (paidIds.length > 0) {
      const { data: linked } = await admin.from("blue_memberships").select("signup_id").in("signup_id", paidIds)
      const linkedSet = new Set((linked ?? []).map((r) => (r as { signup_id?: string }).signup_id).filter(Boolean))
      paidSignupsMissingMembership = paidIds.filter((id) => !linkedSet.has(id)).length
    }
  }

  const stripeSubIds = dedupedWithStripe
    .filter((r) => r.status === "active" || r.status === "paused")
    .map((r) => r.stripe_subscription_id as string)
    .filter(Boolean)

  let stripeMRR: number | undefined
  let seniorChurnByMonth: BlueReportsData["seniorChurnByMonth"]
  let projectedMRRAfterSeniorChurn: number | undefined
  let cohortRetention: BlueReportsData["cohortRetention"]
  const failedPaymentMembers: NonNullable<BlueReportsData["failedPaymentMembers"]> = []

  const stripeSecret = readStripeSecretKey()
  if (stripeSecret) {
    try {
      const stripe = getStripe()
      const stripeStats = await fetchBlueStripeSubscriptionStats(stripe, process.env.STRIPE_BLUE_PRICE_ID)
      currentActive = stripeStats.active
      currentPaused = stripeStats.paused
      currentCanceling = stripeStats.cancelingAtPeriodEnd
      currentCancelled = stripeStats.cancelled + stripeStats.cancelingAtPeriodEnd
      stripeRecruitncTotal = stripeStats.total
      stripeTestAccountsExcluded = stripeStats.excludedTestAccounts
      recruitncBillable =
        stripeStats.active + stripeStats.paused + stripeStats.cancelingAtPeriodEnd
      pendingFromStripe = stripeStats.pastDue
      recruitncCountsFromStripe = true
      stripeMRR = dollarsFromCents(stripeStats.mrrCents)
      estimatedMRR = stripeMRR

      const seniorMembers: Array<{ athleteId: string; gradYear: number; monthlyCents: number }> = []
      for (const r of dedupedWithStripe) {
        if (r.status !== "active" && r.status !== "paused") continue
        const subId = r.stripe_subscription_id as string
        const gy = gradMap[r.athlete_id] || 0
        if (gy >= currentYear) {
          seniorMembers.push({ athleteId: r.athlete_id, gradYear: gy, monthlyCents: BLUE_PRICE * 100 })
        }
      }
      seniorChurnByMonth = buildSeniorChurnByMonth(seniorMembers)
      const next12SeniorLoss = (seniorChurnByMonth ?? [])
        .filter((b) => b.month >= monthKey(now))
        .slice(0, 12)
        .reduce((s, b) => s + b.mrrImpact, 0)
      projectedMRRAfterSeniorChurn = Math.max(0, Math.round((stripeMRR - next12SeniorLoss) * 100) / 100)
      cohortRetention = buildCohortRetention(dedupedWithStripe)
    } catch (e) {
      console.warn("[blue/reports] Stripe subscription stats:", e)
    }
  }

  if (stripeSecret && stripeSubIds.length > 0 && stripeMRR === undefined) {
    try {
      const stripe = getStripe()
      const centsMap = await fetchStripeMrrCentsBySubscriptionId(stripe, stripeSubIds)
      let totalCents = 0
      const seniorMembers: Array<{ athleteId: string; gradYear: number; monthlyCents: number }> = []

      for (const r of dedupedWithStripe) {
        if (r.status !== "active" && r.status !== "paused") continue
        const subId = r.stripe_subscription_id as string
        const cents = centsMap.get(subId) ?? BLUE_PRICE * 100
        totalCents += cents
        const gy = gradMap[r.athlete_id] || 0
        if (gy >= currentYear) {
          seniorMembers.push({ athleteId: r.athlete_id, gradYear: gy, monthlyCents: cents })
        }
      }
      stripeMRR = dollarsFromCents(totalCents)
      estimatedMRR = stripeMRR
      seniorChurnByMonth = buildSeniorChurnByMonth(seniorMembers)
      const next12SeniorLoss = (seniorChurnByMonth ?? [])
        .filter((b) => b.month >= monthKey(now))
        .slice(0, 12)
        .reduce((s, b) => s + b.mrrImpact, 0)
      projectedMRRAfterSeniorChurn = Math.max(0, Math.round((stripeMRR - next12SeniorLoss) * 100) / 100)
      cohortRetention = buildCohortRetention(dedupedWithStripe)
    } catch (e) {
      console.warn("[blue/reports] Stripe MRR:", e)
    }
  }

  const pendingPaymentCountFinal = recruitncCountsFromStripe ? pendingFromStripe : pendingPaymentCount

  if (pendingPaymentCountFinal > 0) {
    const pendingRows = dedupedRows.filter((r) => r.status === "pending_payment")
    const pAthleteIds = pendingRows.map((r) => r.athlete_id)
    const { data: pAthletes } =
      pAthleteIds.length > 0 ? await admin.from("athletes").select("id, name").in("id", pAthleteIds) : { data: [] }
    const pNameMap = (pAthletes ?? []).reduce(
      (acc, a) => {
        acc[String((a as { id: string }).id)] = String((a as { name?: string }).name ?? "Member")
        return acc
      },
      {} as Record<string, string>,
    )
    const payerIds = [...new Set(pendingRows.map((r) => r.payer_user_id).filter(Boolean))]
    const { data: payers } =
      payerIds.length > 0 ? await admin.from("user_profiles").select("user_id, email").in("user_id", payerIds) : { data: [] }
    const payerEmailMap = (payers ?? []).reduce(
      (acc, p) => {
        acc[String((p as { user_id: string }).user_id)] = (p as { email?: string }).email ?? null
        return acc
      },
      {} as Record<string, string | null>,
    )
    for (const r of pendingRows.slice(0, 20)) {
      failedPaymentMembers.push({
        membershipId: r.id,
        athleteName: pNameMap[r.athlete_id] ?? "Member",
        payerEmail: payerEmailMap[r.payer_user_id ?? ""] ?? null,
      })
    }
  }

  let wiqBillable: number | undefined
  let wiqActive: number | undefined
  let wiqPaused: number | undefined
  let wiqEstimatedMrr: number | undefined
  let wiqStandardMrr: number | undefined
  let wiqMissingFromReport: number | undefined
  let wiqLastImportAt: string | null | undefined
  const { data: wiqRows, error: wiqErr } = await admin
    .from("blue_wiq_subscriptions")
    .select("status, amount_cents, missing_from_last_import")
  if (!wiqErr && wiqRows) {
    const billable = wiqRows.filter((r) => r.status === "active" || r.status === "past_due" || r.status === "grace")
    wiqBillable = billable.length
    wiqActive = wiqRows.filter((r) => r.status === "active").length
    wiqPaused = wiqRows.filter((r) => r.status === "paused").length
    wiqEstimatedMrr = Math.round(billable.reduce((s, r) => s + (r.amount_cents ?? 0), 0)) / 100
    wiqStandardMrr = Math.round(sumWiqStandardMrrCents(billable)) / 100
    wiqMissingFromReport = wiqRows.filter((r) => r.missing_from_last_import).length
    const { data: lastWiqImport } = await admin
      .from("blue_wiq_import_runs")
      .select("imported_at")
      .order("imported_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    wiqLastImportAt = lastWiqImport?.imported_at ?? null
  }

  const stripeMrrForCombined = stripeMRR ?? estimatedMRR ?? 0
  const combinedBillable =
    wiqBillable !== undefined ? recruitncBillable + wiqBillable : undefined
  const combinedStandardMrr =
    wiqStandardMrr !== undefined
      ? Math.round((stripeMrrForCombined + wiqStandardMrr) * 100) / 100
      : undefined

  return NextResponse.json({
    ...data,
    currentActive,
    currentPaused,
    currentCancelled,
    estimatedMRR,
    ...(currentCanceling != null && { currentCanceling }),
    ...(stripeRecruitncTotal != null && { stripeRecruitncTotal }),
    ...(stripeTestAccountsExcluded != null &&
      stripeTestAccountsExcluded > 0 && { stripeTestAccountsExcluded }),
    ...(recruitncCountsFromStripe && { recruitncCountsFromStripe }),
    pendingPaymentCount: pendingPaymentCountFinal,
    paidSignupsMissingMembership,
    ...(wiqBillable !== undefined && {
      wiqBillable,
      wiqActive,
      wiqPaused,
      wiqEstimatedMrr,
      wiqStandardMrr,
      wiqMissingFromReport,
      wiqLastImportAt,
    }),
    ...(combinedBillable !== undefined && {
      combinedBillable,
      combinedStandardMrr,
      recruitncBillable,
    }),
    ...(stripeMRR !== undefined && { stripeMRR }),
    ...(projectedMRRAfterSeniorChurn !== undefined && { projectedMRRAfterSeniorChurn }),
    ...(seniorChurnByMonth && { seniorChurnByMonth }),
    ...(cohortRetention && { cohortRetention }),
    ...(failedPaymentMembers.length > 0 && { failedPaymentMembers }),
  })
}
