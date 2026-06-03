import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  buildWiqImportPreview,
  isWiqBillableStatus,
  type AthleteForWiqMatch,
} from "@/lib/blue-wiq-import"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized", userId: null }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required", userId: null }
  return { ok: true as const, userId: user.id }
}

async function loadAthletesForMatch(admin: ReturnType<typeof createAdminClient>): Promise<AthleteForWiqMatch[]> {
  const { data } = await admin
    .from("athletes")
    .select("id, name, firstname, lastname, firstName, lastName, highschool, graduationyear")
    .limit(15000)

  return (data ?? []).map((a) => {
    const row = a as Record<string, unknown>
    const first = String(row.firstname ?? row.firstName ?? "").trim()
    const last = String(row.lastname ?? row.lastName ?? "").trim()
    const name = String(row.name ?? "").trim() || [first, last].filter(Boolean).join(" ")
    const gy = row.graduationyear
    return {
      id: String(row.id),
      name,
      firstName: first,
      lastName: last,
      highSchool: row.highschool != null ? String(row.highschool) : null,
      gradYear: gy != null ? Number(gy) : null,
    }
  })
}

/** GET: Last import run + quick stats (if table exists). */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data: subs, error: subsErr } = await admin
    .from("blue_wiq_subscriptions")
    .select("status, amount_cents, missing_from_last_import")

  if (subsErr) {
    if (subsErr.code === "42P01") {
      return NextResponse.json({
        tableReady: false,
        message: "Run docs/sql/blue-wiq-subscriptions.sql.txt in Supabase first.",
      })
    }
    return NextResponse.json({ error: subsErr.message }, { status: 500 })
  }

  const rows = subs ?? []
  const billable = rows.filter((r) =>
    isWiqBillableStatus(r.status as "active" | "past_due" | "grace" | "cancelled"),
  )
  const mrrCents = billable.reduce((s, r) => s + (r.amount_cents ?? 0), 0)

  const { data: lastRun } = await admin
    .from("blue_wiq_import_runs")
    .select("imported_at, file_label, blue_rows, upserted, flagged_missing")
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    tableReady: true,
    stats: {
      active: rows.filter((r) => r.status === "active").length,
      pastDue: rows.filter((r) => r.status === "past_due").length,
      grace: rows.filter((r) => r.status === "grace").length,
      cancelled: rows.filter((r) => r.status === "cancelled").length,
      billable: billable.length,
      estimatedMrr: Math.round(mrrCents) / 100,
      missingFromReport: rows.filter((r) => r.missing_from_last_import).length,
    },
    lastImport: lastRun ?? null,
  })
}

/** POST: preview or apply WIQ CSV. Body: { csvText, fileLabel?, mode: "preview" | "apply" } */
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: { csvText?: string; pausedCsvText?: string; activeRenewingText?: string; fileLabel?: string; mode?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const csvText = String(body.csvText ?? "").trim()
  if (!csvText) return NextResponse.json({ error: "csvText required" }, { status: 400 })
  const pausedCsvText = String(body.pausedCsvText ?? "").trim()
  const activeRenewingText = String(body.activeRenewingText ?? "").trim()
  const mode = body.mode === "apply" ? "apply" : "preview"
  const fileLabel = String(body.fileLabel ?? "WIQ export").slice(0, 200)
  const now = new Date()

  const admin = createAdminClient()

  const { data: existingRows, error: existErr } = await admin
    .from("blue_wiq_subscriptions")
    .select("wiq_billing_partner_id, athlete_id, status, match_confidence")

  if (existErr?.code === "42P01") {
    return NextResponse.json(
      {
        error:
          "Table blue_wiq_subscriptions does not exist. Run docs/sql/blue-wiq-subscriptions.sql.txt in Supabase.",
      },
      { status: 503 },
    )
  }
  if (existErr) return NextResponse.json({ error: existErr.message }, { status: 500 })

  const existingByWiqId = new Map(
    (existingRows ?? []).map((r) => [
      r.wiq_billing_partner_id as string,
      { athlete_id: r.athlete_id as string | null },
    ]),
  )
  const previouslyActiveWiqIds = (existingRows ?? [])
    .filter((r) => isWiqBillableStatus(r.status as "active" | "past_due" | "grace" | "cancelled" | "paused"))
    .map((r) => r.wiq_billing_partner_id as string)

  const athletes = await loadAthletesForMatch(admin)

  let preview
  try {
    preview = buildWiqImportPreview(
      csvText,
      athletes,
      existingByWiqId,
      previouslyActiveWiqIds,
      now,
      pausedCsvText || undefined,
      activeRenewingText || undefined,
    )
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "CSV parse failed" }, { status: 400 })
  }

  if (mode === "preview") {
    return NextResponse.json({ preview })
  }

  const importIds = new Set(preview.rows.map((r) => r.wiqBillingPartnerId))
  let upserted = 0
  let matched = 0

  for (const row of preview.rows) {
    const { data: existing } = await admin
      .from("blue_wiq_subscriptions")
      .select("id, athlete_id, match_confidence")
      .eq("wiq_billing_partner_id", row.wiqBillingPartnerId)
      .maybeSingle()

    const keepManualAthlete =
      existing?.match_confidence === "manual" && existing.athlete_id && !row.athleteId

    const payload = {
      wiq_billing_partner_id: row.wiqBillingPartnerId,
      wrestler_name: row.wrestlerName,
      billed_to: row.billedTo || null,
      status: row.status,
      wiq_status_raw: row.wiqStatusRaw,
      member_since: row.memberSince,
      next_due_at: row.nextDueAt,
      active_until: row.activeUntil,
      amount_cents: row.amountCents,
      amount_display: row.amountDisplay || null,
      billing_interval: row.billingInterval || null,
      membership_type: row.membershipType || null,
      product_label: row.productLabel,
      discount_code: row.discountCode,
      athlete_id: keepManualAthlete ? existing!.athlete_id : row.athleteId,
      match_confidence: keepManualAthlete ? "manual" : row.matchConfidence,
      last_seen_at: now.toISOString(),
      last_import_at: now.toISOString(),
      missing_from_last_import: false,
      updated_at: now.toISOString(),
    }

    if (existing) {
      const { error } = await admin.from("blue_wiq_subscriptions").update(payload).eq("id", existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await admin.from("blue_wiq_subscriptions").insert({
        ...payload,
        first_seen_at: now.toISOString(),
        created_at: now.toISOString(),
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    upserted++
    if (payload.athlete_id) matched++
  }

  const toFlag = previouslyActiveWiqIds.filter((id) => !importIds.has(id))
  if (toFlag.length > 0) {
    await admin
      .from("blue_wiq_subscriptions")
      .update({ missing_from_last_import: true, updated_at: now.toISOString() })
      .in("wiq_billing_partner_id", toFlag)
  }

  await admin.from("blue_wiq_import_runs").insert({
    imported_by: auth.userId,
    file_label: fileLabel,
    total_rows: preview.totalRows,
    blue_rows: preview.blueRows,
    upserted,
    matched,
    flagged_missing: toFlag.length,
    summary: {
      activeCount: preview.activeCount,
      pastDueCount: preview.pastDueCount,
      cancelledCount: preview.cancelledCount,
      pausedCount: preview.pausedCount,
      pausedApplied: preview.pausedApplied ?? 0,
      activeRenewingListCount: preview.activeRenewingListCount ?? 0,
      demotedFromActive: preview.demotedFromActive ?? 0,
      duplicateWrestlerNames: preview.duplicateWrestlerNames.slice(0, 20),
    },
  })

  return NextResponse.json({
    ok: true,
    upserted,
    matched,
    flaggedMissing: toFlag.length,
    pausedApplied: preview.pausedApplied ?? 0,
    demotedFromActive: preview.demotedFromActive ?? 0,
    preview,
  })
}
