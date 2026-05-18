import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeParentSpartanFundraisingTotalsForUser } from "@/lib/parent-spartan-fundraising-totals"

export const dynamic = "force-dynamic"

export type SpartanFundraisingTotalRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  ledgerCodes: string[]
  totalCents: number
  giftCount: number
  raceSignupCount: number
  reimbursementsPaidCents: number
  netAfterReimbursementsCents: number
  guildAllocationsCents: number
  codeUnavailable?: boolean
}

/**
 * GET: NC United wallet totals per linked athlete (lifetime `spartan_donations` + all-time reimbursements).
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
      source: "spartan_donations_mirror_lifetime",
      athletes,
    })
  } catch (e) {
    console.error("[profile/spartan-fundraising-totals]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 })
  }
}
