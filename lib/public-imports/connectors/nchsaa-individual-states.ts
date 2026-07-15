/**
 * NCHSAA Individual State Championships connector (Priority 1).
 * Fetch official season pages → parse champions/placers → stage for admin review.
 */

export type NchsaaIndividualSource = {
  url: string
  label: string
  /** Hint when page lacks classification on every weight header */
  defaultClassification?: string
}

/**
 * Known official NCHSAA individual championship result pages by year.
 * Add each February when NCHSAA publishes; connector uses these automatically.
 */
export const NCHSAA_INDIVIDUAL_STATES_SOURCES: Record<number, NchsaaIndividualSource[]> = {
  2026: [
    {
      url: "https://www.nchsaa.org/2026-mens-individual-wrestling-state-championship/",
      label: "2026 Men's Individual",
    },
    {
      url: "https://www.nchsaa.org/2026-womens-individual-wrestling-state-championship/",
      label: "2026 Women's Individual",
    },
  ],
  2025: [
    {
      url: "https://www.nchsaa.org/2025-individual-wrestling-championships/",
      label: "2025 Individual Championships",
    },
  ],
  2024: [
    {
      url: "https://www.nchsaa.org/2024-individual-wrestling-championships/",
      label: "2024 Individual Championships",
    },
  ],
}

export function listNchsaaIndividualStatesYears(): number[] {
  return Object.keys(NCHSAA_INDIVIDUAL_STATES_SOURCES)
    .map(Number)
    .sort((a, b) => b - a)
}

export function getNchsaaIndividualStatesSources(year: number): NchsaaIndividualSource[] {
  return NCHSAA_INDIVIDUAL_STATES_SOURCES[year] ?? []
}
