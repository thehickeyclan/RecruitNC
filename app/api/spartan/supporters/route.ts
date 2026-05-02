import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { fundraisingCodeToFullNameMap, getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  applySpartanCreditCorrectionsToDonations,
  fetchSpartanCreditCorrectionsIndex,
} from "@/lib/spartan-credit-corrections"
import {
  attachPublicSupporterFields,
  buildSpartanPublicByAthlete,
  buildSpartanPublicSupporterSummary,
} from "@/lib/spartan-public-supporter-feed"
import { listSpartanFayettevilleDonations } from "@/lib/spartan-fayetteville-stripe"
import { resolveFundraisingCampaignQueryParam } from "@/lib/fundraising/campaign-registry"

export const dynamic = "force-dynamic"

/**
 * Public supporter activity: paid Spartan gifts with names redacted per donor_list_public.
 * Query: days (default per campaign registry), campaign= Stripe slug (default: registry default).
 * No auth. Does not expose email addresses.
 */
export async function GET(request: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret?.trim()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }

  const campaignResult = resolveFundraisingCampaignQueryParam(request.nextUrl.searchParams.get("campaign"))
  if (!campaignResult.ok) {
    return NextResponse.json({ error: campaignResult.error }, { status: 400 })
  }
  const { campaign } = campaignResult

  let days = Number(request.nextUrl.searchParams.get("days") ?? String(campaign.defaultLookbackDays))
  if (!Number.isFinite(days) || days < 1) days = campaign.defaultLookbackDays
  if (days > 400) days = 400

  const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const stripe = new Stripe(stripeSecret)

  try {
    const rowsRaw = await listSpartanFayettevilleDonations(stripe, since, campaign.stripeCampaignSlug)
    let rows = rowsRaw
    let codeToFullName = new Map<string, string>()
    try {
      const admin = createAdminClient()
      const correctionIndex = await fetchSpartanCreditCorrectionsIndex(admin)
      rows = applySpartanCreditCorrectionsToDonations(rowsRaw, correctionIndex)
      const directory = await getFundraisingAthleteEntries(admin)
      codeToFullName = fundraisingCodeToFullNameMap(directory)
    } catch (dirErr) {
      console.error("[spartan/supporters] directory / credit corrections", dirErr)
    }

    const enriched = attachPublicSupporterFields(rows, codeToFullName)
    const entries = enriched.map((r) => ({
      id: r.sessionId,
      createdIso: r.createdIso,
      amountCents: r.amountCents,
      currency: r.currency,
      displayName: r.publicDisplayName,
      raceSignup: r.raceParticipant,
      giftType: r.fundraisingType,
      athleteCode: r.athleteCode,
      manualCreditName: r.manualCreditName,
      creditLabel: r.creditLabel,
      attribution: r.attribution,
      raceParticipantName: r.publicRaceParticipantName,
    }))

    const byAthlete = buildSpartanPublicByAthlete(rows, codeToFullName)
    const summary = buildSpartanPublicSupporterSummary(rows)

    const res = NextResponse.json({
      campaign: campaign.stripeCampaignSlug,
      campaignDisplayName: campaign.campaignDisplayName,
      days,
      count: entries.length,
      summary: {
        totalRaisedCents: summary.totalRaisedCents,
        giftCount: summary.giftCount,
        raceEntryCount: summary.raceEntryCount,
        ncUnitedCommunityFundCents: summary.ncUnitedCommunityFundCents,
        ncUnitedCommunityGiftCount: summary.ncUnitedCommunityGiftCount,
        ncUnitedCommunityRaceSignupCount: summary.ncUnitedCommunityRaceSignupCount,
      },
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
