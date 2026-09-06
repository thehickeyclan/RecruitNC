import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { classifyViewer } from "@/lib/viewer-role"
import { loadPublicAthleteProfile } from "@/lib/load-public-athlete-profile"
import {
  SUMMARY_SYSTEM_PROMPT,
  buildScoutingReport,
  loadOpponentIndex,
  summaryFacts,
} from "@/lib/scouting-report"
import { scoutingAccessTier, watermarkLine } from "@/lib/scouting-report-access"
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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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

  const opponentIndex = await loadOpponentIndex(admin)
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

/**
 * The narrative paragraph. Grounded strictly on the assembled facts — a scouting report that
 * invents a placement is worse than one with no summary at all, so a failure here returns
 * null and the page renders without it rather than guessing.
 */
async function writeSummary(report: Awaited<ReturnType<typeof buildScoutingReport>>): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 320,
        messages: [
          { role: "system", content: SUMMARY_SYSTEM_PROMPT },
          { role: "user", content: summaryFacts(report) },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) return null
    const data = await response.json()
    const text = String(data?.choices?.[0]?.message?.content ?? "").trim()
    return text || null
  } catch {
    return null
  }
}
