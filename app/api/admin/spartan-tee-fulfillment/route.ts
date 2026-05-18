import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import {
  applySpartanCreditCorrectionsToDonations,
  fetchSpartanCreditCorrectionsIndex,
} from "@/lib/spartan-credit-corrections"
import { listSpartanFayettevilleDonations } from "@/lib/spartan-fayetteville-stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveFundraisingCampaignQueryParam } from "@/lib/fundraising/campaign-registry"

export const dynamic = "force-dynamic"

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const

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
 * JSON rollup for admin: shirt sizes from paid checkouts (`tee_sz` in Stripe metadata).
 * GET `?days=<n>&campaign=` (defaults match campaign registry when `days` omitted)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const campaignResult = resolveFundraisingCampaignQueryParam(request.nextUrl.searchParams.get("campaign"))
  if (!campaignResult.ok) {
    return NextResponse.json({ error: campaignResult.error }, { status: 400 })
  }
  const { campaign } = campaignResult

  let days = Number(request.nextUrl.searchParams.get("days") ?? String(campaign.defaultLookbackDays))
  if (!Number.isFinite(days) || days < 1) days = campaign.defaultLookbackDays
  if (days > 400) days = 400

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret?.trim()) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 500 })
  }

  const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const stripe = new Stripe(stripeSecret)

  try {
    const raw = await listSpartanFayettevilleDonations(stripe, since, campaign.stripeCampaignSlug)
    const admin = createAdminClient()
    const correctionIndex = await fetchSpartanCreditCorrectionsIndex(admin)
    const rows = applySpartanCreditCorrectionsToDonations(raw, correctionIndex)
    const withTee = rows.filter((r) => Boolean(r.teeShirtSize?.trim()))

    const bySize: Record<string, number> = {}
    for (const r of withTee) {
      const sz = (r.teeShirtSize ?? "").trim().toUpperCase()
      if (!sz) continue
      bySize[sz] = (bySize[sz] ?? 0) + 1
    }

    const bySizeOrdered: { size: string; count: number }[] = []
    for (const s of SIZE_ORDER) {
      const c = bySize[s]
      if (c) bySizeOrdered.push({ size: s, count: c })
    }
    for (const k of Object.keys(bySize).sort()) {
      if (SIZE_ORDER.includes(k as (typeof SIZE_ORDER)[number])) continue
      bySizeOrdered.push({ size: k, count: bySize[k]! })
    }

    return NextResponse.json({
      days,
      source: "stripe_checkout_metadata_tee_sz",
      totalTeeOrders: withTee.length,
      bySize: bySizeOrdered,
      bySizeMap: bySize,
    })
  } catch (e) {
    console.error("[spartan-tee-fulfillment]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load" },
      { status: 500 },
    )
  }
}
