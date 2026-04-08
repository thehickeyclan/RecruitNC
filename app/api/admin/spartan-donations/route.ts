import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const SPARTAN_CAMPAIGN = "fayetteville_2026"
const MAX_PAGES = 80 // 8000 sessions max scan (safety)

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

export type SpartanDonationRow = {
  sessionId: string
  createdIso: string
  createdUnix: number
  amountCents: number
  currency: string
  donorEmail: string | null
  donorName: string | null
  /** race_entry_requested from Checkout metadata — donor went through Race / entry-code path */
  raceParticipant: boolean
  /** fundraising_type: race_donation | gift_only */
  fundraisingType: "race_donation" | "gift_only"
  athleteCode: string | null
  attribution: "athlete" | "general_nc_united"
  tierPreference: string
}

/**
 * GET: List paid Spartan Fayetteville Checkout Sessions from Stripe (metadata spartan_campaign).
 * Query: days= number of days to look back (default 120, max 400).
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
  const rows: SpartanDonationRow[] = []

  let startingAfter: string | undefined
  let pages = 0

  try {
    while (pages < MAX_PAGES) {
      const res = await stripe.checkout.sessions.list({
        created: { gte: since },
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })

      for (const s of res.data) {
        if (s.payment_status !== "paid") continue
        const m = s.metadata || {}
        if (m.spartan_campaign !== SPARTAN_CAMPAIGN) continue

        const raceRequested = m.race_entry_requested === "true"
        const ft = m.fundraising_type === "race_donation" ? "race_donation" : "gift_only"
        const athleteCode =
          typeof m.athlete_code === "string" && m.athlete_code.trim()
            ? m.athlete_code.trim()
            : typeof m.fundraising_code === "string" && m.fundraising_code.trim()
              ? m.fundraising_code.trim()
              : null
        const attr: SpartanDonationRow["attribution"] =
          m.fundraising_attribution === "general_nc_united"
            ? "general_nc_united"
            : m.fundraising_attribution === "athlete"
              ? "athlete"
              : athleteCode
                ? "athlete"
                : "general_nc_united"

        rows.push({
          sessionId: s.id,
          createdIso: new Date((s.created ?? 0) * 1000).toISOString(),
          createdUnix: s.created ?? 0,
          amountCents: s.amount_total ?? 0,
          currency: s.currency ?? "usd",
          donorEmail: s.customer_details?.email ?? s.customer_email ?? null,
          donorName: typeof m.donor_name === "string" && m.donor_name.trim() ? m.donor_name.trim() : null,
          raceParticipant: raceRequested,
          fundraisingType: ft,
          athleteCode,
          attribution: attr,
          tierPreference: typeof m.tier_preference === "string" ? m.tier_preference : "",
        })
      }

      pages++
      if (!res.has_more || res.data.length === 0) break
      startingAfter = res.data[res.data.length - 1]!.id
    }

    rows.sort((a, b) => b.createdUnix - a.createdUnix)

    return NextResponse.json({
      campaign: SPARTAN_CAMPAIGN,
      days,
      count: rows.length,
      donations: rows,
    })
  } catch (e) {
    console.error("[admin/spartan-donations]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Stripe list failed" },
      { status: 500 },
    )
  }
}
