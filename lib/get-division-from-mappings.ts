import { createClient } from "@/lib/supabase/server"

// Cache for division mappings to avoid repeated database calls
let divisionMappingsCache: Record<string, string> | null = null
let lastCacheUpdate = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getDivisionFromMappings(collegeName: string): Promise<string> {
  if (!collegeName) return "Unknown"

  // Refresh cache if needed
  if (!divisionMappingsCache || Date.now() - lastCacheUpdate > CACHE_TTL) {
    await refreshDivisionMappingsCache()
  }

  if (!divisionMappingsCache) return "Unknown"

  const collegeLower = collegeName.toLowerCase()

  // Try exact match first
  let division = divisionMappingsCache[collegeLower]

  // If no exact match, try partial match
  if (!division) {
    const matchingKey = Object.keys(divisionMappingsCache).find(
      (key) => collegeLower.includes(key) || key.includes(collegeLower),
    )

    if (matchingKey) {
      division = divisionMappingsCache[matchingKey]
    }
  }

  return division || "Unknown"
}

async function refreshDivisionMappingsCache() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.from("college_division_mappings").select("college_name, division")

    if (error) {
      console.error("Error fetching division mappings:", error)
      return
    }

    // Create a mapping object for faster lookups
    divisionMappingsCache = data.reduce(
      (acc, { college_name, division }) => {
        acc[college_name.toLowerCase()] = division
        return acc
      },
      {} as Record<string, string>,
    )

    lastCacheUpdate = Date.now()
  } catch (error) {
    console.error("Error refreshing division mappings cache:", error)
  }
}
