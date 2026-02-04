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
  "hs_matches_uploaded",
  "socialMedia", "social_media",
])

/**
 * Get the set of column names that exist on the athletes table.
 * Queries the DB first (one row); if table is empty, returns a known allowlist so we never send invalid columns.
 */
export async function getAthletesColumnNames(
  adminSupabase: SupabaseClient
): Promise<Set<string>> {
  const { data: sample } = await adminSupabase
    .from("athletes")
    .select("*")
    .limit(1)
    .maybeSingle()

  if (sample && typeof sample === "object" && Object.keys(sample).length > 0) {
    return new Set(Object.keys(sample))
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
    if (keyToUse) out[keyToUse] = value
  }
  return out
}
