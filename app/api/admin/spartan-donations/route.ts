import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import {
  applySpartanCreditCorrectionsToDonations,
  fetchSpartanCreditCorrectionsMap,
} from "@/lib/spartan-credit-corrections"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  aggregateSpartanByAthlete,
  listSpartanFayettevilleDonations,
  type SpartanAthleteAggregate,
  type SpartanFayettevilleDonation,
} from "@/lib/spartan-fayetteville-stripe"

export const dynamic = "force-dynamic"

export type SpartanDonationRow = SpartanFayettevilleDonation

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
  const stripe = new Stripe(stripeSecret)

  try {
    const raw = await listSpartanFayettevilleDonations(stripe, since)
    const admin = createAdminClient()
    const correctionMap = await fetchSpartanCreditCorrectionsMap(admin)
    const donations = applySpartanCreditCorrectionsToDonations(raw, correctionMap)
    const byAthlete: SpartanAthleteAggregate[] = aggregateSpartanByAthlete(donations)
    const generalTotalCents = donations
      .filter((d) => !d.athleteCode?.trim())
      .reduce((s, d) => s + d.amountCents, 0)

    return NextResponse.json({
      campaign: "fayetteville_2026",
      days,
      count: donations.length,
      donations,
      byAthlete,
      generalTotalCents,
    })
  } catch (e) {
    console.error("[admin/spartan-donations]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Stripe list failed" },
      { status: 500 },
    )
  }
}
