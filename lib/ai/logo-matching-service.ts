interface LogoMatch {
  logoPath: string
  confidence: number
  matchType: "exact" | "partial" | "fuzzy" | "abbreviation"
  reasoning: string
}

interface LogoMatchResult {
  query: string
  matches: LogoMatch[]
  processingTime: number
  cached: boolean
}

export class LogoMatchingService {
  private static logoDatabase = {
    // Colleges
    unc: { path: "/UNC_Chapel_Hill_Logo.png", aliases: ["university of north carolina", "chapel hill", "tar heels"] },
    "nc state": { path: "/wolfpack-logo.png", aliases: ["ncsu", "north carolina state", "wolfpack"] },
    "appalachian state": { path: "/appalachian-state-mountains.png", aliases: ["app state", "mountaineers"] },
    campbell: { path: "/campbell-university-seal.png", aliases: ["campbell university", "fighting camels"] },
    queens: { path: "/queens-university-shield.png", aliases: ["queens university"] },
    "belmont abbey": { path: "/belmont-abbey-architectural-detail.png", aliases: ["belmont abbey college"] },
    "unc pembroke": { path: "/unc-pembroke-seal.png", aliases: ["uncp", "braves"] },
    "greensboro college": { path: "/Greensboro-College-Seal.png", aliases: ["gc", "pride"] },

    // High Schools
    "cary high": { path: "/cary-high-school-spirit.png", aliases: ["cary high school", "imps"] },
    hough: { path: "/hough-high-school-logo.png", aliases: ["hough high", "huskies"] },
    "cardinal gibbons": { path: "/cardinal-gibbons-crest.png", aliases: ["gibbons", "crusaders"] },
    laney: { path: "/Laney-High-Wildcats.png", aliases: ["laney high", "wildcats"] },
    "jack britt": { path: "/jack-britt-high-school-logo.png", aliases: ["jack britt high", "buccaneers"] },

    // Wrestling Clubs
    "nc united": { path: "/nc-united-main-logo.png", aliases: ["north carolina united", "nc united wrestling"] },
  }

  private static cache = new Map<string, { result: LogoMatchResult; timestamp: number }>()
  private static CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  static async findLogos(query: string): Promise<LogoMatchResult> {
    const startTime = Date.now()
    const cacheKey = query.toLowerCase().trim()

    // Check cache
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { ...cached.result, cached: true }
    }

    const matches: LogoMatch[] = []
    const normalizedQuery = query.toLowerCase().trim()

    // Exact match
    if (this.logoDatabase[normalizedQuery]) {
      matches.push({
        logoPath: this.logoDatabase[normalizedQuery].path,
        confidence: 100,
        matchType: "exact",
        reasoning: "Exact name match",
      })
    }

    // Alias match
    for (const [name, data] of Object.entries(this.logoDatabase)) {
      if (data.aliases.some((alias) => alias.toLowerCase() === normalizedQuery)) {
        matches.push({
          logoPath: data.path,
          confidence: 95,
          matchType: "exact",
          reasoning: `Matches known alias: ${name}`,
        })
      }
    }

    // Partial match
    for (const [name, data] of Object.entries(this.logoDatabase)) {
      if (name.includes(normalizedQuery) || normalizedQuery.includes(name)) {
        if (!matches.some((m) => m.logoPath === data.path)) {
          matches.push({
            logoPath: data.path,
            confidence: 85,
            matchType: "partial",
            reasoning: `Partial match with ${name}`,
          })
        }
      }
    }

    // Fuzzy match using Levenshtein distance
    for (const [name, data] of Object.entries(this.logoDatabase)) {
      const distance = this.levenshteinDistance(normalizedQuery, name)
      const similarity = 1 - distance / Math.max(normalizedQuery.length, name.length)

      if (similarity > 0.6 && !matches.some((m) => m.logoPath === data.path)) {
        matches.push({
          logoPath: data.path,
          confidence: Math.round(similarity * 100),
          matchType: "fuzzy",
          reasoning: `Fuzzy match with ${name} (${Math.round(similarity * 100)}% similar)`,
        })
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence)

    const result: LogoMatchResult = {
      query,
      matches: matches.slice(0, 5), // Top 5 matches
      processingTime: Date.now() - startTime,
      cached: false,
    }

    // Cache result
    this.cache.set(cacheKey, { result, timestamp: Date.now() })

    return result
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator)
      }
    }

    return matrix[str2.length][str1.length]
  }

  static clearCache(): void {
    this.cache.clear()
  }

  static getCacheStats(): { size: number; oldestEntry: number | null } {
    const now = Date.now()
    let oldestEntry: number | null = null

    for (const { timestamp } of this.cache.values()) {
      if (oldestEntry === null || timestamp < oldestEntry) {
        oldestEntry = timestamp
      }
    }

    return {
      size: this.cache.size,
      oldestEntry: oldestEntry ? now - oldestEntry : null,
    }
  }
}
