import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { bootstrapNhscaDualsEvent, ensureNhscaDualsDay1Schedule, fetchNhscaDualsSnapshot } from "@/lib/nhsca-duals-live-results/db"
import {
  NHSCA_DUALS_2026_NATIONAL_WRESTLER_CARDS,
} from "@/lib/nhsca-duals-2026-national-wrestler-cards"
import { NHSCA_DUALS_2026_SELECT_WRESTLER_CARDS } from "@/lib/nhsca-duals-2026-select-wrestler-cards"
import { buildTeamWrestlerStatsIndex } from "@/lib/nhsca-duals-wrestler-card-stats"
import type { NhscaDualsTeamType } from "@/lib/nhsca-duals-live-results/types"

export const dynamic = "force-dynamic"

/**
 * GET: Per-wrestler NHSCA Duals stats for roster flip cards (signed-in hub users).
 * ?team=national|select
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  const teamParam = request.nextUrl.searchParams.get("team")?.toLowerCase()
  const teamType: NhscaDualsTeamType = teamParam === "select" ? "select" : "national"

  const admin = createAdminClient()

  let snap = await fetchNhscaDualsSnapshot(admin)
  if (snap.ok && snap.data.teams.length > 0 && snap.data.duals.length === 0) {
    try {
      await ensureNhscaDualsDay1Schedule(admin)
      snap = await fetchNhscaDualsSnapshot(admin)
    } catch (e) {
      console.error("[RecruitNC] duals-wrestler-stats day1", e)
    }
  }
  if (!snap.ok || snap.data.teams.length === 0) {
    try {
      await bootstrapNhscaDualsEvent(admin)
      snap = await fetchNhscaDualsSnapshot(admin)
    } catch (e) {
      console.error("[RecruitNC] duals-wrestler-stats bootstrap", e)
    }
  }

  if (!snap.ok) {
    return NextResponse.json({ ready: false, teamType, stats: {} })
  }

  const cards =
    teamType === "select"
      ? NHSCA_DUALS_2026_SELECT_WRESTLER_CARDS.map((c) => ({
          wrestler: c.wrestler,
          weightClass: c.weightClass,
        }))
      : NHSCA_DUALS_2026_NATIONAL_WRESTLER_CARDS.map((c) => ({
          wrestler: c.wrestler,
          weightClass: c.weightClass,
        }))

  const stats = buildTeamWrestlerStatsIndex(snap.data, teamType, cards)

  return NextResponse.json({
    ready: true,
    teamType,
    stats,
    updatedAt: new Date().toISOString(),
  })
}
