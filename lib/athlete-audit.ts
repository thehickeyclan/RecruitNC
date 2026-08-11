import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * The athlete change trail.
 *
 * Anyone signed in can edit any athlete — that is a deliberate product decision, and it
 * makes this log the control rather than a nice-to-have. It only works if it records the
 * things worth asking about later, and if reading it is not an exercise in scrolling past
 * rows where nothing changed.
 *
 * Two rules that were not being followed before:
 *   1. Ownership changes count. A claim or a parent link is the single event most likely to
 *      be disputed, and none of them were recorded at all.
 *   2. Unchanged fields do not count. A save used to write a row per field in the payload,
 *      so four of the five most recent entries read `academic_sat: "" -> ""`.
 */

/** What kind of event a row describes. Kept narrow so the viewer can filter on it. */
export type AthleteAuditChangeType =
  | "athlete_edit"
  | "admin_edit"
  | "profile_created"
  | "profile_claimed"
  | "parent_linked"
  | "parent_unlinked"

export type AthleteAuditEntry = {
  athleteId: string
  userId: string | null
  fieldName: string
  oldValue?: unknown
  newValue?: unknown
  changeType: AthleteAuditChangeType
  ipAddress?: string | null
  adminNotes?: string | null
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

/** The client IP, from whichever proxy header is present. */
export function auditIpFrom(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  )
}

/**
 * Write entries, dropping any where the value did not actually change.
 *
 * Never throws: a failed audit write must not fail the edit the user asked for. It is
 * logged loudly instead, because silent loss of the trail is the worst outcome.
 */
export async function recordAthleteChanges(
  admin: SupabaseClient,
  entries: AthleteAuditEntry[],
): Promise<{ written: number }> {
  const rows = entries
    .map((entry) => ({
      athlete_id: entry.athleteId,
      user_id: entry.userId,
      field_name: entry.fieldName,
      old_value: asText(entry.oldValue),
      new_value: asText(entry.newValue),
      change_type: entry.changeType,
      ip_address: entry.ipAddress ?? null,
      admin_notes: entry.adminNotes ?? null,
      created_at: new Date().toISOString(),
    }))
    // A no-op save is not a change. Ownership events are exempt: "claimed" is worth
    // recording even though it has no before-and-after value to show.
    .filter((row) => row.old_value !== row.new_value || row.change_type !== "athlete_edit")

  if (rows.length === 0) return { written: 0 }

  const { error } = await admin.from("athlete_audit_log").insert(rows)
  if (error) {
    console.error("[athlete-audit] failed to write audit rows:", error.message, {
      athleteIds: [...new Set(rows.map((r) => r.athlete_id))],
      changeType: rows[0]?.change_type,
    })
    return { written: 0 }
  }
  return { written: rows.length }
}

/** Convenience for the one-row ownership events, which have no field-level diff. */
export async function recordAthleteEvent(
  admin: SupabaseClient,
  event: {
    athleteId: string
    userId: string | null
    changeType: AthleteAuditChangeType
    detail: string
    previousDetail?: string
    ipAddress?: string | null
  },
): Promise<void> {
  await recordAthleteChanges(admin, [
    {
      athleteId: event.athleteId,
      userId: event.userId,
      fieldName: event.changeType,
      oldValue: event.previousDetail ?? "",
      newValue: event.detail,
      changeType: event.changeType,
      ipAddress: event.ipAddress ?? null,
    },
  ])
}
