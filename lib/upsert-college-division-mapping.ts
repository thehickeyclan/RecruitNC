import type { SupabaseClient } from "@supabase/supabase-js"
import { normalizeToCanonicalFull } from "@/lib/division-display"

/**
 * When you save an athlete with college + division (edit or add), upsert that college
 * into college_division_mappings so the single source of truth stays in sync.
 * Division is normalized to canonical form (NCAA Division I, etc.); if not recognized, we skip.
 */
export async function upsertCollegeDivisionMapping(
  supabase: SupabaseClient,
  collegeName: string,
  division: string
): Promise<void> {
  const college = collegeName?.trim()
  if (!college) return

  const canonicalDivision = normalizeToCanonicalFull(division)
  if (!canonicalDivision) return

  await supabase
    .from("college_division_mappings")
    .upsert(
      { college_name: college, division: canonicalDivision },
      { onConflict: "college_name" }
    )
}
