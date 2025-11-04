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
export function getNhscaResults(athlete: any): TournamentResult[] {
  // Try new JSON format first
  if (athlete.nhsca_results && Array.isArray(athlete.nhsca_results) && athlete.nhsca_results.length > 0) {
    return athlete.nhsca_results.map((result: any) => ({
      year: result.year,
      placement: result.placement,
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
  // Try new JSON format first
  if (athlete.super32_results && Array.isArray(athlete.super32_results) && athlete.super32_results.length > 0) {
    return athlete.super32_results.map((result: any) => ({
      year: result.year,
      placement: result.placement,
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

