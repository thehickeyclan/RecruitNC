// Normalize college names to prevent duplicates
export function normalizeCollegeName(name: string): string {
  if (!name) return ""

  // Trim whitespace and normalize case
  const trimmed = name.trim()

  // Handle specific college name variations
  const collegeMap: Record<string, string> = {
    // Appalachian State variations
    "app state": "Appalachian State",
    "app. state": "Appalachian State",
    appalachian: "Appalachian State",
    "appalachian st": "Appalachian State",
    "appalachian st.": "Appalachian State",
    "appalachian state university": "Appalachian State",

    // NC State variations
    "nc state": "NC State",
    "n.c. state": "NC State",
    "north carolina state": "NC State",
    "north carolina state university": "NC State",

    // UNC variations
    unc: "UNC Chapel Hill",
    "unc chapel hill": "UNC Chapel Hill",
    "unc-chapel hill": "UNC Chapel Hill",
    "university of north carolina": "UNC Chapel Hill",
    "university of north carolina at chapel hill": "UNC Chapel Hill",

    // Other common variations
    "belmont abbey": "Belmont Abbey",
    "belmont abbey college": "Belmont Abbey",
  }

  // Check for matches in our map (case insensitive)
  const lowerName = trimmed.toLowerCase()
  for (const [variant, standardName] of Object.entries(collegeMap)) {
    if (lowerName === variant || lowerName === variant.toLowerCase()) {
      return standardName
    }
  }

  // If no match found, return the original (trimmed) name
  return trimmed
}

// Function to check if a college name might be a duplicate
export function isPossibleDuplicate(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false

  const norm1 = normalizeCollegeName(name1)
  const norm2 = normalizeCollegeName(name2)

  return norm1 === norm2
}
