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

  // Fallback to old column format (snake_case and camelCase for different DB/API shapes)
  const results: TournamentResult[] = []
  const weight = athlete?.weightclass ?? athlete?.weightClass ?? ''

  const years = [2025, 2024, 2023]
  for (const year of years) {
    const placementSnake = athlete?.[`nhsca_${year}_placement`]
    const recordSnake = athlete?.[`nhsca_${year}_record`]
    const placementCamel = athlete?.[`nhsca${year}Placement` as keyof typeof athlete]
    const recordCamel = athlete?.[`nhsca${year}Record` as keyof typeof athlete]
    const placement = placementSnake ?? placementCamel
    const record = recordSnake ?? recordCamel

    if (placement != null && String(placement).trim() !== '' || record != null && String(record).trim() !== '') {
      results.push({
        year,
        placement: placement != null ? String(placement).trim() : '',
        record: record != null ? String(record).trim() : '',
        weight,
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

  // Fallback to old column format: super_32_* (DB), super32_* (some APIs/forms), camelCase
  const results: TournamentResult[] = []
  const weight = athlete?.weightclass ?? athlete?.weightClass ?? ''

  const years = [2025, 2024, 2023]
  for (const year of years) {
    const placementSnake = athlete?.[`super_32_${year}_placement`] ?? athlete?.[`super32_${year}_placement`]
    const recordSnake = athlete?.[`super_32_${year}_record`] ?? athlete?.[`super32_${year}_record`]
    const placementCamel = athlete?.[`super32${year}Placement` as keyof typeof athlete]
    const recordCamel = athlete?.[`super32${year}Record` as keyof typeof athlete]
    const placement = placementSnake ?? placementCamel
    const record = recordSnake ?? recordCamel

    if (placement != null && String(placement).trim() !== '' || record != null && String(record).trim() !== '') {
      results.push({
        year,
        placement: placement != null ? String(placement).trim() : '',
        record: record != null ? String(record).trim() : '',
        weight,
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
 * Get NC United National Team results from athlete row (fallback when nc_united tables lack data).
 * Ultimate Club Duals + NHSCA National Duals (team events; NOT individual NHSCA nationals).
 */
export function getNationalTeamResults(athlete: any): NationalTeamResultRow[] {
  const rows: NationalTeamResultRow[] = []
  // Ultimate Club Duals
  const ucd2025 = (athlete?.ultimate_club_duals_2025_record ?? "").toString().trim()
  if (ucd2025) rows.push({ event: "Ultimate Club Duals", year: 2025, record: ucd2025 })
  const ucd2024 = (athlete?.ultimate_club_duals_2024_record ?? "").toString().trim()
  if (ucd2024) rows.push({ event: "Ultimate Club Duals", year: 2024, record: ucd2024 })
  const ucd2023 = (athlete?.ultimate_club_duals_2023_record ?? "").toString().trim()
  if (ucd2023) rows.push({ event: "Ultimate Club Duals", year: 2023, record: ucd2023 })
  // NHSCA National Duals (team event; not individual nhsca_2025_record)
  const nd2025 = (athlete?.nhsca_national_duals_2025_record ?? athlete?.nhsca_duals_2025_record ?? "").toString().trim()
  if (nd2025) rows.push({ event: "NHSCA National Duals", year: 2025, record: nd2025 })
  const nd2024 = (athlete?.nhsca_national_duals_2024_record ?? athlete?.nhsca_duals_2024_record ?? "").toString().trim()
  if (nd2024) rows.push({ event: "NHSCA National Duals", year: 2024, record: nd2024 })
  const nd2023 = (athlete?.nhsca_national_duals_2023_record ?? athlete?.nhsca_duals_2023_record ?? "").toString().trim()
  if (nd2023) rows.push({ event: "NHSCA National Duals", year: 2023, record: nd2023 })
  // 2026 NHSCA Duals: same event naming as roster placeholder ("NHSCA Duals"); when populated after event, shows real record
  const nd2026 = (athlete?.nhsca_national_duals_2026_record ?? athlete?.nhsca_duals_2026_record ?? "").toString().trim()
  if (nd2026) rows.push({ event: "NHSCA Duals", year: 2026, record: nd2026 })
  return rows
}

/**
 * Merge NC United National Team results: table data (primary) + athlete row (fallback).
 * Dedupe by event|year; table wins when both have same event+year.
 */
export function mergeNationalTeamResults(
  fromTable: NationalTeamResultRow[],
  fromAthleteRow: NationalTeamResultRow[]
): NationalTeamResultRow[] {
  const tableKeys = new Set(fromTable.map((r) => `${r.event}|${r.year}`))
  const athleteFallback = fromAthleteRow.filter((r) => !tableKeys.has(`${r.event}|${r.year}`))
  return [...fromTable, ...athleteFallback].sort((a, b) => b.year - a.year)
}
