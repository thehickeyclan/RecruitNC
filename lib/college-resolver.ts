import { createClient } from "@/lib/supabase/client"

interface CollegeMaster {
  id: number
  canonical_name: string
  display_name: string
  division: string
  state: string
}

interface CollegeAlias {
  id: number
  college_master_id: number
  alias_name: string
}

class CollegeResolver {
  private collegeCache: Map<string, CollegeMaster> = new Map()
  private aliasCache: Map<string, number> = new Map()
  private initialized = false

  async initialize() {
    if (this.initialized) return

    const supabase = createClient()

    // Load all colleges
    const { data: colleges, error: collegeError } = await supabase.from("college_master").select("*")

    if (collegeError) {
      console.error("Error loading colleges:", collegeError)
      return
    }

    // Load all aliases
    const { data: aliases, error: aliasError } = await supabase.from("college_aliases").select("*")

    if (aliasError) {
      console.error("Error loading aliases:", aliasError)
      return
    }

    // Build caches
    colleges?.forEach((college) => {
      this.collegeCache.set(college.canonical_name.toLowerCase(), college)
    })

    aliases?.forEach((alias) => {
      this.aliasCache.set(alias.alias_name.toLowerCase(), alias.college_master_id)
    })

    this.initialized = true
  }

  async resolveCollege(inputName: string): Promise<CollegeMaster | null> {
    await this.initialize()

    if (!inputName) return null

    const normalizedInput = inputName.trim().toLowerCase()

    // First check if it's a canonical name
    const directMatch = this.collegeCache.get(normalizedInput)
    if (directMatch) return directMatch

    // Check aliases
    const masterId = this.aliasCache.get(normalizedInput)
    if (masterId) {
      // Find the college by ID
      for (const college of this.collegeCache.values()) {
        if (college.id === masterId) {
          return college
        }
      }
    }

    // Fuzzy matching for partial matches
    for (const [canonicalName, college] of this.collegeCache.entries()) {
      if (canonicalName.includes(normalizedInput) || normalizedInput.includes(canonicalName)) {
        return college
      }
    }

    // Check aliases for partial matches
    for (const [aliasName, masterId] of this.aliasCache.entries()) {
      if (aliasName.includes(normalizedInput) || normalizedInput.includes(aliasName)) {
        for (const college of this.collegeCache.values()) {
          if (college.id === masterId) {
            return college
          }
        }
      }
    }

    return null
  }

  async getAllColleges(): Promise<CollegeMaster[]> {
    await this.initialize()
    return Array.from(this.collegeCache.values())
  }

  async getUnmappedColleges(): Promise<string[]> {
    const supabase = createClient()

    // Get all unique college names from athletes
    const { data: athletes, error } = await supabase.from("athletes").select("college").not("college", "is", null)

    if (error) {
      console.error("Error fetching athlete colleges:", error)
      return []
    }

    const uniqueColleges = [...new Set(athletes.map((a) => a.college).filter(Boolean))]
    const unmapped: string[] = []

    for (const collegeName of uniqueColleges) {
      const resolved = await this.resolveCollege(collegeName)
      if (!resolved) {
        unmapped.push(collegeName)
      }
    }

    return unmapped
  }
}

export const collegeResolver = new CollegeResolver()
