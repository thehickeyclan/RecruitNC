/**
 * Blue team definitions for roster (current) vs alumni.
 * Current = still in HS = graduation year >= current year (e.g. 2026+).
 * Alumni = graduated = graduation year < current year (e.g. 2025 and older).
 */

export const CURRENT_YEAR = new Date().getFullYear()

/** Max graduation year that counts as alumni (e.g. 2025). Current roster is this + 1 and later. */
export const ALUMNI_MAX_GRAD_YEAR = CURRENT_YEAR - 1

export function isBlueTeam(row: Record<string, unknown>): boolean {
  const raw =
    row.ncUnitedTeam ??
    row.ncunitedteam ??
    row.nc_united_team ??
    ""
  const v = String(raw).toLowerCase().trim()
  return v === "blue" || v === "both" || v.includes("blue")
}
