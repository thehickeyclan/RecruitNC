import { NextResponse, type NextRequest } from "next/server"
import { loadStatePlacerIndex } from "@/lib/state-placers"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { createAdminClient } from "@/lib/supabase/admin"
import { classifyViewer } from "@/lib/viewer-role"
import { loadPublicAthleteProfile } from "@/lib/load-public-athlete-profile"
import { buildScoutingReport, loadOpponentIndex } from "@/lib/scouting-report"
import { writeSummary } from "@/lib/scouting-report-summary"
import { scoutingAccessTier, scoutingReportAvailable, watermarkLine } from "@/lib/scouting-report-access"
import { loadScoutingEntitlement } from "@/lib/scouting-report-entitlement-db"

/**
 * The printable scouting report behind the coach-only export.
 *
 * College coaches only, for now. The report pulls together academics and contact-adjacent
 * detail that the public profile deliberately does not show in one place, so the gate is the
 * point of the endpoint rather than a formality — anyone else gets a 403, including
 * high-school and club coaches.
 */

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // The website sends cookies; the iPhone app sends its bearer token. Reading cookies alone
  // treated every app request as signed out.
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: "Sign in to view scouting reports." }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, is_admin, verified_method, institution, full_name, email")
    .eq("user_id", user.id)
    .maybeSingle()

  const viewer = classifyViewer(profile ?? null)
  const isAdmin = viewer.kind === "admin" || profile?.is_admin === true

  /**
   * Access is decided in one place — pre-launch allowlist, then free reasons (admin, college
   * coach, their own wrestler), then a subscription or a purchase of this report.
   *
   * A refusal reports whether paying would help, so the page can show a paywall rather than a
   * dead end, and 402 distinguishes "you could buy this" from a plain 403.
   */
  const entitlement = await loadScoutingEntitlement(admin, {
    userId: user.id,
    email: (profile?.email as string) ?? user.email ?? null,
    athleteId: id,
    isAdmin,
    isCollegeCoach: viewer.isCollegeCoach,
  })
  if (!entitlement.canAccess) {
    return NextResponse.json(
      {
        error: entitlement.purchasable
          ? "This scouting report requires a subscription or a single-report purchase."
          : "Scouting reports are not available on this account.",
        purchasable: entitlement.purchasable,
      },
      { status: entitlement.purchasable ? 402 : 403 },
    )
  }

  const loaded = await loadPublicAthleteProfile(id, admin)
  if (!loaded.ok) {
    return NextResponse.json({ error: loaded.error }, { status: 404 })
  }

  /**
   * Female wrestlers are held out of scouting reports for now.
   *
   * Their national and in-season results are imported far less completely than the boys' — 3 of
   * 30 on national competition against 8, measured across the 2025 and 2026 classes — so a
   * report would understate wrestlers who are in fact signing. Refused here rather than hidden
   * in the page, because a hidden button is not a rule and this endpoint is reachable directly.
   */
  if (!scoutingReportAvailable(loaded.athlete as Record<string, unknown>)) {
    return NextResponse.json(
      { error: "Scouting reports are not available for this athlete yet." },
      { status: 404 },
    )
  }

  // Two grants: a .edu address unlocks browsing, a human check against the program's staff
  // directory unlocks the portable document with the athlete's contact and academics in it.
  const tier = scoutingAccessTier({
    isCollegeCoach: viewer.isCollegeCoach,
    isAdmin,
    verifiedCoach: viewer.verifiedCoach || isAdmin,
    verifiedMethod: (profile?.verified_method as string) ?? null,
  })
  const watermark =
    tier === "full"
      ? watermarkLine({
          name: profile?.full_name as string,
          institution: profile?.institution as string,
          email: profile?.email as string,
        })
      : null

  // State champions and placers are added here, not in loadOpponentIndex: the ranking engine
  // shares that loader and scores wins by reason. The same index as the profile: other states'
  // placers, Super 32 / NHSCA / Journeymen placers, and national rankings checked against each
  // bout's evidence - the last replacing loadOpponentIndex's name-only list, so the report and the
  // profile never disagree about who a wrestler beat.
  const [baseIndex, stateIndex] = await Promise.all([
    loadOpponentIndex(admin),
    loadStatePlacerIndex(admin, new Date(), { outOfState: true }).catch(() => ({
      statePlacers: [],
      stateSchools: [],
      fargoAllAmericans: [],
    })),
  ])
  const opponentIndex = { ...baseIndex, ...stateIndex }
  const report = await buildScoutingReport(
    admin,
    loaded.athlete as Record<string, unknown>,
    opponentIndex,
    tier,
    watermark,
  )
  const summary = await writeSummary(report)

  // Who pulled what, so a parent can see who is looking and a leak has a trail.
  await admin
    .from("scouting_report_access")
    .insert({
      athlete_id: id,
      viewer_user_id: user.id,
      viewer_name: (profile?.full_name as string) ?? null,
      viewer_email: (profile?.email as string) ?? user.email ?? null,
      viewer_institution: (profile?.institution as string) ?? null,
      access_tier: tier,
    })
    .then(undefined, () => undefined)

  return NextResponse.json({ report: { ...report, summary } })
}
