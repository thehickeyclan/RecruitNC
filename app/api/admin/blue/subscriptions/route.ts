import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
  amount_display: string
  started_at: string
  created_at: string
  stripe_subscription_id: string | null
}

export type BlueSignupRow = {
  id: string
  athlete_first_name: string
  athlete_last_name: string
  athlete_name: string
  athlete_high_school: string
  athlete_wrestling_club: string | null
  athlete_weight_class: string | null
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
    .select("id, athlete_id, payer_user_id, status, started_at, created_at, stripe_subscription_id")
    .order("created_at", { ascending: false })

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ error: "Table blue_memberships does not exist." }, { status: 503 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!rows?.length) {
    return NextResponse.json({ subscriptions: [], stats: { active: 0, paused: 0, cancelled: 0, pending_payment: 0 } })
  }

  const athleteIds = [...new Set(rows.map((r) => r.athlete_id))]
  const payerIds = [...new Set(rows.map((r) => r.payer_user_id))]

  const [athletesRes, payersRes] = await Promise.all([
    admin.from("athletes").select("id, name, firstname, lastname, firstName, lastName").in("id", athleteIds),
    admin.from("user_profiles").select("user_id, full_name, first_name, last_name, email").in("user_id", payerIds),
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

  const subscriptions: BlueSubscriptionRow[] = rows.map((r) => {
    const payer = payers[r.payer_user_id]
    return {
      id: r.id,
      athlete_id: r.athlete_id,
      athlete_name: athletes[r.athlete_id] ?? "—",
      payer_user_id: r.payer_user_id,
      payer_name: payer?.name ?? "—",
      payer_email: payer?.email ?? null,
      status: r.status,
      amount_display: "$55/month",
      started_at: r.started_at,
      created_at: r.created_at,
      stripe_subscription_id: r.stripe_subscription_id ?? null,
    }
  })

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
    .select("id, athlete_first_name, athlete_last_name, athlete_high_school, athlete_wrestling_club, athlete_weight_class, tshirt_size, parent_email, parent_first_name, parent_last_name, parent_phone, status, created_at, stripe_customer_id")
    .order("created_at", { ascending: false })
  if (signupError) {
    console.error("[admin/blue/subscriptions] blue_signups select:", signupError.code, signupError.message)
    if (signupError.code === "42501") {
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
      athlete_high_school: r.athlete_high_school ?? "",
      athlete_wrestling_club: r.athlete_wrestling_club ?? null,
      athlete_weight_class: r.athlete_weight_class ?? null,
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
