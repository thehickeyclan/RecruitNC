import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  bootstrapNhscaDualsEvent,
  ensureNhscaDualsDay1Schedule,
  ensureNhscaDualsDay2Schedule,
  ensureNhscaDualsDay3Schedule,
  fetchNhscaDualsSnapshot,
} from "@/lib/nhsca-duals-live-results/db"
import { NHSCA_DUALS_2026_NATIONAL_WRESTLER_CARDS } from "@/lib/nhsca-duals-2026-national-wrestler-cards"
import { NHSCA_DUALS_2026_SELECT_WRESTLER_CARDS } from "@/lib/nhsca-duals-2026-select-wrestler-cards"
import { buildTeamWrestlerStatsIndex } from "@/lib/nhsca-duals-wrestler-card-stats"
import type { NhscaDualsTeamType } from "@/lib/nhsca-duals-live-results/types"

export const dynamic = "force-dynamic"

/** Public per-wrestler stats for archive athlete cards (no sign-in). */
export async function GET(request: NextRequest) {
  const teamParam = request.nextUrl.searchParams.get("team")?.toLowerCase()
  const teamType: NhscaDualsTeamType = teamParam === "select" ? "select" : "national"

  const admin = createAdminClient()
  let snap = await fetchNhscaDualsSnapshot(admin)

  try {
    if (snap.ok && snap.data.teams.length > 0) {
      await ensureNhscaDualsDay1Schedule(admin)
      await ensureNhscaDualsDay2Schedule(admin)
      await ensureNhscaDualsDay3Schedule(admin)
      snap = await fetchNhscaDualsSnapshot(admin)
    } else {
      await bootstrapNhscaDualsEvent(admin)
      snap = await fetchNhscaDualsSnapshot(admin)
    }
  } catch (e) {
    console.error("[RecruitNC] duals-wrestler-stats public", e)
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
