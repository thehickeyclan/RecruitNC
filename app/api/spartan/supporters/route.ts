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
import { listSpartanFayettevilleDonations, listSpartanFayettevilleDonationsAllRegisteredCampaigns } from "@/lib/spartan-fayetteville-stripe"
import { DEFAULT_FUNDRAISING_CAMPAIGN, resolveFundraisingCampaignQueryParam } from "@/lib/fundraising/campaign-registry"

export const dynamic = "force-dynamic"

/**
 * Public supporter activity: paid Spartan gifts with names redacted per donor_list_public.
 * Query: `days` (default per campaign), `campaign` = Stripe slug or `all` for every registered hub campaign combined.
 * No auth. Does not expose email addresses.
 */
export async function GET(request: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret?.trim()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }

  const rawCampaign = request.nextUrl.searchParams.get("campaign")?.trim()
  const allHubCampaigns = rawCampaign?.toLowerCase() === "all"

  let resolvedCampaign = DEFAULT_FUNDRAISING_CAMPAIGN
  if (!allHubCampaigns) {
    const campaignResult = resolveFundraisingCampaignQueryParam(rawCampaign ?? null)
    if (!campaignResult.ok) {
      return NextResponse.json({ error: campaignResult.error }, { status: 400 })
    }
    resolvedCampaign = campaignResult.campaign
  }

  let days = Number(request.nextUrl.searchParams.get("days") ?? String(resolvedCampaign.defaultLookbackDays))
  if (!Number.isFinite(days) || days < 1) days = resolvedCampaign.defaultLookbackDays
  if (days > 400) days = 400

  const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const stripe = new Stripe(stripeSecret)

  try {
    const rowsRaw = allHubCampaigns
      ? await listSpartanFayettevilleDonationsAllRegisteredCampaigns(stripe, since)
      : await listSpartanFayettevilleDonations(stripe, since, resolvedCampaign.stripeCampaignSlug)
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
      spartanCampaignSlug: r.spartanCampaignSlug,
      fundraisingCheckoutSurface: r.fundraisingCheckoutSurface,
    }))

    const byAthlete = buildSpartanPublicByAthlete(rows, codeToFullName)
    const summary = buildSpartanPublicSupporterSummary(rows)

    const res = NextResponse.json({
      campaign: allHubCampaigns ? "all" : resolvedCampaign.stripeCampaignSlug,
      campaignDisplayName: allHubCampaigns
        ? "All NC United fundraising campaigns (combined)"
        : resolvedCampaign.campaignDisplayName,
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
    /** Live totals: avoid shared CDN caching so `/fundraising/leaderboard` matches Stripe after new checkouts. */
    res.headers.set("Cache-Control", "private, no-store, must-revalidate")
    return res
  } catch (e) {
    console.error("[spartan/supporters]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load" },
      { status: 500 },
    )
  }
}
