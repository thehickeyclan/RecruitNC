import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { isNhscaDualsAdmin } from "@/lib/nhsca-duals-live-results/auth"
import {
  TABLES_MISSING,
  clearDualResults,
  clearMatchResult,
  createDual,
  createDualForTeam,
  createEventDay,
  createPool,
  deleteAllEventDuals,
  deleteDual,
  bootstrapNhscaDualsEvent,
  ensureNhscaDualsDay1Schedule,
  fetchNhscaDualsSnapshot,
  resetAllEventMatchResults,
  saveNhscaDualsMatch,
  setDualStatus,
  updateDualMeta,
} from "@/lib/nhsca-duals-live-results/db"
import type { NhscaDualsMatchWinner, NhscaDualsResultType } from "@/lib/nhsca-duals-live-results/types"

export const dynamic = "force-dynamic"

/**
 * GET: Signed-in hub users — live NHSCA Duals results snapshot.
 * POST: Admin only — mat-side updates (seed, save match, add day/pool/dual, mark final).
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  const admin = createAdminClient()
  const isAdmin = await isNhscaDualsAdmin(user)

  if (isAdmin && request.nextUrl.searchParams.get("seed") === "1") {
    try {
      await bootstrapNhscaDualsEvent(admin)
    } catch (e) {
      console.error("[RecruitNC] nhsca duals bootstrap", e)
    }
  }

  let snap = await fetchNhscaDualsSnapshot(admin)
  if (snap.ok && snap.data.teams.length > 0 && snap.data.duals.length === 0) {
    try {
      await ensureNhscaDualsDay1Schedule(admin)
      snap = await fetchNhscaDualsSnapshot(admin)
    } catch (e) {
      console.error("[RecruitNC] nhsca duals day1 schedule", e)
    }
  }
  if (!snap.ok) {
    return NextResponse.json({
      tablesReady: false,
      isAdmin,
      message: "Run Supabase scripts: supabase-nhsca-duals-results-STEP-1/2/3",
    })
  }

  return NextResponse.json({
    tablesReady: true,
    isAdmin,
    ...snap.data,
  })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }
  if (!(await isNhscaDualsAdmin(user))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const action = String(body.action ?? "")
  const admin = createAdminClient()

  try {
    switch (action) {
      case "seed": {
        await bootstrapNhscaDualsEvent(admin)
        const snap = await fetchNhscaDualsSnapshot(admin)
        return NextResponse.json(snap.ok ? { ok: true, ...snap.data } : { ok: false, code: TABLES_MISSING })
      }
      case "save_match": {
        const result = await saveNhscaDualsMatch(admin, {
          matchId: String(body.matchId ?? ""),
          nc_wrestler_id: body.nc_wrestler_id as string | null | undefined,
          opponent_wrestler_name: body.opponent_wrestler_name as string | undefined,
          notes: body.notes as string | null | undefined,
          winner: body.winner as NhscaDualsMatchWinner | null | undefined,
          result_type: body.result_type as NhscaDualsResultType | null | undefined,
        })
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        const snap = await fetchNhscaDualsSnapshot(admin)
        return NextResponse.json(snap.ok ? { ok: true, ...snap.data } : { ok: true })
      }
      case "set_dual_status": {
        const result = await setDualStatus(admin, String(body.dualId ?? ""), body.status as "not_started" | "in_progress" | "final")
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        break
      }
      case "add_day": {
        const result = await createEventDay(admin, String(body.name ?? "New Day"))
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true, id: result.id })
      }
      case "add_pool": {
        const result = await createPool(admin, String(body.dayId ?? ""), String(body.teamId ?? ""), Number(body.poolNumber ?? 0))
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true, id: result.id })
      }
      case "add_dual": {
        const teamId = String(body.teamId ?? "")
        const dayId = String(body.dayId ?? "")
        const poolId = String(body.poolId ?? "")
        const result = poolId
          ? await createDual(admin, {
              team_id: teamId,
              day_id: dayId,
              pool_id: poolId,
              round_name: String(body.roundName ?? "Round"),
              opponent_team_name: String(body.opponentTeamName ?? "Opponent"),
            })
          : await createDualForTeam(admin, {
              team_id: teamId,
              day_id: dayId,
              opponent_team_name: String(body.opponentTeamName ?? "Opponent"),
              round_name: String(body.roundName ?? "Round 1"),
              pool_number: Number(body.poolNumber ?? 1),
            })
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true, id: result.id })
      }
      case "clear_match": {
        const result = await clearMatchResult(admin, String(body.matchId ?? ""))
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        break
      }
      case "clear_dual": {
        const result = await clearDualResults(admin, String(body.dualId ?? ""))
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        break
      }
      case "delete_dual": {
        const result = await deleteDual(admin, String(body.dualId ?? ""))
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        break
      }
      case "reset_all_results": {
        const result = await resetAllEventMatchResults(admin)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        break
      }
      case "reset_all_duals": {
        const result = await deleteAllEventDuals(admin)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        break
      }
      case "update_dual": {
        const result = await updateDualMeta(admin, String(body.dualId ?? ""), {
          round_name: body.roundName as string | undefined,
          opponent_team_name: body.opponentTeamName as string | undefined,
          pool_id: body.poolId as string | undefined,
          day_id: body.dayId as string | undefined,
        })
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        break
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    const snap = await fetchNhscaDualsSnapshot(admin)
    return NextResponse.json(snap.ok ? { ok: true, ...snap.data } : { ok: true })
  } catch (e) {
    console.error("[RecruitNC] nhsca duals POST", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
