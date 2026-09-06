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
    .select("role, profile_type, verified_coach, is_admin")
    .eq("user_id", user.id)
    .maybeSingle()

  const viewer = classifyViewer(profile ?? null)
  const allowed = viewer.isCollegeCoach || viewer.kind === "admin" || profile?.is_admin === true
  if (!allowed) {
    return NextResponse.json(
      { error: "Scouting reports are available to college coaches." },
      { status: 403 },
    )
  }

  const loaded = await loadPublicAthleteProfile(id, admin)
  if (!loaded.ok) {
    return NextResponse.json({ error: loaded.error }, { status: 404 })
  }

  const opponentIndex = await loadOpponentIndex(admin)
  const report = await buildScoutingReport(admin, loaded.athlete as Record<string, unknown>, opponentIndex)
  const summary = await writeSummary(report)

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
