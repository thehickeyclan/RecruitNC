import type { SupabaseClient } from "@supabase/supabase-js"

export type TocFieldPublicationStatus = {
  weightClass: number
  athleteFieldLocked: boolean
  athleteFieldLockedAt: string | null
  athleteFieldLockedBy: string | null
}

type FieldPublicationRow = {
  weight_class: number
  athlete_field_locked: boolean
  athlete_field_locked_at: string | null
  athlete_field_locked_by: string | null
}

function mapRow(row: FieldPublicationRow): TocFieldPublicationStatus {
  return {
    weightClass: row.weight_class,
    athleteFieldLocked: row.athlete_field_locked === true,
    athleteFieldLockedAt: row.athlete_field_locked_at,
    athleteFieldLockedBy: row.athlete_field_locked_by,
  }
}

export async function listTocFieldPublicationStatuses(
  admin: SupabaseClient,
): Promise<{ statuses: TocFieldPublicationStatus[]; error: string | null }> {
  const { data, error } = await admin
    .from("toc_field_publication_status")
    .select("weight_class, athlete_field_locked, athlete_field_locked_at, athlete_field_locked_by")

  if (error) {
    return {
      statuses: [],
      error:
        error.code === "42P01"
          ? "Field publication status table is not configured."
          : error.message,
    }
  }

  return {
    statuses: ((data ?? []) as FieldPublicationRow[]).map(mapRow),
    error: null,
  }
}

export async function setTocAthleteFieldLocked({
  admin,
  weightClass,
  locked,
  userId,
}: {
  admin: SupabaseClient
  weightClass: number
  locked: boolean
  userId: string
}): Promise<{ status: TocFieldPublicationStatus } | { error: string }> {
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from("toc_field_publication_status")
    .upsert(
      {
        weight_class: weightClass,
        athlete_field_locked: locked,
        athlete_field_locked_at: locked ? now : null,
        athlete_field_locked_by: locked ? userId : null,
        updated_at: now,
      },
      { onConflict: "weight_class" },
    )
    .select("weight_class, athlete_field_locked, athlete_field_locked_at, athlete_field_locked_by")
    .single()

  if (error) {
    return {
      error:
        error.code === "42P01"
          ? "Field publication status table is not configured."
          : error.message,
    }
  }

  return { status: mapRow(data as FieldPublicationRow) }
}
