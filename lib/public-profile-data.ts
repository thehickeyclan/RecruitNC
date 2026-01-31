/**
 * Single source of truth for public profile data (NHSCA, Super32, etc.)
 * Used by: public-rankings API (2026/2027/2028 pages), unified-profile page
 * All kids and graduates get the same public profile - one code path.
 */

export interface TournamentResultForDisplay {
  year: number
  placement: string
  record: string
  weight?: string
  division?: string
}

export interface PublicProfileTournamentData {
  nhscaResults: TournamentResultForDisplay[]
  super32Results: TournamentResultForDisplay[]
}

/**
 * Build NHSCA and Super32 results from athlete row - same logic as public-rankings API.
 * This is the single source for how 2026/2027 pages and public profiles display this data.
 */
export function buildPublicProfileTournamentData(athlete: any): PublicProfileTournamentData {
  const nhscaResults: TournamentResultForDisplay[] = []
  const nhscaFields = [
    { year: 2025, record: athlete?.nhsca_2025_record ?? athlete?.nhsca2025Record, placement: athlete?.nhsca_2025_placement ?? athlete?.nhsca2025Placement },
    { year: 2024, record: athlete?.nhsca_2024_record ?? athlete?.nhsca2024Record, placement: athlete?.nhsca_2024_placement ?? athlete?.nhsca2024Placement },
  ]

  for (const field of nhscaFields) {
    if (field.placement || field.record) {
      let placementStr = ""
      if (field.placement != null && String(field.placement).trim() !== "") {
        const place = Number.parseInt(String(field.placement))
        if (!isNaN(place)) {
          if (place === 1) placementStr = "Champion"
          else if (place <= 8) {
            const ordinal = place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`
            placementStr = `${ordinal} All-American`
          } else placementStr = `${place}th Place`
        } else placementStr = String(field.placement)
      }
      nhscaResults.push({
        year: field.year,
        placement: placementStr,
        record: (field.record ?? "").toString().trim(),
      })
    }
  }

  const super32Results: TournamentResultForDisplay[] = []
  const super32Fields = [
    { year: 2025, record: athlete?.super_32_2025_record ?? athlete?.super32_2025_record, placement: athlete?.super_32_2025_placement ?? athlete?.super32_2025_placement },
    { year: 2024, record: athlete?.super_32_2024_record ?? athlete?.super32_2024_record, placement: athlete?.super_32_2024_placement ?? athlete?.super32_2024_placement },
    { year: 2023, record: athlete?.super_32_2023_record ?? athlete?.super32_2023_record, placement: athlete?.super_32_2023_placement ?? athlete?.super32_2023_placement },
  ]

  for (const field of super32Fields) {
    if (field.placement || field.record) {
      let placementStr = ""
      if (field.placement != null && String(field.placement).trim() !== "") {
        const place = Number.parseInt(String(field.placement))
        if (!isNaN(place)) {
          if (place === 1) placementStr = "Champion"
          else if (place <= 8) {
            const ordinal = place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`
            placementStr = `${ordinal} Place`
          } else placementStr = `${place}th Place`
        } else placementStr = String(field.placement)
      }
      super32Results.push({
        year: field.year,
        placement: placementStr,
        record: (field.record ?? "").toString().trim(),
      })
    }
  }

  return { nhscaResults, super32Results }
}
