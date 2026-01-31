/**
 * Tournament Results Utilities
 * Helper functions to work with both old and new tournament data formats
 * Provides backwards compatibility during migration
 */

export interface TournamentResult {
  year: number
  placement: string
  record?: string
  weight?: string
  division?: string
  notes?: string
}

/**
 * Get NHSCA results from athlete data
 * Works with both old columns and new JSON format
 * Prioritizes new JSON format if available
 */
function parseJsonField(field: any): any[] {
  if (!field) return []
  if (Array.isArray(field)) return field
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function getNhscaResults(athlete: any): TournamentResult[] {
  const jsonResults = parseJsonField(athlete?.nhsca_results)
  if (jsonResults.length > 0) {
    return jsonResults.map((result: any) => ({
      year: typeof result.year === "number" ? result.year : parseInt(String(result.year), 10) || new Date().getFullYear(),
      placement: String(result.placement ?? result.place ?? ""),
      record: result.record || '',
      weight: result.weight || '',
      division: result.division || '',
      notes: result.notes || '',
    }))
  }

  // Fallback to old column format
  const results: TournamentResult[] = []
  
  const years = [2025, 2024, 2023]
  for (const year of years) {
    const placement = athlete[`nhsca_${year}_placement`]
    const record = athlete[`nhsca_${year}_record`]
    
    if (placement || record) {
      results.push({
        year,
        placement: placement || '',
        record: record || '',
        weight: athlete.weightclass || '',
        division: '',
      })
    }
  }
  
  return results
}

/**
 * Get Super 32 results from athlete data
 * Works with both old columns and new JSON format
 * Prioritizes new JSON format if available
 */
export function getSuper32Results(athlete: any): TournamentResult[] {
  const jsonResults = parseJsonField(athlete?.super32_results ?? athlete?.super_32_results)
  if (jsonResults.length > 0) {
    return jsonResults.map((result: any) => ({
      year: typeof result.year === "number" ? result.year : parseInt(String(result.year), 10) || new Date().getFullYear(),
      placement: String(result.placement ?? result.place ?? ""),
      record: result.record || '',
      weight: result.weight || '',
      division: result.division || '',
      notes: result.notes || '',
    }))
  }

  // Fallback to old column format
  const results: TournamentResult[] = []
  
  const years = [2025, 2024, 2023]
  for (const year of years) {
    const placement = athlete[`super_32_${year}_placement`]
    const record = athlete[`super_32_${year}_record`]
    
    if (placement || record) {
      results.push({
        year,
        placement: placement || '',
        record: record || '',
        weight: athlete.weightclass || '',
        division: '',
      })
    }
  }
  
  return results
}

/**
 * Get most recent NHSCA result (for cards/previews)
 */
export function getLatestNhscaResult(athlete: any): { placement: string; record: string } | null {
  const results = getNhscaResults(athlete)
  if (results.length === 0) return null
  
  const latest = results.sort((a, b) => b.year - a.year)[0]
  return {
    placement: latest.placement,
    record: latest.record || '',
  }
}

/**
 * Get most recent Super 32 result (for cards/previews)
 */
export function getLatestSuper32Result(athlete: any): { placement: string; record: string } | null {
  const results = getSuper32Results(athlete)
  if (results.length === 0) return null
  
  const latest = results.sort((a, b) => b.year - a.year)[0]
  return {
    placement: latest.placement,
    record: latest.record || '',
  }
}

/**
 * Format placement for display
 */
export function formatPlacement(placement: string): string {
  const p = placement.toLowerCase()
  
  // Check for numeric placement
  const num = parseInt(placement)
  if (!isNaN(num)) {
    if (num === 1) return 'Champion'
    if (num === 2) return 'Finalist'
    const ordinal = num === 3 ? '3rd' : num === 4 ? '4th' : `${num}th`
    return `${ordinal} Place`
  }
  
  // Return as-is for text placements (Champion, Finalist, etc.)
  return placement
}

/**
 * Get all tournament results for display (both NHSCA and Super 32)
 */
export function getAllTournamentResults(athlete: any): {
  nhsca: TournamentResult[]
  super32: TournamentResult[]
  hasAny: boolean
} {
  const nhsca = getNhscaResults(athlete)
  const super32 = getSuper32Results(athlete)
  
  return {
    nhsca,
    super32,
    hasAny: nhsca.length > 0 || super32.length > 0,
  }
}

/** NC United National Team result row for display */
export interface NationalTeamResultRow {
  event: string
  year: number
  record: string
}

/**
 * Get NC United National Team results: Ultimate Club Duals 2025/2024, NHSCA 2025.
 * Show section when athlete competed on national team at any of these events.
 */
export function getNationalTeamResults(athlete: any): NationalTeamResultRow[] {
  const rows: NationalTeamResultRow[] = []
  const r2025 = (athlete?.ultimate_club_duals_2025_record ?? "").toString().trim()
  if (r2025) {
    rows.push({ event: "Ultimate Club Duals", year: 2025, record: r2025 })
  }
  const r2024 = (athlete?.ultimate_club_duals_2024_record ?? "").toString().trim()
  if (r2024) {
    rows.push({ event: "Ultimate Club Duals", year: 2024, record: r2024 })
  }
  const nhsca2025 = (athlete?.nhsca_2025_record ?? "").toString().trim()
  if (nhsca2025) {
    rows.push({ event: "NHSCA National Duals", year: 2025, record: nhsca2025 })
  }
  return rows
}
