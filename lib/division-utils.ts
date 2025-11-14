// Helper function to build a Supabase filter for division
export function buildDivisionFilter(division: string): any {
  // Use exact match for standardized division names
  return { division: { eq: division } }
}

// Get division sort value (for consistent sorting across the app)
export function getDivisionSortValue(division: string | null | undefined): number {
  // Handle null, undefined, or non-string values
  if (!division || typeof division !== "string") return 999

  // Use exact match for standardized division names
  switch (division) {
    case "Division I":
      return 1
    case "Division II":
      return 2
    case "Division III":
      return 3
    case "NAIA":
      return 4
    case "NJCAA":
      return 5
    default:
      return 999 // Unknown division
  }
}
