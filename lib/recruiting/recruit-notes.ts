import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * A program's private notes on a wrestler (coach_athlete_notes), for the recruiting file.
 *
 * Private to the program's staff: every coach of the same school reads them, nobody else does -
 * not the family, not another program, not a coach who has since moved schools. So a note carries
 * the school it was written for (school_id, scripts/add-coach-notes-school.sql) and is read by it.
 * A coach with no school attached shares with nobody.
 *
 * Read and written only here, with the service client; the table has RLS on and no grants to
 * anon or authenticated, so a browser cannot reach it.
 */

export type RecruitNote = { id: string; note: string; createdAt: string; by: string; mine: boolean }

const TABLE = "coach_athlete_notes"
/** Postgres "column does not exist": the school_id SQL has not been run yet. */
const COLUMN_MISSING = "42703"
export const MAX_NOTE = 4000

export type NoteAuthor = { userId: string; schoolId: string | null }

export function cleanNote(raw: unknown): string | null {
  const s = String(raw ?? "").replace(/\r\n/g, "\n").trim().slice(0, MAX_NOTE)
  return s || null
}

async function staffOf(admin: SupabaseClient, me: NoteAuthor): Promise<Map<string, string>> {
  const { data } = me.schoolId
    ? await admin.from("user_profiles").select("user_id, full_name").eq("school_id", me.schoolId)
    : await admin.from("user_profiles").select("user_id, full_name").eq("user_id", me.userId)
  const names = new Map((data ?? []).map((p) => [String(p.user_id), String(p.full_name ?? "").trim() || "Staff"]))
  names.set(me.userId, "You")
  return names
}

export async function listNotes(admin: SupabaseClient, me: NoteAuthor, athleteId: string): Promise<RecruitNote[]> {
  const staff = await staffOf(admin, me)
  const scoped = me.schoolId
    ? await admin.from(TABLE).select("id, note, created_at, coach_user_id").eq("athlete_id", athleteId).eq("school_id", me.schoolId).order("created_at", { ascending: false })
    : await admin.from(TABLE).select("id, note, created_at, coach_user_id").eq("athlete_id", athleteId).eq("coach_user_id", me.userId).is("school_id", null).order("created_at", { ascending: false })
  let rows = scoped.data
  if (scoped.error?.code === COLUMN_MISSING) {
    // Before the SQL: today's staff, by who wrote it.
    const legacy = await admin.from(TABLE).select("id, note, created_at, coach_user_id").eq("athlete_id", athleteId).in("coach_user_id", [...staff.keys()]).order("created_at", { ascending: false })
    rows = legacy.data
  } else if (scoped.error) throw new Error(`notes: ${scoped.error.message}`)
  const names = new Map(staff)
  const unknown = [...new Set((rows ?? []).map((r) => String(r.coach_user_id)).filter((id) => !names.has(id)))]
  if (unknown.length) {
    const { data } = await admin.from("user_profiles").select("user_id, full_name").in("user_id", unknown)
    for (const p of data ?? []) names.set(String(p.user_id), String(p.full_name ?? "").trim() || "Former staff")
  }
  return (rows ?? []).map((r) => ({
    id: String(r.id),
    note: String(r.note ?? ""),
    createdAt: String(r.created_at),
    by: names.get(String(r.coach_user_id)) ?? "Former staff",
    mine: String(r.coach_user_id) === me.userId,
  }))
}

export async function addNote(admin: SupabaseClient, me: NoteAuthor, athleteId: string, note: string): Promise<RecruitNote> {
  const row = { athlete_id: athleteId, coach_user_id: me.userId, note, school_id: me.schoolId }
  let res = await admin.from(TABLE).insert(row).select("id, note, created_at").single()
  if (res.error?.code === COLUMN_MISSING) {
    const { school_id: _s, ...legacy } = row
    res = await admin.from(TABLE).insert(legacy).select("id, note, created_at").single()
  }
  if (res.error || !res.data) throw new Error(`notes: ${res.error?.message ?? "insert failed"}`)
  return { id: String(res.data.id), note: String(res.data.note), createdAt: String(res.data.created_at), by: "You", mine: true }
}

/** Only the coach who wrote a note may change or remove it; the rest of the staff reads it. */
export async function updateNote(admin: SupabaseClient, me: NoteAuthor, noteId: string, note: string): Promise<boolean> {
  const { data, error } = await admin.from(TABLE).update({ note, updated_at: new Date().toISOString() }).eq("id", noteId).eq("coach_user_id", me.userId).select("id")
  return !error && (data?.length ?? 0) > 0
}

export async function deleteNote(admin: SupabaseClient, me: NoteAuthor, noteId: string): Promise<boolean> {
  const { data, error } = await admin.from(TABLE).delete().eq("id", noteId).eq("coach_user_id", me.userId).select("id")
  return !error && (data?.length ?? 0) > 0
}

export async function countNotes(admin: SupabaseClient, me: NoteAuthor, athleteId: string): Promise<number> {
  return (await listNotes(admin, me, athleteId).catch(() => [])).length
}
