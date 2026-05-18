import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeParentSpartanFundraisingTotalsForUser } from "@/lib/parent-spartan-fundraising-totals"
import { runGuildLinkForProfile } from "@/lib/guild-auto-link"

export const dynamic = "force-dynamic"

export type SpartanFundraisingTotalRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  ledgerCodes: string[]
  /** Lifetime credited gross (mirror) — used for net/reimbursement math. */
  totalCents: number
  giftCount: number
  raceSignupCount: number
  reimbursementsPaidCents: number
  netAfterReimbursementsCents: number
  guildAllocationsCents: number
  codeUnavailable?: boolean
  /** Same basis as `/fundraising` athlete leaderboard (Stripe or mirror for the hub window). */
  hubWindowRaisedCents?: number
  hubWindowGiftCount?: number
  hubLookbackDays?: number
}

/**
 * GET: NC United wallet per linked athlete — lifetime mirror for reimbursements; `hubWindow*` aligns headline Raised with the hub leaderboard.
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
    const { data: gp } = await admin
      .from("user_profiles")
      .select("guild_parent_user_id, email")
      .eq("user_id", user.id)
      .maybeSingle()
    const gpid = (gp as { guild_parent_user_id?: string | null } | null)?.guild_parent_user_id
    if (!(typeof gpid === "string" && gpid.trim())) {
      try {
        await runGuildLinkForProfile(admin, user.id, user.email, {
          profileEmail: (gp as { email?: string | null } | null)?.email ?? null,
        })
      } catch {
        /* wallet totals still return */
      }
    }

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
