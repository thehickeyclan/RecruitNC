// Helper function to build a Supabase filter for division
export function buildDivisionFilter(division: string): any {
  // Use exact match for standardized division names
  return { division: { eq: division } }
}

// Get division sort value (for consistent sorting across the app)
// Accepts full form (NCAA Division I, etc.) and legacy "Division I" for compatibility.
export function getDivisionSortValue(division: string | null | undefined): number {
  if (!division || typeof division !== "string") return 999

  const d = division.trim()
  if (d === "NCAA Division I" || d === "Division I") return 1
  if (d === "NCAA Division II" || d === "Division II") return 2
  if (d === "NCAA Division III" || d === "Division III") return 3
  if (d === "NAIA") return 4
  if (d === "NJCAA") return 5
  if (d === "Club (NCWA)") return 6
  return 999
}
