import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEFAULT_FUNDRAISING_CAMPAIGN } from "@/lib/fundraising/campaign-registry"
import { buildFundraisingReconciliationReport } from "@/lib/admin-fundraising-reconciliation"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/fundraising/reconciliation
 *
 * Compares `athlete_fundraising_profiles.total_raised_cents` to mirror-based lifetime totals (same as Profile wallet),
 * plus hub lookback window totals, all-time reimbursements, Guild holds, and optional ledger Spartan checkout sums.
 *
 * Query:
 * - `athlete_id` — single athlete (ignores limit/offset)
 * - `limit` / `offset` — page through profiles ordered by `total_raised_cents` desc (default limit 50, max 200)
 * - `only_mismatches=1` — keep rows where profile total ≠ mirror lifetime (both sides present)
 * - `ledger=0` — skip summing `fundraising_ledger_entries` (faster if the table is huge)
 */
export async function GET(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = request.nextUrl.searchParams
  const athleteIdSingle = url.get("athlete_id")?.trim()

  let limit = Number(url.get("limit") ?? "50")
  let offset = Number(url.get("offset") ?? "0")
  if (!Number.isFinite(limit) || limit < 1) limit = 50
  if (limit > 200) limit = 200
  if (!Number.isFinite(offset) || offset < 0) offset = 0

  const onlyMismatches = url.get("only_mismatches") === "1" || url.get("only_mismatches") === "true"
  const includeLedger = url.get("ledger") !== "0"

  const admin = createAdminClient()

  try {
    let athleteIds: string[] = []

    if (athleteIdSingle) {
      athleteIds = [athleteIdSingle]
    } else {
      const { data: profiles, error } = await admin
        .from("athlete_fundraising_profiles")
        .select("athlete_id")
        .order("total_raised_cents", { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      athleteIds = (profiles ?? [])
        .map((p) => String((p as { athlete_id?: string | null }).athlete_id ?? "").trim())
        .filter(Boolean)
    }

    if (athleteIds.length === 0) {
      return NextResponse.json({
        meta: {
          lookbackDays: DEFAULT_FUNDRAISING_CAMPAIGN.defaultLookbackDays,
          campaignStripeSlug: DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug,
          generatedAt: new Date().toISOString(),
          stripeWindowLoaded: false,
          stripeError: null,
          athleteCountRequested: 0,
          pagination: athleteIdSingle ? null : { limit, offset },
        },
        rows: [],
        totals: null,
        filteredCount: 0,
      })
    }

    const { meta, rows } = await buildFundraisingReconciliationReport(admin, user.id, {
      athleteIds,
      includeLedger,
    })

    let outRows = rows
    if (onlyMismatches) {
      outRows = rows.filter((r) => {
        if (r.deltaProfileVsMirrorCents == null) return false
        return Math.abs(r.deltaProfileVsMirrorCents) > 0
      })
    }

    const totals = outRows.reduce(
      (acc, r) => ({
        profileTotalRaisedCents: acc.profileTotalRaisedCents + (r.profileTotalRaisedCents ?? 0),
        mirrorLifetimeRaisedCents: acc.mirrorLifetimeRaisedCents + r.mirrorLifetimeRaisedCents,
        windowRaisedCents: acc.windowRaisedCents + r.windowRaisedCents,
        reimbursementsPaidAllTimeCents: acc.reimbursementsPaidAllTimeCents + r.reimbursementsPaidAllTimeCents,
        guildReservedCents: acc.guildReservedCents + r.guildReservedCents,
      }),
      {
        profileTotalRaisedCents: 0,
        mirrorLifetimeRaisedCents: 0,
        windowRaisedCents: 0,
        reimbursementsPaidAllTimeCents: 0,
        guildReservedCents: 0,
      },
    )

    return NextResponse.json({
      meta: {
        ...meta,
        pagination: athleteIdSingle ? null : { limit, offset },
      },
      rows: outRows,
      totals,
      filteredCount: outRows.length,
    })
  } catch (e) {
    console.error("[admin/fundraising/reconciliation]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to build reconciliation" },
      { status: 500 },
    )
  }
}
