interface MatchResult {
  entityName: string
  logoUrl: string
  confidence: number
  matchType: "exact" | "alias" | "fuzzy" | "partial"
  reasoning: string
}

interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  aliases?: string
}

export class SmartLogoMatcher {
  private static cache = new Map<string, MatchResult[]>()
  private static CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

  /**
   * Find the best logo match for an entity name
   */
  static async findBestMatch(
    entityName: string,
    entityType: string,
    mappings: LogoMapping[],
  ): Promise<MatchResult | null> {
    if (!entityName || !mappings.length) return null

    const cacheKey = `${entityType}:${entityName.toLowerCase()}`
    const cached = this.cache.get(cacheKey)

    if (cached && cached.length > 0) {
      return cached[0] // Return best match
    }

    const matches = this.findAllMatches(entityName, entityType, mappings)

    // Cache results
    this.cache.set(cacheKey, matches)
    setTimeout(() => this.cache.delete(cacheKey), this.CACHE_DURATION)

    return matches.length > 0 ? matches[0] : null
  }

  /**
   * Find all possible matches for an entity name
   */
  static findAllMatches(entityName: string, entityType: string, mappings: LogoMapping[]): MatchResult[] {
    const results: MatchResult[] = []
    const normalizedInput = this.normalizeString(entityName)

    // Filter by entity type first
    const typedMappings = mappings.filter((m) => m.entity_type === entityType)

    for (const mapping of typedMappings) {
      const normalizedEntity = this.normalizeString(mapping.entity_name)

      // 1. Exact match
      if (normalizedEntity === normalizedInput) {
        results.push({
          entityName: mapping.entity_name,
          logoUrl: mapping.logo_url,
          confidence: 100,
          matchType: "exact",
          reasoning: "Exact name match",
        })
        continue
      }

      // 2. Alias match
      if (mapping.aliases) {
        const aliases = mapping.aliases.split(",").map((a) => this.normalizeString(a.trim()))
        const aliasMatch = aliases.find((alias) => alias === normalizedInput)

        if (aliasMatch) {
          results.push({
            entityName: mapping.entity_name,
            logoUrl: mapping.logo_url,
            confidence: 95,
            matchType: "alias",
            reasoning: `Matches alias: ${aliasMatch}`,
          })
          continue
        }
      }

      // 3. Partial match (contains)
      if (normalizedEntity.includes(normalizedInput) || normalizedInput.includes(normalizedEntity)) {
        const confidence = this.calculatePartialConfidence(normalizedInput, normalizedEntity)
        results.push({
          entityName: mapping.entity_name,
          logoUrl: mapping.logo_url,
          confidence,
          matchType: "partial",
          reasoning: `Partial match with ${mapping.entity_name}`,
        })
        continue
      }

      // 4. Fuzzy match using Levenshtein distance
      const distance = this.levenshteinDistance(normalizedInput, normalizedEntity)
      const maxLength = Math.max(normalizedInput.length, normalizedEntity.length)
      const similarity = 1 - distance / maxLength

      if (similarity > 0.6) {
        results.push({
          entityName: mapping.entity_name,
          logoUrl: mapping.logo_url,
          confidence: Math.round(similarity * 100),
          matchType: "fuzzy",
          reasoning: `Fuzzy match with ${mapping.entity_name} (${Math.round(similarity * 100)}% similar)`,
        })
      }

      // 5. Check aliases for partial/fuzzy matches
      if (mapping.aliases) {
        const aliases = mapping.aliases.split(",").map((a) => a.trim())
        for (const alias of aliases) {
          const normalizedAlias = this.normalizeString(alias)

          // Partial alias match
          if (normalizedAlias.includes(normalizedInput) || normalizedInput.includes(normalizedAlias)) {
            const confidence = this.calculatePartialConfidence(normalizedInput, normalizedAlias)
            results.push({
              entityName: mapping.entity_name,
              logoUrl: mapping.logo_url,
              confidence: confidence - 5, // Slightly lower than direct partial match
              matchType: "alias",
              reasoning: `Partial alias match: ${alias}`,
            })
          }
        }
      }
    }

    // Sort by confidence (highest first) and remove duplicates
    const uniqueResults = this.removeDuplicates(results)
    return uniqueResults.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Normalize string for comparison
   */
  private static normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\s/g, "") // Remove all spaces for comparison
  }

  /**
   * Calculate confidence for partial matches
   */
  private static calculatePartialConfidence(input: string, target: string): number {
    const longer = input.length > target.length ? input : target
    const shorter = input.length > target.length ? target : input

    const ratio = shorter.length / longer.length
    return Math.round(80 * ratio) // Base confidence of 80, adjusted by length ratio
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        )
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Remove duplicate results (same logo URL)
   */
  private static removeDuplicates(results: MatchResult[]): MatchResult[] {
    const seen = new Set<string>()
    return results.filter((result) => {
      if (seen.has(result.logoUrl)) {
        return false
      }
      seen.add(result.logoUrl)
      return true
    })
  }

  /**
   * Clear the cache
   */
  static clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * Suggest aliases for an entity name
   */
  static suggestAliases(entityName: string): string[] {
    const suggestions: string[] = []
    const normalized = entityName.toLowerCase()

    // Common variations
    if (normalized.includes(" ")) {
      // Remove spaces
      suggestions.push(normalized.replace(/\s+/g, ""))

      // Acronym
      const words = normalized.split(/\s+/)
      if (words.length > 1) {
        suggestions.push(words.map((w) => w[0]).join(""))
      }
    }

    // Add spaces to camelCase or concatenated words
    if (!normalized.includes(" ") && normalized.length > 5) {
      // Try to split on capital letters (if original had them)
      const withSpaces = entityName.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
      if (withSpaces !== normalized) {
        suggestions.push(withSpaces)
      }
    }

    // Common wrestling club suffixes
    if (normalized.includes("wrestling")) {
      suggestions.push(normalized.replace("wrestling", "wc"))
      suggestions.push(normalized.replace("wrestling club", "wc"))
    }

    if (normalized.includes("high school")) {
      suggestions.push(normalized.replace("high school", "hs"))
      suggestions.push(normalized.replace("high school", "high"))
    }

    // Remove duplicates and return
    return [...new Set(suggestions)].filter((s) => s !== normalized)
  }
}
