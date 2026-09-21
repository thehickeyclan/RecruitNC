import { NextResponse } from "next/server"
import { loadPublicAthleteProfile } from "@/lib/load-public-athlete-profile"
import { recruitNcDebugLogProfile } from "@/lib/recruitnc-debug"
import { createClient } from "@/lib/supabase/server"
import { stripPrivateAthleteFields, viewerMaySeeAthletePrivateInfo } from "@/lib/athlete-private-fields"

/**
 * GET /api/athlete/[id]
 * Returns athlete with NHSCA, Super32 (and NCHSAA/National Team from row) merged from tournament tables.
 * Used by view-profile prefetch and unified-profile so tournament data appears on public profiles.
 *
 * Open, and it stays open — but it used to answer with the entire athletes row, so a cell number,
 * a contact email, a GPA and a date of birth were one unauthenticated request away for any athlete
 * whose id you had, and the id is in every profile link. The page never drew those fields for a
 * stranger; it just received them.
 *
 * Now the row is stripped unless the viewer is the athlete, an admin or a verified coach — the
 * same three the profile page draws the private block for. A personalised answer must not be
 * cached at the edge, so the entitled response says no-store and only the public one is shared.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const start = Date.now()
  try {
    const { id } = await params
    const result = await loadPublicAthleteProfile(id)

    if (!result.ok) {
      const status = result.error === "missing id" ? 400 : 200
      return NextResponse.json(
        { ok: false, error: result.error, code: result.code },
        { status },
      )
    }

    const athlete = result.athlete
    const supabase = await createClient()
    const entitled = await viewerMaySeeAthletePrivateInfo(supabase, athlete as { claimed_by_user_id?: unknown })
    const payload = entitled ? athlete : stripPrivateAthleteFields(athlete as Record<string, unknown>)
    recruitNcDebugLogProfile("GET /api/athlete/[id] bundle", {
      elapsedMs: Date.now() - start,
      athleteIdPrefix: id.trim().slice(0, 8),
      nhscaResultRows: Array.isArray(athlete.nhsca_results) ? athlete.nhsca_results.length : 0,
      nchsaaProfileRows: Array.isArray(athlete.nchsaa_profile) ? athlete.nchsaa_profile.length : 0,
      super32FromTable: Array.isArray(athlete.super32_results) ? athlete.super32_results.length : 0,
      nationalTeamMerged: Array.isArray(athlete.national_team_results)
        ? athlete.national_team_results.length
        : 0,
    })

    return NextResponse.json(
      { ok: true, athlete: payload },
      {
        headers: {
          "Cache-Control": entitled ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[RecruitNC] GET /api/athlete/[id] exception", { message, elapsed: Date.now() - start })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
