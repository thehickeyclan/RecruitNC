import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isWiqBillableStatus } from "@/lib/blue-wiq-import"
import { sumWiqStandardMrrCents } from "@/lib/blue-billing-rates"

export const dynamic = "force-dynamic"

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

export type BlueWiqSubscriptionRow = {
  id: string
  wiq_billing_partner_id: string
  wrestler_name: string
  billed_to: string | null
  status: string
  wiq_status_raw: string | null
  member_since: string | null
  next_due_at: string | null
  active_until: string | null
  amount_display: string | null
  amount_cents: number | null
  discount_code: string | null
  athlete_id: string | null
  athlete_name: string | null
  match_confidence: string | null
  missing_from_last_import: boolean
  last_import_at: string | null
  last_seen_at: string | null
}

/** GET: List WIQ-tracked subscriptions. ?filter=active|billable|paused|cancelled|missing|all */
export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get("filter") ?? "billable"

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from("blue_wiq_subscriptions")
    .select(
      "id, wiq_billing_partner_id, wrestler_name, billed_to, status, wiq_status_raw, member_since, next_due_at, active_until, amount_display, amount_cents, discount_code, athlete_id, match_confidence, missing_from_last_import, last_import_at, last_seen_at",
    )
    .order("wrestler_name", { ascending: true })

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ tableReady: false, subscriptions: [], stats: null })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let filtered = rows ?? []
  if (filter === "active") filtered = filtered.filter((r) => r.status === "active")
  else if (filter === "billable")
    filtered = filtered.filter((r) => isWiqBillableStatus(r.status as "active" | "past_due" | "grace" | "cancelled" | "paused"))
  else if (filter === "paused") filtered = filtered.filter((r) => r.status === "paused")
  else if (filter === "cancelled") filtered = filtered.filter((r) => r.status === "cancelled")
  else if (filter === "missing") filtered = filtered.filter((r) => r.missing_from_last_import)

  const athleteIds = [...new Set(filtered.map((r) => r.athlete_id).filter(Boolean))] as string[]
  const nameById: Record<string, string> = {}
  if (athleteIds.length > 0) {
    const { data: athletes } = await admin.from("athletes").select("id, name").in("id", athleteIds)
    for (const a of athletes ?? []) {
      nameById[String((a as { id: string }).id)] = String((a as { name?: string }).name ?? "")
    }
  }

  const subscriptions: BlueWiqSubscriptionRow[] = filtered.map((r) => ({
    id: r.id,
    wiq_billing_partner_id: r.wiq_billing_partner_id,
    wrestler_name: r.wrestler_name,
    billed_to: r.billed_to,
    status: r.status,
    wiq_status_raw: r.wiq_status_raw,
    member_since: r.member_since,
    next_due_at: r.next_due_at,
    active_until: r.active_until,
    amount_display: r.amount_display,
    amount_cents: r.amount_cents,
    discount_code: r.discount_code,
    athlete_id: r.athlete_id,
    athlete_name: r.athlete_id ? (nameById[r.athlete_id] ?? null) : null,
    match_confidence: r.match_confidence,
    missing_from_last_import: r.missing_from_last_import,
    last_import_at: r.last_import_at,
    last_seen_at: r.last_seen_at,
  }))

  const all = rows ?? []
  const billable = all.filter((r) => isWiqBillableStatus(r.status as "active" | "past_due" | "grace" | "cancelled"))

  return NextResponse.json({
    tableReady: true,
    subscriptions,
    stats: {
      total: all.length,
      billable: billable.length,
      active: all.filter((r) => r.status === "active").length,
      paused: all.filter((r) => r.status === "paused").length,
      pastDue: all.filter((r) => r.status === "past_due").length,
      grace: all.filter((r) => r.status === "grace").length,
      cancelled: all.filter((r) => r.status === "cancelled").length,
      unmatched: all.filter(
        (r) => !r.athlete_id && isWiqBillableStatus(r.status as "active" | "past_due" | "grace" | "cancelled"),
      ).length,
      missingFromReport: all.filter((r) => r.missing_from_last_import).length,
      estimatedMrr: billable.reduce((s, r) => s + (r.amount_cents ?? 0), 0) / 100,
      standardMrr: sumWiqStandardMrrCents(billable) / 100,
    },
  })
}
