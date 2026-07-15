/**
 * NCHSAA Dual Team Wrestling Championships connector.
 * Fetch official season pages → parse year×division champions → stage for admin review.
 */

export type NchsaaDualTeamSource = {
  url: string
  label: string
}

/**
 * Known official NCHSAA dual-team championship result pages by year.
 * Add each February when NCHSAA publishes; connector uses these automatically.
 */
export const NCHSAA_DUAL_TEAM_SOURCES: Record<number, NchsaaDualTeamSource[]> = {
  2026: [
    {
      url: "https://www.nchsaa.org/2026-dual-team-wrestling-championships/",
      label: "2026 Dual Team Championships",
    },
  ],
  2025: [
    {
      url: "https://www.nchsaa.org/2025-dual-team-wrestling-championships/",
      label: "2025 Dual Team Championships",
    },
  ],
  2024: [
    {
      url: "https://www.nchsaa.org/2024-dual-team-wrestling-championships/",
      label: "2024 Dual Team Championships",
    },
  ],
}

export function listNchsaaDualTeamYears(): number[] {
  return Object.keys(NCHSAA_DUAL_TEAM_SOURCES)
    .map(Number)
    .sort((a, b) => b - a)
}

export function getNchsaaDualTeamSources(year: number): NchsaaDualTeamSource[] {
  return NCHSAA_DUAL_TEAM_SOURCES[year] ?? []
}
