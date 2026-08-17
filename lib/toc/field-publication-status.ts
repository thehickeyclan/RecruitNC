import type { SupabaseClient } from "@supabase/supabase-js"

export type TocFieldPublicationStatus = {
  weightClass: number
  athleteFieldLocked: boolean
  athleteFieldLockedAt: string | null
  athleteFieldLockedBy: string | null
  /**
   * Set once media has released this weight publicly. This — and only this — makes a weight visible on
   * the public field page. Locking the field means staff finished building it, which routinely happens
   * weeks before release, so the two must never be conflated.
   * @see import("./public-announced-field")
   */
  announcedAt: string | null
  announcedBy: string | null
}

type FieldPublicationRow = {
  weight_class: number
  athlete_field_locked: boolean
  athlete_field_locked_at: string | null
  athlete_field_locked_by: string | null
  announced_at?: string | null
  announced_by?: string | null
}

const STATUS_SELECT =
  "weight_class, athlete_field_locked, athlete_field_locked_at, athlete_field_locked_by, announced_at, announced_by"

function mapRow(row: FieldPublicationRow): TocFieldPublicationStatus {
  return {
    weightClass: row.weight_class,
    athleteFieldLocked: row.athlete_field_locked === true,
    athleteFieldLockedAt: row.athlete_field_locked_at,
    athleteFieldLockedBy: row.athlete_field_locked_by,
    announcedAt: row.announced_at ?? null,
    announcedBy: row.announced_by ?? null,
  }
}

export async function listTocFieldPublicationStatuses(
  admin: SupabaseClient,
): Promise<{ statuses: TocFieldPublicationStatus[]; error: string | null }> {
  const { data, error } = await admin.from("toc_field_publication_status").select(STATUS_SELECT)

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
    .select(STATUS_SELECT)
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

/**
 * Release or un-release a weight class publicly. Setting `announced` makes the weight's confirmed athletes
 * visible on `/tournament-of-champions/field` immediately, so callers must be full admins — never the scoped
 * TOC media role, which can read the private field board.
 *
 * Deliberately does not touch `athlete_field_locked`: a weight can be released without being locked, and a
 * locked weight stays private until someone releases it here.
 */
export async function setTocFieldAnnounced({
  admin,
  weightClass,
  announced,
  userId,
}: {
  admin: SupabaseClient
  weightClass: number
  announced: boolean
  userId: string
}): Promise<{ status: TocFieldPublicationStatus } | { error: string }> {
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from("toc_field_publication_status")
    .upsert(
      {
        weight_class: weightClass,
        announced_at: announced ? now : null,
        announced_by: announced ? userId : null,
        updated_at: now,
      },
      { onConflict: "weight_class" },
    )
    .select(STATUS_SELECT)
    .single()

  if (error) {
    if (error.code === "42703" || error.message?.includes("announced_at")) {
      return {
        error:
          "Public release columns are missing. Run the toc_field_publication_status announced_at migration before releasing a weight.",
      }
    }
    return {
      error: error.code === "42P01" ? "Field publication status table is not configured." : error.message,
    }
  }

  return { status: mapRow(data as FieldPublicationRow) }
}
