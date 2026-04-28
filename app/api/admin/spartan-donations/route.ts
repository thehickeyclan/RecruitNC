import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import {
  applySpartanCreditCorrectionsToDonations,
  fetchSpartanCreditCorrectionsMap,
} from "@/lib/spartan-credit-corrections"
import { createAdminClient } from "@/lib/supabase/admin"
import { mergeSpartanAggregatesWithReimbursementNet } from "@/lib/athlete-reimbursement-net"
import { fetchGuildReservedCentsByAthleteIdGlobal } from "@/lib/guild-credit-allocations"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { getSpartanFundraisingParentCoverage } from "@/lib/spartan-fundraising-parent-coverage"
import {
  aggregateSpartanByAthlete,
  listSpartanFayettevilleDonations,
  type SpartanFayettevilleDonation,
} from "@/lib/spartan-fayetteville-stripe"

export const dynamic = "force-dynamic"

/** PostgREST `.in()` with hundreds of long `cs_` ids can exceed URL limits; fetch in chunks. */
const RECEIPT_SESSION_ID_CHUNK = 50

async function fetchReceiptSentAtBySessionId(
  admin: ReturnType<typeof createAdminClient>,
  sessionIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(sessionIds)].filter(Boolean)
  for (let i = 0; i < unique.length; i += RECEIPT_SESSION_ID_CHUNK) {
    const chunk = unique.slice(i, i + RECEIPT_SESSION_ID_CHUNK)
    const { data: receiptRows, error } = await admin
      .from("spartan_donation_receipt_emails")
      .select("checkout_session_id, sent_at")
      .in("checkout_session_id", chunk)
    if (error) {
      console.error("[admin/spartan-donations] spartan_donation_receipt_emails select:", error.message, error)
      continue
    }
    for (const r of receiptRows ?? []) {
      const row = r as { checkout_session_id: string; sent_at: string }
      map.set(row.checkout_session_id, row.sent_at)
    }
  }
  return map
}

export type SpartanDonationRow = SpartanFayettevilleDonation & {
  receiptEmailSentAt?: string | null
}

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, status: 401, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false, status: 403, error: "Admin required" }
  return { ok: true }
}

/**
 * GET: List paid Spartan Fayetteville Checkout Sessions + aggregates by athlete.
 * Query: days= lookback (default 120, max 400).
 * Optional: includeParentCoverage=1 adds Fundraise-tab parent link coverage (Supabase).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret?.trim()) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 500 })
  }

  let days = Number(request.nextUrl.searchParams.get("days") ?? "120")
  if (!Number.isFinite(days) || days < 1) days = 120
  if (days > 400) days = 400

  const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const sinceMs = since * 1000
  const stripe = new Stripe(stripeSecret)

  try {
    const raw = await listSpartanFayettevilleDonations(stripe, since)
    const admin = createAdminClient()
    const correctionMap = await fetchSpartanCreditCorrectionsMap(admin)
    const donationsRaw = applySpartanCreditCorrectionsToDonations(raw, correctionMap)

    let receiptMap = new Map<string, string>()
    try {
      const ids = donationsRaw.map((d) => d.sessionId)
      if (ids.length > 0) {
        receiptMap = await fetchReceiptSentAtBySessionId(admin, ids)
      }
    } catch (e) {
      console.warn("[admin/spartan-donations] receipt status (table may be missing):", e)
    }

    const donations = donationsRaw.map((d) => ({
      ...d,
      receiptEmailSentAt: receiptMap.get(d.sessionId) ?? null,
    }))

    const byAthleteRaw = aggregateSpartanByAthlete(donationsRaw)
    const { rows: byAthleteMerged, totalReimbursementsPaidCents } = await mergeSpartanAggregatesWithReimbursementNet(
      admin,
      byAthleteRaw,
      sinceMs,
    )

    let guildByCodeLower = new Map<string, number>()
    try {
      const [guildByAthleteId, entries] = await Promise.all([
        fetchGuildReservedCentsByAthleteIdGlobal(admin),
        getFundraisingAthleteEntries(admin),
      ])
      for (const e of entries) {
        if (e.id.startsWith("spartan-fundraising:")) continue
        const g = guildByAthleteId.get(e.id) ?? 0
        if (g > 0) guildByCodeLower.set(e.code.toLowerCase(), g)
      }
    } catch (e) {
      console.warn("[admin/spartan-donations] guild allocations (table may be missing):", e)
    }

    const byAthlete = byAthleteMerged.map((a) => ({
      ...a,
      guildAllocationsCents: guildByCodeLower.get(a.athleteCode.trim().toLowerCase()) ?? 0,
    }))
    const includeParentCoverage = request.nextUrl.searchParams.get("includeParentCoverage") === "1"
    const parentCoverage = includeParentCoverage ? await getSpartanFundraisingParentCoverage(admin, byAthlete) : undefined
    const generalTotalCents = donationsRaw
      .filter((d) => !d.athleteCode?.trim())
      .reduce((s, d) => s + d.amountCents, 0)
    const grossSessionTotalCents = donationsRaw.reduce((s, d) => s + d.amountCents, 0)
    const netAfterReimbursementsCents = grossSessionTotalCents - totalReimbursementsPaidCents

    return NextResponse.json({
      campaign: "fayetteville_2026",
      days,
      count: donations.length,
      donations,
      byAthlete,
      generalTotalCents,
      reimbursementsPaidTotalCents: totalReimbursementsPaidCents,
      grossSessionTotalCents,
      netAfterReimbursementsCents,
      ...(parentCoverage ? { parentCoverage } : {}),
    })
  } catch (e) {
    console.error("[admin/spartan-donations]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Stripe list failed" },
      { status: 500 },
    )
  }
}
