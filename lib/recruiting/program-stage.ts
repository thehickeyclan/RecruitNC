import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { logBoardEvent } from "@/lib/recruiting/board-events"
import { normalizeStage, type PipelineStage } from "@/lib/recruiting/pipeline"

/**
 * A wrestler's funnel stage belongs to the program, not to the coach who set it (Matt, 11 October
 * 2026): the head coach and an assistant looking at the same board see the same stage.
 *
 * It is still stored on each coach's own row (college_coach_stars.pipeline_stage), which is where
 * every per-coach note and override lives. So the rule is kept on both sides: a change is written
 * to every staff row for that wrestler, and a read takes the most recently changed staff row -
 * which also settles the few wrestlers whose staff rows disagreed before this (8 on that date).
 */
type StageRow = { athlete_id: string; pipeline_stage?: string | null; updated_at?: string | null; starred_at?: string | null }

/** One stage per wrestler from a program's star rows. */
export function programStages(rows: StageRow[]): Map<string, PipelineStage> {
  const latest = new Map<string, { at: string; stage: PipelineStage }>()
  for (const r of rows) {
    const at = String(r.updated_at ?? r.starred_at ?? "")
    const cur = latest.get(r.athlete_id)
    if (!cur || at > cur.at) latest.set(r.athlete_id, { at, stage: normalizeStage(r.pipeline_stage) })
  }
  return new Map([...latest].map(([id, v]) => [id, v.stage]))
}

/** The coach and everyone on their program's staff; just the coach when no program is attached. */
export async function programStaffIds(admin: SupabaseClient, userId: string): Promise<string[]> {
  const { data: me } = await admin.from("user_profiles").select("school_id").eq("user_id", userId).maybeSingle()
  if (!me?.school_id) return [userId]
  const { data: staff } = await admin.from("user_profiles").select("user_id").eq("school_id", me.school_id)
  return [...new Set([userId, ...(staff ?? []).map((s) => String(s.user_id))])]
}

/**
 * A coach wrote to a wrestler through the platform: that is contact. If the program has him on
 * its board and still at Prospect, he moves to Contacted - the same step logging a first call
 * takes (activity-helpers.ts). A wrestler who is not on the board is left off it; messaging
 * someone is not the same as deciding to track him.
 */
export async function noteCoachMessaged(admin: SupabaseClient, coachUserId: string, athleteId: string) {
  const staff = await programStaffIds(admin, coachUserId)
  const { data: stars } = await admin
    .from("college_coach_stars")
    .select("athlete_id, pipeline_stage, updated_at, starred_at")
    .eq("athlete_id", athleteId)
    .in("coach_user_id", staff)
  if (!stars?.length) return
  if (programStages(stars as StageRow[]).get(athleteId) !== "Prospect") return
  await setProgramStage(admin, coachUserId, athleteId, "Contacted")
}

/**
 * Move a wrestler to a stage for the whole program: every staff row that exists is updated, and
 * the coach making the change gets a row if they had none (which also puts him on their board).
 */
export async function setProgramStage(admin: SupabaseClient, userId: string, athleteId: string, stage: PipelineStage) {
  const staff = await programStaffIds(admin, userId)
  const now = new Date().toISOString()
  const { data: before } = await admin
    .from("college_coach_stars")
    .select("athlete_id, pipeline_stage, updated_at, starred_at")
    .eq("athlete_id", athleteId)
    .in("coach_user_id", staff)
  const from = before?.length ? programStages(before as StageRow[]).get(athleteId) : null
  const { error: syncError } = await admin
    .from("college_coach_stars")
    .update({ pipeline_stage: stage, updated_at: now })
    .eq("athlete_id", athleteId)
    .in("coach_user_id", staff)
  if (syncError) throw new Error(syncError.message)

  const { data: mine } = await admin
    .from("college_coach_stars")
    .select("id")
    .eq("coach_user_id", userId)
    .eq("athlete_id", athleteId)
    .maybeSingle()
  if (!mine) {
    const { error } = await admin
      .from("college_coach_stars")
      .insert({ coach_user_id: userId, athlete_id: athleteId, pipeline_stage: stage, starred_at: now, updated_at: now })
    if (error) throw new Error(error.message)
  }
  if (from !== stage) await logBoardEvent(admin, { actor: userId, athleteId, kind: "stage", detail: from ? `from ${from} to ${stage}` : `to ${stage}` })
}

/**
 * Whether a wrestler has applied to the school, and when - the question every coach asks. It is
 * a fact about the wrestler, not a step in the funnel (he may apply before he visits or after he
 * is offered), so it sits beside the stage rather than in it. Like the stage it belongs to the
 * program: a change is written to every staff row, and a read takes the most recently changed one.
 *
 * Only applied or not, with the date (Matt, 12 October 2026). Admitted, denied and aid packages
 * are left out on purpose for now.
 */
type AppliedRow = StageRow & { has_applied?: boolean | null; applied_date?: string | null }

export function programApplied(rows: AppliedRow[]): Map<string, { applied: boolean; date: string | null }> {
  const latest = new Map<string, { at: string; applied: boolean; date: string | null }>()
  for (const r of rows) {
    const at = String(r.updated_at ?? r.starred_at ?? "")
    const cur = latest.get(r.athlete_id)
    if (!cur || at > cur.at) latest.set(r.athlete_id, { at, applied: r.has_applied === true, date: r.has_applied === true ? (r.applied_date ?? null) : null })
  }
  return new Map([...latest].map(([id, v]) => [id, { applied: v.applied, date: v.date }]))
}

export async function setProgramApplied(admin: SupabaseClient, userId: string, athleteId: string, applied: boolean, date: string | null) {
  const staff = await programStaffIds(admin, userId)
  const now = new Date().toISOString()
  const values = { has_applied: applied, applied_date: applied ? (date ?? now) : null, updated_at: now }
  const { data: before } = await admin.from("college_coach_stars").select("athlete_id, has_applied, applied_date, updated_at, starred_at").eq("athlete_id", athleteId).in("coach_user_id", staff)
  const was = programApplied((before ?? []) as AppliedRow[]).get(athleteId)?.applied === true
  const { error } = await admin.from("college_coach_stars").update(values).eq("athlete_id", athleteId).in("coach_user_id", staff)
  if (error) throw new Error(error.message)
  const { data: mine } = await admin.from("college_coach_stars").select("id").eq("coach_user_id", userId).eq("athlete_id", athleteId).maybeSingle()
  if (!mine) {
    const inserted = await admin.from("college_coach_stars").insert({ coach_user_id: userId, athlete_id: athleteId, starred_at: now, ...values })
    if (inserted.error) throw new Error(inserted.error.message)
  }
  if (was !== applied) await logBoardEvent(admin, { actor: userId, athleteId, kind: "applied", detail: applied ? "applied" : "cleared" })
  return { has_applied: values.has_applied, applied_date: values.applied_date }
}
