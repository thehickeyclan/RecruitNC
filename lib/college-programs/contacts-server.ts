import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { isContactKind, type CollegeContact } from "@/lib/college-programs/contacts"

/** Postgres "relation does not exist": scripts/add-college-contacts.sql has not been run yet. */
const TABLE_MISSING = "42P01"

/** Every contact logged for these wrestlers, newest first. Empty, never an error, before the table exists. */
export async function loadCollegeContacts(admin: SupabaseClient, athleteIds: string[]): Promise<CollegeContact[]> {
  if (!athleteIds.length) return []
  const { data, error } = await admin
    .from("college_contacts")
    .select("id, athlete_id, school_id, kind, happened_on, note")
    .in("athlete_id", athleteIds)
    .order("happened_on", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) {
    if (error.code !== TABLE_MISSING) console.error("[college-contacts] read failed", error.message)
    return []
  }
  return (data ?? []).flatMap((r) =>
    isContactKind(r.kind)
      ? [{ id: String(r.id), athleteId: String(r.athlete_id), schoolId: String(r.school_id), kind: r.kind, happenedOn: String(r.happened_on), note: r.note ? String(r.note) : null }]
      : [],
  )
}
