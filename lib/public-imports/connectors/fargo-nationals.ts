/**
 * Fargo Nationals connector (Phase 1 — season aggregates).
 * Registers official CSV snapshots under scripts/data/fargo/ for admin review.
 * FloWrestling is never a canonical source.
 *
 * Phase 2: USA Bracketing + historical Trackwrestling bout adapters → fargo_bouts.
 */

export type FargoSourceFile = {
  /** Path relative to repo root */
  path: string
  label: string
  /** When set, only this year's rows are staged from multi-year CSVs */
  yearFilter?: number
}

/**
 * Per-year official season files (local SoR snapshots until live USA Bracketing adapter).
 * Add new year entries when CSVs are prepared after Fargo.
 */
export const FARGO_YEAR_SOURCES: Record<number, FargoSourceFile[]> = {
  2023: [
    {
      path: "scripts/data/fargo/fargo_2023_16u.csv",
      label: "2023 16U Boys Freestyle (bracket export)",
    },
    {
      path: "scripts/data/fargo/fargo_2023_junior.csv",
      label: "2023 Junior Boys Freestyle (bracket export)",
    },
  ],
  2024: [
    {
      path: "scripts/data/fargo/fargo_2024_16u.csv",
      label: "2024 16U Boys Freestyle (bracket export)",
    },
    {
      path: "scripts/data/fargo/fargo_2024_junior.csv",
      label: "2024 Junior Boys Freestyle (summary export)",
    },
  ],
  2025: [
    {
      path: "scripts/data/fargo/fargo_16U_details.csv",
      label: "16U details CSV (includes 2025)",
      yearFilter: 2025,
    },
    {
      path: "scripts/data/fargo/fargo_juniors_details.csv",
      label: "Junior details CSV (includes 2025)",
      yearFilter: 2025,
    },
  ],
  2026: [
    {
      path: "scripts/data/fargo/fargo_16U_details.csv",
      label: "16U details CSV (includes 2026)",
      yearFilter: 2026,
    },
    {
      path: "scripts/data/fargo/fargo_2026_16u_greco.csv",
      label: "2026 16U Boys Greco-Roman (user-confirmed records excluding byes)",
    },
    {
      path: "scripts/data/fargo/fargo_juniors_details.csv",
      label: "Junior details CSV (includes 2026)",
      yearFilter: 2026,
    },
    {
      path: "scripts/data/fargo/fargo_2026_junior_greco.csv",
      label: "2026 Junior Boys Greco-Roman (user-confirmed records excluding byes)",
    },
  ],
}

export function listFargoConnectorYears(): number[] {
  return Object.keys(FARGO_YEAR_SOURCES)
    .map(Number)
    .sort((a, b) => b - a)
}

export function getFargoYearSources(year: number): FargoSourceFile[] {
  return FARGO_YEAR_SOURCES[year] ?? []
}
