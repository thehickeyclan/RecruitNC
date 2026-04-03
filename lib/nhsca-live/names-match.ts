function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z\s]/g, "")
}

export function namesMatch(name1: string, name2: string): boolean {
  const norm1 = normalizeName(name1)
  const norm2 = normalizeName(name2)

  // Exact match after normalization
  if (norm1 === norm2) return true

  // Check if one name contains the other (handles middle names, hyphenated names)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true

  // Check if last names match and first initial matches
  const parts1 = norm1.split(" ")
  const parts2 = norm2.split(" ")

  if (parts1.length > 0 && parts2.length > 0) {
    const lastName1 = parts1[parts1.length - 1]
    const lastName2 = parts2[parts2.length - 1]
    const firstInitial1 = parts1[0][0]
    const firstInitial2 = parts2[0][0]

    if (lastName1 === lastName2 && firstInitial1 === firstInitial2) return true
  }

  // Use Levenshtein distance for fuzzy matching (handles typos like Riley/Rylie)
  const distance = levenshteinDistance(norm1, norm2)
  const maxLength = Math.max(norm1.length, norm2.length)
  const similarity = 1 - distance / maxLength

  // If similarity is high (>70%), consider it a match
  return similarity > 0.7
}
