import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAthleteFundraisingPublicSnapshot, ATHLETE_PUBLIC_GIFTS_NO_ROW_CAP } from "@/lib/fundraising/athlete-public-stats"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/athletes/[id]/fundraising
 * Returns comprehensive fundraising data for an athlete including profile, donations, wallet, etc.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const { id: athleteId } = await params
  if (!athleteId?.trim()) {
    return NextResponse.json({ error: "Missing athlete ID" }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    // 1. Get athlete fundraising profile
    const { data: profile, error: profileError } = await admin
      .from("athlete_fundraising_profiles")
      .select("*")
      .eq("athlete_id", athleteId)
      .maybeSingle()

    if (profileError) {
      console.warn("[admin/athletes/fundraising] profile fetch error:", profileError.message)
    }

    // 2. Get fundraising code from profile or athlete record
    let fundraisingCode: string | null = null
    let athleteSlug: string | null = null

    if (profile) {
      fundraisingCode = profile.primary_fundraising_code
      athleteSlug = profile.slug
    }

    // Fallback: check if code is in the athlete record
    if (!fundraisingCode) {
      const { data: athlete } = await admin
        .from("athletes")
        .select("fundraising_code")
        .eq("id", athleteId)
        .maybeSingle()
      
      if (athlete?.fundraising_code) {
        fundraisingCode = athlete.fundraising_code
      }
    }

    // 3. Get donation stats and gift history if we have a code
    let stats = null
    let gifts: Array<{
      created_at: string
      donorLabel: string
      amountCents: number
      campaignLabel: string
    }> = []

    if (fundraisingCode) {
      const snapshot = await getAthleteFundraisingPublicSnapshot(fundraisingCode, ATHLETE_PUBLIC_GIFTS_NO_ROW_CAP)
      if (snapshot) {
        stats = snapshot.stats
        gifts = snapshot.gifts
      }
    }

    const codeForLedger = typeof fundraisingCode === "string" ? fundraisingCode.trim() : ""

    const { data: ledgerByAthleteId, error: wErr1 } = await admin
      .from("fundraising_ledger_entries")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("occurred_at", { ascending: false })
      .limit(100)

    if (wErr1) {
      console.warn("[admin/athletes/fundraising] wallet fetch (athlete_id):", wErr1.message)
    }

    let walletEntries = ledgerByAthleteId ?? []

    if (codeForLedger) {
      const { data: ledgerByCode, error: wErr2 } = await admin
        .from("fundraising_ledger_entries")
        .select("*")
        .ilike("athlete_code", codeForLedger)
        .order("occurred_at", { ascending: false })
        .limit(100)

      if (wErr2) {
        console.warn("[admin/athletes/fundraising] wallet fetch (athlete_code):", wErr2.message)
      }

      const byId = new Map<string, (typeof walletEntries)[0]>()
      for (const row of [...walletEntries, ...(ledgerByCode ?? [])]) {
        const id = String((row as { id?: string }).id ?? "")
        if (id) byId.set(id, row as (typeof walletEntries)[0])
      }
      walletEntries = [...byId.values()].sort((a, b) => {
        const ta = String((a as { occurred_at?: string }).occurred_at ?? "")
        const tb = String((b as { occurred_at?: string }).occurred_at ?? "")
        return tb.localeCompare(ta)
      }).slice(0, 100)
    }

    // Calculate wallet totals from ledger (column is `entry_kind`, not `entry_type`)
    let walletRaisedCents = 0
    let walletSpentCents = 0
    let walletReservedCents = 0

    for (const entry of walletEntries ?? []) {
      const amt = typeof entry.amount_cents === "number" ? entry.amount_cents : 0
      const kind = String((entry as { entry_kind?: string }).entry_kind ?? "")
      const direction = String((entry as { direction?: string }).direction ?? "")

      if (kind === "stripe_spartan_checkout" && direction === "money_in") {
        walletRaisedCents += amt
      } else if (kind === "reimbursement_paid" && direction === "money_out") {
        walletSpentCents += amt
      } else if (kind === "guild_credit_allocation" && direction === "internal_move") {
        walletReservedCents += amt
      }
    }

    // 5. Get expense requests for this athlete
    const { data: expenseRequests, error: expenseError } = await admin
      .from("athlete_expense_requests")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (expenseError) {
      console.warn("[admin/athletes/fundraising] expense fetch error:", expenseError.message)
    }

    // 6. Build the response
    return NextResponse.json({
      success: true,
      data: {
        profile: profile || null,
        fundraisingCode,
        athleteSlug,
        fundraisingPageUrl: athleteSlug ? `/fundraising/athletes/${athleteSlug}` : null,
        stats: stats || {
          raisedCents: profile?.total_raised_cents || walletRaisedCents || 0,
          giftCount: gifts.length,
          avgGiftCents: gifts.length > 0 ? Math.round((profile?.total_raised_cents || walletRaisedCents || 0) / gifts.length) : null,
        },
        wallet: {
          raisedCents: walletRaisedCents,
          spentCents: walletSpentCents,
          reservedCents: walletReservedCents,
          availableCents: walletRaisedCents - walletSpentCents - walletReservedCents,
        },
        gifts: gifts.slice(0, 50), // Limit to 50 most recent
        ledgerEntries: walletEntries || [],
        expenseRequests: expenseRequests || [],
      }
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[admin/athletes/fundraising] error:", msg)
    return NextResponse.json({ error: "Failed to load fundraising data" }, { status: 500 })
  }
}
