import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
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
 * Move a wrestler to a stage for the whole program: every staff row that exists is updated, and
 * the coach making the change gets a row if they had none (which also puts him on their board).
 */
export async function setProgramStage(admin: SupabaseClient, userId: string, athleteId: string, stage: PipelineStage) {
  const staff = await programStaffIds(admin, userId)
  const now = new Date().toISOString()
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
}
