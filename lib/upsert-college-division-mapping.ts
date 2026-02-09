import type { SupabaseClient } from "@supabase/supabase-js"
import { normalizeToCanonicalFull } from "@/lib/division-display"
import { normalizeCollegeToCanonical } from "@/lib/canonical-college"

/**
 * When you save an athlete with college + division, upsert that college into
 * college_division_mappings (single source of truth). College is stored in canonical
 * form (e.g. NC State, Mount Olive); division in canonical form (NCAA Division I, etc.).
 */
export async function upsertCollegeDivisionMapping(
  supabase: SupabaseClient,
  collegeName: string,
  division: string
): Promise<void> {
  const college = normalizeCollegeToCanonical(collegeName) || collegeName?.trim()
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
