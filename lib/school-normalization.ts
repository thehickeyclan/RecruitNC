/**
 * School name normalization for search and display.
 * Stub for LEGACYNC Schools migration — replace with full copy from Legacy NC
 * (normalizeSchoolNameForSearch, createSchoolSearchPatterns, optional RPC normalize_school_name).
 * See docs/LEGACYNC-TAB-MIGRATION.md Phase 3.
 */

/** Normalize for display (client-side fallback when RPC normalize_school_name is not used). */
export function normalizeSchoolNameForDisplay(input: string | null | undefined): string {
  if (input == null || typeof input !== "string") return ""
  return input.trim().replace(/\s+/g, " ")
}

/** Normalize for search — stub; Legacy may use RPC or more logic. */
export function normalizeSchoolNameForSearch(input: string | null | undefined): string {
  return normalizeSchoolNameForDisplay(input)
}

/** Build search patterns for ilike — stub; Legacy may build multiple patterns. */
export function createSchoolSearchPatterns(input: string | null | undefined): string[] {
  const n = normalizeSchoolNameForSearch(input)
  if (!n) return []
  return [n, `%${n}%`]
}
