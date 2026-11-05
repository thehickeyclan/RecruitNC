/**
 * Reading and writing priorities answer sets (scripts/add-recruiting-priorities.sql). Server only,
 * service key only; every caller has already checked the login belongs to the wrestler's family.
 *
 * Versioning: a set is a draft until completed. Changing an answer in a completed set starts a new
 * version (a copy, with supersedes_id), so every completed version stays as it was. A change of
 * sharing class is not a new answer: it applies to the current set at once (tightening takes the
 * answer out of the other respondent's view immediately).
 */
import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { loadClaimAccount, relationshipForRole } from "@/lib/account-claim-role"
import type { CleanAnswer } from "@/lib/recruiting/priorities/answers"
import { defaultSharing, type Respondent, type SharingClass } from "@/lib/recruiting/priorities/questions"
import type { Answer, AnswerSet, FamilySets } from "@/lib/recruiting/priorities/sharing"

/** Postgres "relation does not exist": scripts/add-recruiting-priorities.sql has not been run. */
export const TABLE_MISSING = "42P01"

/**
 * Which set this login answers for this wrestler: a linked parent answers the parent set, the
 * wrestler's own login the athlete set. Null for anyone else (coaches included). A login that is
 * both (rare since the 3 Nov repair) is decided by the account's role.
 */
export async function respondentFor(admin: SupabaseClient, userId: string, athleteId: string): Promise<Respondent | null> {
  const [{ data: link }, { data: athlete }] = await Promise.all([
    admin.from("parent_athlete_links").select("athlete_id").eq("user_id", userId).eq("athlete_id", athleteId).maybeSingle(),
    admin.from("athletes").select("claimed_by_user_id").eq("id", athleteId).maybeSingle(),
  ])
  const owns = String(athlete?.claimed_by_user_id ?? "") === userId
  if (link && owns) {
    const rel = relationshipForRole(await loadClaimAccount(admin, userId).then((a) => ({ role: a.role, profile_type: a.profileType })), null)
    return rel === "self" ? "athlete" : "parent"
  }
  if (link) return "parent"
  if (owns) return "athlete"
  return null
}

type SetRow = { id: string; respondent: Respondent; version: number; completed_at: string | null }
type AnswerRow = { set_id: string; question_key: string; value: unknown; marker: Answer["marker"]; not_sure: boolean; sharing: SharingClass }

const toAnswer = (r: AnswerRow): Answer => ({ key: r.question_key, value: r.value, marker: r.marker ?? null, notSure: r.not_sure, sharing: r.sharing })

async function latestSet(admin: SupabaseClient, athleteId: string, respondent: Respondent): Promise<SetRow | null> {
  const { data, error } = await admin
    .from("priority_answer_sets")
    .select("id, respondent, version, completed_at")
    .eq("athlete_id", athleteId)
    .eq("respondent", respondent)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as SetRow | null) ?? null
}

async function answersOf(admin: SupabaseClient, setId: string): Promise<Answer[]> {
  const { data, error } = await admin.from("priority_answers").select("set_id, question_key, value, marker, not_sure, sharing").eq("set_id", setId)
  if (error) throw error
  return ((data ?? []) as AnswerRow[]).map(toAnswer)
}

/** The current set on each side, with its answers. */
export async function loadFamilySets(admin: SupabaseClient, athleteId: string): Promise<FamilySets> {
  const load = async (respondent: Respondent): Promise<AnswerSet | null> => {
    const s = await latestSet(admin, athleteId, respondent)
    return s ? { id: s.id, respondent, version: s.version, completedAt: s.completed_at, answers: await answersOf(admin, s.id) } : null
  }
  const [parent, athlete] = await Promise.all([load("parent"), load("athlete")])
  return { parent, athlete }
}

/** The set to write to: the draft if there is one, else a new version copied from the completed one. */
async function writableSet(admin: SupabaseClient, athleteId: string, respondent: Respondent, userId: string): Promise<string> {
  const latest = await latestSet(admin, athleteId, respondent)
  if (latest && !latest.completed_at) {
    await admin.from("priority_answer_sets").update({ edited_by: userId }).eq("id", latest.id)
    return latest.id
  }
  const { data, error } = await admin
    .from("priority_answer_sets")
    .insert({ athlete_id: athleteId, respondent, version: (latest?.version ?? 0) + 1, supersedes_id: latest?.id ?? null, edited_by: userId })
    .select("id")
    .single()
  if (error) throw error
  const id = String(data.id)
  if (latest) {
    const prior = await answersOf(admin, latest.id)
    if (prior.length) {
      const { error: copyErr } = await admin.from("priority_answers").insert(
        prior.map((a) => ({ set_id: id, question_key: a.key, value: a.value, marker: a.marker ?? null, not_sure: a.notSure ?? false, sharing: a.sharing })),
      )
      if (copyErr) throw copyErr
    }
  }
  return id
}

/** Save one answer. The class stays what the owner last chose, else the question's default. */
export async function saveAnswer(admin: SupabaseClient, input: { athleteId: string; respondent: Respondent; userId: string; answer: CleanAnswer }): Promise<void> {
  const setId = await writableSet(admin, input.athleteId, input.respondent, input.userId)
  const { data: existing } = await admin.from("priority_answers").select("sharing").eq("set_id", setId).eq("question_key", input.answer.key).maybeSingle()
  const sharing = (existing?.sharing as SharingClass | undefined) ?? defaultSharing(input.respondent, input.answer.key)
  const { error } = await admin.from("priority_answers").upsert(
    { set_id: setId, question_key: input.answer.key, value: input.answer.value, marker: input.answer.marker, not_sure: input.answer.notSure, sharing, answered_at: new Date().toISOString() },
    { onConflict: "set_id,question_key" },
  )
  if (error) throw error
}

/** Change who sees an answer, on the current set. Takes effect on the next read everywhere. */
export async function setSharing(admin: SupabaseClient, input: { athleteId: string; respondent: Respondent; key: string; sharing: SharingClass }): Promise<boolean> {
  const latest = await latestSet(admin, input.athleteId, input.respondent)
  if (!latest) return false
  const { data, error } = await admin.from("priority_answers").update({ sharing: input.sharing }).eq("set_id", latest.id).eq("question_key", input.key).select("question_key")
  if (error) throw error
  return Boolean(data?.length)
}

export async function completeSet(admin: SupabaseClient, input: { athleteId: string; respondent: Respondent; userId: string }): Promise<boolean> {
  const latest = await latestSet(admin, input.athleteId, input.respondent)
  if (!latest || latest.completed_at) return false
  const { error } = await admin.from("priority_answer_sets").update({ completed_at: new Date().toISOString(), edited_by: input.userId }).eq("id", latest.id)
  if (error) throw error
  return true
}
