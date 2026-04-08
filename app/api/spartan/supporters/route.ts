import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import {
  aggregateSpartanByAthlete,
  listSpartanFayettevilleDonations,
  publicSupporterDisplayName,
  type SpartanFayettevilleDonation,
} from "@/lib/spartan-fayetteville-stripe"

export const dynamic = "force-dynamic"

/**
 * Public supporter activity: paid Spartan gifts with names redacted per donor_list_public.
 * No auth. Does not expose email addresses.
 */
export async function GET(request: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret?.trim()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }

  let days = Number(request.nextUrl.searchParams.get("days") ?? "90")
  if (!Number.isFinite(days) || days < 1) days = 90
  if (days > 400) days = 400

  const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const stripe = new Stripe(stripeSecret)

  try {
    const rows = await listSpartanFayettevilleDonations(stripe, since)
    const entries = rows.map((r) => toPublicEntry(r))
    const byAthlete = aggregateSpartanByAthlete(rows)

    const res = NextResponse.json({
      campaign: "fayetteville_2026",
      days,
      count: entries.length,
      entries,
      byAthlete,
    })
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=120")
    return res
  } catch (e) {
    console.error("[spartan/supporters]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load" },
      { status: 500 },
    )
  }
}

function toPublicEntry(r: SpartanFayettevilleDonation) {
  return {
    id: r.sessionId,
    createdIso: r.createdIso,
    amountCents: r.amountCents,
    currency: r.currency,
    displayName: publicSupporterDisplayName(r),
    raceSignup: r.raceParticipant,
    giftType: r.fundraisingType,
    athleteCode: r.athleteCode,
    attribution: r.attribution,
  }
}
