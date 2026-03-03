/**
 * Auto-fetch NHSCA placement data for athlete profiles
 * Similar to how NCHSAA data is automatically pulled in
 */

import { SupabaseClient } from "@supabase/supabase-js"

function escapeForIlike(s: string): string {
  return (s ?? "").replace(/'/g, "''")
}

export interface NHSCAPlacement {
  year: number
  placement: number | string
  record?: string
  weight: string
  division: string
  notes?: string
}

/**
 * Fetch NHSCA placements for an athlete by name
 * Searches last 4 years of data from nhsca_placements table
 */
export async function getNHSCAPlacements(
  supabase: SupabaseClient,
  athleteName: string,
  graduationYear?: number
): Promise<NHSCAPlacement[]> {
  if (!athleteName?.trim()) {
    return []
  }

  // Calculate year range (last 4 years)
  const currentYear = new Date().getFullYear()
  const startYear = graduationYear ? Math.max(graduationYear - 4, currentYear - 4) : currentYear - 4
  const endYear = graduationYear || currentYear

  try {
    const namesToTry = [athleteName.trim()]
    const noApostrophe = athleteName.trim().replace(/'/g, "").trim()
    if (noApostrophe && noApostrophe !== namesToTry[0]) namesToTry.push(noApostrophe)

    let placements: any[] | null = null
    let lastError: Error | null = null
    for (const name of namesToTry) {
      const pattern = `%${escapeForIlike(name)}%`
      const { data, error } = await supabase
        .from("nhsca_placements")
        .select("*")
        .ilike("athlete_name", pattern)
        .gte("year", startYear)
        .lte("year", endYear)
        .order("year", { ascending: false })
        .order("placement", { ascending: true })
      if (error) {
        lastError = error
        continue
      }
      if (data?.length) {
        placements = data
        break
      }
    }

    if (lastError) {
      console.error("Error fetching NHSCA placements:", lastError)
      return []
    }

    if (!placements || placements.length === 0) {
      return []
    }

    // Convert to standardized format
    return placements.map((p) => ({
      year: p.year,
      placement:
        p.placement === null || p.placement === undefined
          ? "Participated" // For non-placers, show they participated
          : typeof p.placement === "number"
            ? p.placement === 1
              ? "Champion"
              : p.placement === 2
                ? "Finalist"
                : p.placement === 3
                  ? "3rd"
                  : p.placement === 4
                    ? "4th"
                    : p.placement === 5
                      ? "5th"
                      : p.placement === 6
                        ? "6th"
                        : p.placement === 7
                          ? "7th"
                          : p.placement === 8
                            ? "8th"
                            : p.placement.toString()
            : p.placement,
      record: p.record || "",
      weight: p.weight_class || "",
      division: p.division || "",
      notes: p.notes || "",
      placed: p.placement !== null && p.placement !== undefined, // Flag for filtering/sorting
    }))
  } catch (error) {
    console.error("Exception fetching NHSCA placements:", error)
    return []
  }
}

/**
 * Convert NHSCA placements to nhsca_results JSONB format
 * Used when creating/updating athlete profiles
 */
export function formatNHSCAForProfile(placements: NHSCAPlacement[]): any[] {
  if (!placements || placements.length === 0) {
    return []
  }

  return placements.map((p) => ({
    year: p.year,
    placement: p.placement,
    record: p.record || "",
    weight: p.weight || "",
    division: p.division || "",
    notes: p.notes || "",
  }))
}

/**
 * Merge NHSCA results, overwriting existing entries for the same year
 * This ensures that if data is submitted multiple times for the same year, it overwrites instead of duplicating
 */
export function mergeNHSCAResults(
  existingResults: any[] | null | undefined,
  newResults: any[]
): any[] {
  if (!existingResults || !Array.isArray(existingResults)) {
    return newResults
  }

  if (!newResults || newResults.length === 0) {
    return existingResults
  }

  // Create a map of new results by year (for overwriting)
  const newResultsByYear = new Map<number, any>()
  newResults.forEach((result) => {
    if (result.year) {
      newResultsByYear.set(result.year, result)
    }
  })

  // Filter out existing results for years that are being updated
  const filteredExisting = existingResults.filter((existing) => {
    if (!existing.year) return true
    return !newResultsByYear.has(existing.year)
  })

  // Combine: existing (filtered) + new (overwrites)
  const merged = [...filteredExisting, ...newResults]

  // Sort by year descending
  return merged.sort((a, b) => (b.year || 0) - (a.year || 0))
}

/**
 * Auto-fetch and format NHSCA data for profile creation
 * Returns data ready to insert into athletes.nhsca_results
 * 
 * If merging with existing data, use mergeNHSCAResults() to ensure overwriting by year
 */
export async function autoFetchNHSCAForProfile(
  supabase: SupabaseClient,
  athleteName: string,
  graduationYear?: number
): Promise<any[]> {
  const placements = await getNHSCAPlacements(supabase, athleteName, graduationYear)
  return formatNHSCAForProfile(placements)
}

