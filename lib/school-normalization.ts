/**
 * Client-side school name normalization
 * This matches the database normalize_school_name() function behavior
 * Used for normalizing user input in queries and searches
 */

/**
 * Normalize a school name for querying/matching
 * This should match the database normalize_school_name() function behavior
 *
 * For exact matching, we should use the database function via RPC call
 * For client-side normalization (display, grouping), use this function
 */
export function normalizeSchoolNameForDisplay(name: string | null | undefined): string {
  if (!name) return ""

  return name
    .trim()
    .replace(/\s+High\s+School$/i, "")
    .replace(/\s+HS$/i, "")
    .replace(/\s+Academy$/i, "")
    .replace(/\s+School$/i, "")
    .replace(/\s+$/g, "")
    .trim()
}

/**
 * Normalize school name using database function (via RPC)
 * This ensures we get the canonical name from alias mappings
 *
 * @param supabase - Supabase client instance
 * @param schoolName - Raw school name to normalize
 * @returns Canonical school name from database
 */
export async function normalizeSchoolNameViaDB(
  supabase: { rpc: (fn: string, params: { input_name: string }) => Promise<{ data: string | null; error: unknown }> },
  schoolName: string | null | undefined
): Promise<string | null> {
  if (!schoolName || !schoolName.trim()) return null

  try {
    const { data, error } = await supabase.rpc("normalize_school_name", {
      input_name: schoolName.trim(),
    })

    if (error) {
      console.warn("[School Normalization] RPC error, falling back to client-side:", error)
      return normalizeSchoolNameForDisplay(schoolName)
    }

    return data ?? normalizeSchoolNameForDisplay(schoolName)
  } catch (err) {
    console.warn("[School Normalization] Exception, falling back to client-side:", err)
    return normalizeSchoolNameForDisplay(schoolName)
  }
}

/**
 * Normalize school name for search queries
 * Handles user input variations: case, apostrophes, "High School", etc.
 * Returns normalized name that can be used in ILIKE queries
 *
 * This is used when users type in search boxes - we normalize their input
 * to match against normalized database values
 *
 * Note: Since database values are normalized, we normalize user input the same way
 */
export function normalizeSchoolNameForSearch(userInput: string): string {
  if (!userInput) return ""

  // Normalize user input to match database normalization
  // This should match the database normalize_school_name() function logic
  return userInput
    .trim()
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\s+High\s+School$/i, "")
    .replace(/\s+HS$/i, "")
    .replace(/\s+Academy$/i, "")
    .replace(/\s+School$/i, "")
    .trim()
}

/**
 * Normalize school name for grouping/comparison (case-insensitive)
 * Used when building leaderboards - groups schools by normalized name
 * Since database is normalized, we just need case-insensitive comparison
 */
export function normalizeSchoolNameForGrouping(schoolName: string | null | undefined): string {
  if (!schoolName) return ""

  // Since database values are already normalized, just lowercase for grouping
  // This matches the current frontend behavior but works with normalized data
  return schoolName.trim().toLowerCase()
}

/**
 * Create search patterns for school name queries
 * Returns array of patterns to use with Supabase .or() or .ilike()
 * Handles variations the user might type
 */
export function createSchoolSearchPatterns(userInput: string): string[] {
  if (!userInput || !userInput.trim()) return []

  const normalized = normalizeSchoolNameForSearch(userInput)
  const patterns: string[] = []

  // Exact match (with variations)
  patterns.push(`%${normalized}%`)
  patterns.push(`%${userInput.trim()}%`)

  // If user typed with "High School", also search without it
  if (/\s+high\s+school$/i.test(userInput)) {
    patterns.push(`%${normalized}%`)
  }

  // If user typed without "High School", also search with it
  if (!/\s+high\s+school$/i.test(userInput) && !/\s+hs$/i.test(userInput)) {
    patterns.push(`%${normalized} High School%`)
    patterns.push(`%${normalized} HS%`)
  }

  // Remove duplicates
  return [...new Set(patterns)]
}
