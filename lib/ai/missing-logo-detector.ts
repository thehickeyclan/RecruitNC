import { createClient } from "@supabase/supabase-js"

interface MissingLogoEntity {
  name: string
  type: "college" | "high_school" | "club"
  wrestlerCount: number
  priority: "high" | "medium" | "low"
  searchSuggestions: string[]
  sampleWrestlers: string[]
}

interface MissingLogosResult {
  entities: MissingLogoEntity[]
  totalMissing: number
  totalWrestlersAffected: number
  highPriority: number
  mediumPriority: number
  lowPriority: number
  processingTime: number
  lastUpdated: string
}

export class MissingLogoDetector {
  private static cache: { result: MissingLogosResult; timestamp: number } | null = null
  private static CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

  static async findMissingLogos(forceRefresh = false): Promise<MissingLogosResult> {
    const startTime = Date.now()

    // Check cache
    if (!forceRefresh && this.cache && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
      return this.cache.result
    }

    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      // Get all athletes with their organizations using the correct column names
      const { data: athletes, error } = await supabase
        .from("athletes")
        .select("name, college, highschool, wrestlingClub")

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      if (!athletes || athletes.length === 0) {
        return {
          entities: [],
          totalMissing: 0,
          totalWrestlersAffected: 0,
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0,
          processingTime: Date.now() - startTime,
          lastUpdated: new Date().toISOString(),
        }
      }

      const entityCounts = new Map<string, { type: string; wrestlers: string[] }>()

      // Count wrestlers per entity
      athletes.forEach((athlete) => {
        const entities = [
          { name: athlete.college, type: "college" },
          { name: athlete.highschool, type: "high_school" },
          { name: athlete.wrestlingClub, type: "club" },
        ]

        entities.forEach((entity) => {
          if (entity.name && entity.name.trim() && entity.name.toLowerCase() !== "none") {
            const key = `${entity.type}:${entity.name.toLowerCase().trim()}`
            if (!entityCounts.has(key)) {
              entityCounts.set(key, { type: entity.type, wrestlers: [] })
            }
            entityCounts.get(key)!.wrestlers.push(athlete.name)
          }
        })
      })

      // Check which entities are missing logos
      const missingEntities: MissingLogoEntity[] = []
      const knownLogos = this.getKnownLogos()

      for (const [key, data] of entityCounts) {
        const [type, name] = key.split(":")
        const normalizedName = name.toLowerCase().trim()

        // Check if logo exists
        const hasLogo = knownLogos.some(
          (logo) =>
            logo.toLowerCase().includes(normalizedName) ||
            normalizedName.includes(logo.toLowerCase()) ||
            this.isLogoMatch(normalizedName, logo.toLowerCase()),
        )

        if (!hasLogo) {
          const wrestlerCount = data.wrestlers.length
          const priority = wrestlerCount >= 5 ? "high" : wrestlerCount >= 2 ? "medium" : "low"

          missingEntities.push({
            name: this.capitalizeWords(name),
            type: type as "college" | "high_school" | "club",
            wrestlerCount,
            priority,
            searchSuggestions: this.generateSearchSuggestions(name),
            sampleWrestlers: data.wrestlers.slice(0, 3),
          })
        }
      }

      // Sort by priority and wrestler count
      missingEntities.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        return priorityDiff !== 0 ? priorityDiff : b.wrestlerCount - a.wrestlerCount
      })

      const result: MissingLogosResult = {
        entities: missingEntities,
        totalMissing: missingEntities.length,
        totalWrestlersAffected: missingEntities.reduce((sum, entity) => sum + entity.wrestlerCount, 0),
        highPriority: missingEntities.filter((e) => e.priority === "high").length,
        mediumPriority: missingEntities.filter((e) => e.priority === "medium").length,
        lowPriority: missingEntities.filter((e) => e.priority === "low").length,
        processingTime: Date.now() - startTime,
        lastUpdated: new Date().toISOString(),
      }

      // Cache result
      this.cache = { result, timestamp: Date.now() }

      return result
    } catch (error) {
      throw new Error(`Error finding missing logos: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private static isLogoMatch(entityName: string, logoName: string): boolean {
    // More sophisticated matching logic
    const entityWords = entityName.split(" ").filter((word) => word.length > 2)
    const logoWords = logoName.split(" ").filter((word) => word.length > 2)

    // Check if any significant words match
    return entityWords.some((entityWord) =>
      logoWords.some((logoWord) => entityWord.includes(logoWord) || logoWord.includes(entityWord)),
    )
  }

  private static getKnownLogos(): string[] {
    return [
      "unc",
      "university of north carolina",
      "chapel hill",
      "nc state",
      "ncsu",
      "north carolina state",
      "wolfpack",
      "appalachian state",
      "app state",
      "mountaineers",
      "campbell",
      "campbell university",
      "queens",
      "queens university",
      "belmont abbey",
      "belmont abbey college",
      "unc pembroke",
      "uncp",
      "greensboro college",
      "cary high",
      "cary high school",
      "hough",
      "hough high",
      "cardinal gibbons",
      "gibbons",
      "laney",
      "laney high",
      "jack britt",
      "jack britt high",
      "nc united",
      "north carolina united",
      "mount olive",
      "university of mount olive",
      "port city pirates",
      "generic high school",
      "generic college",
      "high school",
      "wrestling club",
    ]
  }

  private static generateSearchSuggestions(name: string): string[] {
    const suggestions = [name]

    // Add abbreviations
    const words = name.split(" ").filter((word) => word.length > 0)
    if (words.length > 1) {
      suggestions.push(
        words
          .map((w) => w[0])
          .join("")
          .toUpperCase(),
      )
    }

    // Add common variations
    if (name.toLowerCase().includes("high school")) {
      suggestions.push(name.replace(/high school/i, "high"))
      suggestions.push(name.replace(/high school/i, ""))
    }

    if (name.toLowerCase().includes("university")) {
      suggestions.push(name.replace(/university/i, ""))
      suggestions.push(name.replace(/university of/i, ""))
    }

    if (name.toLowerCase().includes("college")) {
      suggestions.push(name.replace(/college/i, ""))
    }

    // Add "logo" suffix for search
    suggestions.push(`${name} logo`)

    return [...new Set(suggestions)].slice(0, 5)
  }

  private static capitalizeWords(str: string): string {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  static clearCache(): void {
    this.cache = null
  }
}
