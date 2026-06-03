import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBlueMembershipStripeDetails } from "@/lib/blue-membership-stripe-details"
import { isBlueStripeTestMembershipRow } from "@/lib/blue-stripe-test-accounts"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

export type BlueSubscriptionRow = {
  id: string
  athlete_id: string
  athlete_name: string
  payer_user_id: string
  payer_name: string
  payer_email: string | null
  status: string
  /** Display amount (Stripe when available, else default) */
  amount_display: string
  started_at: string
  created_at: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  resume_at: string | null
  /** DB or Stripe current_period_end */
  next_billing_at: string | null
  last_payment_at: string | null
  ended_at: string | null
  cancel_at_period_end: boolean
  card_display: string | null
  stripe_enrichment_error: string | null
  plan_name: string | null
  source: "live" | "cached" | "unavailable"
  notes: string | null
  signup_id: string | null
  paid_invoice_count: number
  lifetime_paid_display: string | null
}

export type BlueSignupRow = {
  id: string
  athlete_first_name: string
  athlete_last_name: string
  athlete_name: string
  athlete_graduation_year: number | null
  athlete_high_school: string
  athlete_wrestling_club: string | null
  athlete_weight_class: string | null
  athlete_cell_phone: string | null
  tshirt_size: string
  parent_email: string
  parent_first_name: string
  parent_last_name: string
  parent_phone: string | null
  status: string
  created_at: string
  stripe_customer_id: string | null
}

/** GET: List Blue subscriptions (memberships) with athlete and payer info */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  const { data: rows, error } = await admin
    .from("blue_memberships")
    .select(
      "id, athlete_id, payer_user_id, status, started_at, created_at, stripe_subscription_id, stripe_customer_id, resume_at, next_billing_at, ended_at, notes, signup_id"
    )
    .order("created_at", { ascending: false })

  const membershipsError: string | null =
    error?.code === "42P01"
      ? "Table blue_memberships does not exist. Run the SQL in docs/blue-membership-tables.md (Section 3) to see subscriptions."
      : null

  if (error && error.code !== "42P01") {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const emptyPayload = async () => {
    let signups: BlueSignupRow[] = []
    let signupsError: string | null = null
    const { data: signupRows, error: signupError } = await admin
      .from("blue_signups")
      .select("id, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_wrestling_club, athlete_weight_class, athlete_cell_phone, tshirt_size, parent_email, parent_first_name, parent_last_name, parent_phone, status, created_at, stripe_customer_id")
      .order("created_at", { ascending: false })
    if (!signupError && signupRows?.length) {
      signups = signupRows.map((r) => ({
        id: r.id,
        athlete_first_name: r.athlete_first_name ?? "",
        athlete_last_name: r.athlete_last_name ?? "",
        athlete_name: [r.athlete_first_name, r.athlete_last_name].filter(Boolean).join(" ").trim() || "—",
        athlete_graduation_year: r.athlete_graduation_year ?? null,
        athlete_high_school: r.athlete_high_school ?? "",
        athlete_wrestling_club: r.athlete_wrestling_club ?? null,
        athlete_weight_class: r.athlete_weight_class ?? null,
        athlete_cell_phone: (r as { athlete_cell_phone?: string | null }).athlete_cell_phone ?? null,
        tshirt_size: r.tshirt_size ?? "",
        parent_email: r.parent_email ?? "",
        parent_first_name: r.parent_first_name ?? "",
        parent_last_name: r.parent_last_name ?? "",
        parent_phone: r.parent_phone ?? null,
        status: r.status ?? "pending_payment",
        created_at: r.created_at ?? "",
        stripe_customer_id: r.stripe_customer_id ?? null,
      }))
    }
    if (signupError) {
      signupsError =
        signupError.code === "42P01"
          ? "Table blue_signups does not exist. Run the SQL in docs/blue-signups-table.md."
          : signupError.code === "42501"
            ? "RLS is blocking read. In Supabase SQL Editor run: DROP POLICY IF EXISTS \"Service role full access blue_signups\" ON public.blue_signups; CREATE POLICY \"Service role full access blue_signups\" ON public.blue_signups FOR ALL TO service_role USING (true) WITH CHECK (true);"
            : signupError.message
    }
    return NextResponse.json({
      subscriptions: [],
      stats: { active: 0, paused: 0, cancelled: 0, pending_payment: 0 },
      signups,
      signupsError,
      membershipsError: membershipsError ?? undefined,
    })
  }

  if (membershipsError || !rows?.length) {
    return emptyPayload()
  }

  const athleteIds = [...new Set(rows.map((r) => r.athlete_id).filter(Boolean))] as string[]
  const payerIds = [...new Set(rows.map((r) => r.payer_user_id).filter(Boolean))] as string[]
  const signupIds = [
    ...new Set(
      rows
        .map((r) => (r as { signup_id?: string | null }).signup_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  const [athletesRes, payersRes, signupsForNamesRes] = await Promise.all([
    athleteIds.length
      ? admin.from("athletes").select("id, name, firstname, lastname, firstName, lastName").in("id", athleteIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    payerIds.length
      ? admin.from("user_profiles").select("user_id, full_name, first_name, last_name, email").in("user_id", payerIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    signupIds.length
      ? admin
          .from("blue_signups")
          .select("id, athlete_first_name, athlete_last_name")
          .in("id", signupIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ])

  const athletes = (athletesRes.data ?? []).reduce(
    (acc, a) => {
      const row = a as Record<string, unknown>
      const id = String(row.id ?? "")
      const name = String(row.name ?? "").trim()
        || [row.firstname ?? row.firstName, row.lastname ?? row.lastName].filter(Boolean).join(" ").trim()
      acc[id] = name || "—"
      return acc
    },
    {} as Record<string, string>
  )
  const payers = (payersRes.data ?? []).reduce(
    (acc, p) => {
      const row = p as Record<string, unknown>
      const uid = String(row.user_id ?? "")
      const full = String(row.full_name ?? "").trim()
      const first = String(row.first_name ?? "").trim()
      const last = String(row.last_name ?? "").trim()
      const name = full || [first, last].filter(Boolean).join(" ").trim() || "—"
      const email = (row.email as string) ?? null
      acc[uid] = { name, email }
      return acc
    },
    {} as Record<string, { name: string; email: string | null }>
  )

  const signupAthleteNames = (signupsForNamesRes.data ?? []).reduce(
    (acc, s) => {
      const row = s as Record<string, unknown>
      const id = String(row.id ?? "")
      const name = [row.athlete_first_name, row.athlete_last_name]
        .map((p) => String(p ?? "").trim())
        .filter(Boolean)
        .join(" ")
      if (id && name) acc[id] = name
      return acc
    },
    {} as Record<string, string>,
  )

  const resolveAthleteName = (athleteId: string, signupId: string | null | undefined) => {
    const fromProfile = athletes[String(athleteId)]
    if (fromProfile && fromProfile !== "—") return fromProfile
    if (signupId && signupAthleteNames[signupId]) return signupAthleteNames[signupId]
    return fromProfile ?? "—"
  }

  const allSubscriptions: BlueSubscriptionRow[] = rows.map((r) => {
    const payer = payers[r.payer_user_id]
    const signupId = (r as { signup_id?: string | null }).signup_id ?? null
    const row = r as {
      resume_at?: string | null
      next_billing_at?: string | null
      ended_at?: string | null
      stripe_customer_id?: string | null
    }
    return {
      id: r.id,
      athlete_id: r.athlete_id,
      athlete_name: resolveAthleteName(r.athlete_id, signupId),
      payer_user_id: r.payer_user_id,
      payer_name: payer?.name ?? "—",
      payer_email: payer?.email ?? null,
      status: r.status,
      amount_display: "$55/month",
      started_at: r.started_at,
      created_at: r.created_at,
      stripe_subscription_id: r.stripe_subscription_id ?? null,
      stripe_customer_id: row.stripe_customer_id ?? null,
      resume_at: row.resume_at ?? null,
      next_billing_at: row.next_billing_at ?? null,
      last_payment_at: null,
      ended_at: row.ended_at ?? null,
      cancel_at_period_end: false,
      card_display: null,
      stripe_enrichment_error: null,
      plan_name: null,
      source: (row.next_billing_at ?? null) ? "cached" : "unavailable",
      notes: ((row as Record<string, unknown>).notes as string | null | undefined) ?? null,
      signup_id: (row as Record<string, unknown>).signup_id as string | null ?? null,
      paid_invoice_count: 0,
      lifetime_paid_display: null,
    }
  })

  // One row per athlete: prefer the membership that has stripe_subscription_id (the "live" one with Pause/Cancel/Delete)
  const byAthlete = new Map<string, BlueSubscriptionRow>()
  for (const sub of allSubscriptions) {
    const existing = byAthlete.get(sub.athlete_id)
    const preferThis =
      !existing ||
      (sub.stripe_subscription_id && !existing.stripe_subscription_id) ||
      (Boolean(sub.stripe_subscription_id) === Boolean(existing.stripe_subscription_id) && sub.created_at > existing.created_at)
    if (preferThis) byAthlete.set(sub.athlete_id, sub)
  }
  let subscriptions = Array.from(byAthlete.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const stripeKey = process.env.STRIPE_SECRET_KEY
  subscriptions = await Promise.all(
    subscriptions.map(async (sub) => {
      if (!sub.stripe_subscription_id || !stripeKey) {
        return sub
      }
      const enriched = await getBlueMembershipStripeDetails(sub.stripe_subscription_id)
      if (!enriched.ok) {
        return {
          ...sub,
          stripe_enrichment_error: enriched.error,
          source: sub.next_billing_at ? "cached" : "unavailable",
        }
      }
      const d = enriched.details
      const card_display =
        d.cardBrand && d.cardLast4
          ? `${d.cardBrand.charAt(0).toUpperCase()}${d.cardBrand.slice(1)} •••• ${d.cardLast4}`
          : null
      return {
        ...sub,
        next_billing_at: d.nextBillingAt ?? sub.next_billing_at,
        last_payment_at: d.lastPaymentAt,
        amount_display: d.amountFormatted ? `${d.amountFormatted}/mo` : sub.amount_display,
        cancel_at_period_end: d.cancelAtPeriodEnd,
        card_display,
        plan_name: d.planName ?? null,
        paid_invoice_count: d.paidInvoiceCount,
        lifetime_paid_display: d.lifetimePaidFormatted,
        source: "live" as const,
      }
    })
  )

  subscriptions = subscriptions.filter((sub) => !isBlueStripeTestMembershipRow(sub))

  const stats = {
    active: subscriptions.filter((s) => s.status === "active").length,
    paused: subscriptions.filter((s) => s.status === "paused").length,
    cancelled: subscriptions.filter((s) => s.status === "cancelled" || s.status === "alumni").length,
    pending_payment: subscriptions.filter((s) => s.status === "pending_payment").length,
  }

  let signups: BlueSignupRow[] = []
  let signupsError: string | null = null
  const { data: signupRows, error: signupError } = await admin
    .from("blue_signups")
    .select("id, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_wrestling_club, athlete_weight_class, athlete_cell_phone, tshirt_size, parent_email, parent_first_name, parent_last_name, parent_phone, status, created_at, stripe_customer_id")
    .order("created_at", { ascending: false })
  if (signupError) {
    console.error("[admin/blue/subscriptions] blue_signups select:", signupError.code, signupError.message)
    if (signupError.code === "42P01") {
      signupsError = "Table blue_signups does not exist. Run the SQL in docs/blue-signups-table.md."
    } else if (signupError.code === "42501") {
      signupsError = "RLS is blocking read. In Supabase SQL Editor run: DROP POLICY IF EXISTS \"Service role full access blue_signups\" ON public.blue_signups; CREATE POLICY \"Service role full access blue_signups\" ON public.blue_signups FOR ALL TO service_role USING (true) WITH CHECK (true);"
    } else {
      signupsError = signupError.message
    }
  } else if (signupRows) {
    signups = signupRows.map((r) => ({
      id: r.id,
      athlete_first_name: r.athlete_first_name ?? "",
      athlete_last_name: r.athlete_last_name ?? "",
      athlete_name: [r.athlete_first_name, r.athlete_last_name].filter(Boolean).join(" ").trim() || "—",
      athlete_graduation_year: r.athlete_graduation_year ?? null,
      athlete_high_school: r.athlete_high_school ?? "",
      athlete_wrestling_club: r.athlete_wrestling_club ?? null,
      athlete_weight_class: r.athlete_weight_class ?? null,
      athlete_cell_phone: (r as { athlete_cell_phone?: string | null }).athlete_cell_phone ?? null,
      tshirt_size: r.tshirt_size ?? "",
      parent_email: r.parent_email ?? "",
      parent_first_name: r.parent_first_name ?? "",
      parent_last_name: r.parent_last_name ?? "",
      parent_phone: r.parent_phone ?? null,
      status: r.status ?? "pending_payment",
      created_at: r.created_at ?? "",
      stripe_customer_id: r.stripe_customer_id ?? null,
    }))
  }

  return NextResponse.json({ subscriptions, stats, signups, signupsError })
}
