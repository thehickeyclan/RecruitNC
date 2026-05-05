import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeParentSpartanFundraisingTotalsForUser } from "@/lib/parent-spartan-fundraising-totals"
import { FAYETTEVILLE_STRIPE_LOOKBACK_DAYS } from "@/lib/spartan-fayetteville-totals-by-code"

export const dynamic = "force-dynamic"

export type SpartanFundraisingTotalRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  totalCents: number
  giftCount: number
  raceSignupCount: number
  reimbursementsPaidCents: number
  netAfterReimbursementsCents: number
  guildAllocationsCents: number
  codeUnavailable?: boolean
}

/**
 * GET: NC United ledger totals per athlete the signed-in account manages (parent_athlete_links and/or user_profiles.athlete_id).
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    const { campaign, athletes } = await computeParentSpartanFundraisingTotalsForUser(admin, user.id)
    return NextResponse.json({
      campaign,
      source: "stripe_fayetteville_with_corrections",
      lookbackDays: FAYETTEVILLE_STRIPE_LOOKBACK_DAYS,
      athletes,
    })
  } catch (e) {
    console.error("[profile/spartan-fundraising-totals]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 })
  }
}
