import type { SupabaseClient } from "@supabase/supabase-js"

/** Fallback when athletes table is empty: every column name ever referenced in codebase (snake + camel). */
const KNOWN_ATHLETE_COLUMNS = new Set([
  "id", "name", "firstname", "lastname", "firstName", "lastName",
  "gender", "graduationyear", "weightclass", "highschool", "high_school_division",
  "college_weight_class", "wrestling_club", "wrestlingClub", "location",
  "contact_email", "contactEmail", "email", "phone", "cell", "cell_number",
  "bio", "bio_headline", "achievements", "additional_achievements",
  "state_qualifier", "regional_placer", "conference_placer", "career_record",
  "highlight_video_url", "headshot_url", "photourl", "photo_url",
  "gpa", "sat", "act", "academic_summary", "academic_interest",
  "super_32_2023_record", "super_32_2023_placement", "super_32_2024_record", "super_32_2024_placement",
  "super_32_2025_record", "super_32_2025_placement",
  "nhsca_2023_record", "nhsca_2023_placement", "nhsca_2024_record", "nhsca_2024_placement",
  "nhsca_2025_record", "nhsca_2025_placement",
  "nationally_ranked_wins", "college_opens_experience",
  "recruiting_status", "is_prospect", "profile_verified", "prospect_ranking",
  "claimed_by_user_id", "claimed_at", "updated_at",
  "hs_matches_uploaded", "admin_reviewed",
  "socialMedia", "social_media",
  "college", "college_id", "commitmentdate", "commitment_date",
  "ncUnitedTeam", "ncunitedteam", "nc_united_team", "team",
])

/** Postgres uuid columns — empty string must become null, not "". */
const ATHLETE_UUID_COLUMNS = new Set(["college_id", "claimed_by_user_id"])

function normalizeAthleteUuidValue(key: string, value: unknown): unknown {
  if (!ATHLETE_UUID_COLUMNS.has(key)) return value
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s === "" ? null : s
}

/**
 * Get the set of column names that exist on the athletes table.
 * Merges keys from several rows so we don’t miss `firstName` / `lastName` when one sample row omitted null keys
 * (Supabase/PostgREST sometimes omits null fields — Data Dawg then picked wrong column names and every search returned empty).
 */
export async function getAthletesColumnNames(
  adminSupabase: SupabaseClient
): Promise<Set<string>> {
  const { data: rows } = await adminSupabase.from("athletes").select("*").limit(12)

  const names = new Set<string>()
  for (const row of rows ?? []) {
    if (row && typeof row === "object") {
      for (const k of Object.keys(row as Record<string, unknown>)) {
        names.add(k)
      }
    }
  }
  if (names.size > 0) {
    return names
  }
  return new Set(KNOWN_ATHLETE_COLUMNS)
}

/** Map: preferred key -> list of alternate column names (e.g. DB might use contactEmail instead of contact_email). */
const COLUMN_ALIASES: Record<string, string[]> = {
  contact_email: ["contact_email", "contactEmail", "email"],
  contactEmail: ["contactEmail", "contact_email", "email"],
  firstname: ["firstname", "firstName"],
  lastname: ["lastname", "lastName"],
  firstName: ["firstName", "firstname"],
  lastName: ["lastName", "lastname"],
  wrestling_club: ["wrestling_club", "wrestlingClub"],
}

/**
 * Return a payload that only includes keys that exist on the athletes table.
 * For keys with known alternates (e.g. contact_email vs contactEmail), uses the first alternate that exists.
 */
export function filterPayloadToSchema(
  payload: Record<string, unknown>,
  columns: Set<string>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined) continue
    const keyToUse = columns.has(key)
      ? key
      : COLUMN_ALIASES[key]?.find((alt) => columns.has(alt))
    if (keyToUse) out[keyToUse] = normalizeAthleteUuidValue(keyToUse, value)
  }
  return out
}
