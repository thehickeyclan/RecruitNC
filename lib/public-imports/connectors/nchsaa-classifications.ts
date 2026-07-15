/**
 * NCHSAA school classifications connector (summer / realignment).
 * Fetch official school directory → parse membership → stage for admin review.
 */

export type NchsaaClassificationSource = {
  url: string
  label: string
  /** Cycle label shown in RecruitNC (e.g. 2025-2029) */
  cycle_label?: string
}

/**
 * Official NCHSAA member-school directory pages by season year.
 * effective_year = connector year (e.g. 2026 for 2025-26 classes in force).
 * Add/update when NCHSAA publishes a new realignment or refreshes /schools/.
 */
export const NCHSAA_CLASSIFICATION_SOURCES: Record<number, NchsaaClassificationSource[]> = {
  2026: [
    {
      url: "https://www.nchsaa.org/schools/",
      label: "2025-2026 NCHSAA Schools directory",
      cycle_label: "2025-2029",
    },
  ],
}

export function listNchsaaClassificationYears(): number[] {
  return Object.keys(NCHSAA_CLASSIFICATION_SOURCES)
    .map(Number)
    .sort((a, b) => b - a)
}

export function getNchsaaClassificationSources(year: number): NchsaaClassificationSource[] {
  return NCHSAA_CLASSIFICATION_SOURCES[year] ?? []
}
