import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

// Helper to extract wrestler name from query string
function extractWrestlerNameFromQuery(query: string): string | null {
  if (!query) return null
  
  const lower = query.toLowerCase()
  
  // Patterns like "did [name] place", "is [name] a", "was [name] a"
  // Remove common question words and extract the name
  const patterns = [
    /(?:did|is|was|has|have)\s+([a-z]+(?:\s+[a-z]+)+?)\s+(?:place|a|an|all|american|champion|win|won)/i,
    /(?:who|what|where|when|how)\s+(?:is|was|did|has|have)\s+([a-z]+(?:\s+[a-z]+)+?)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)/, // Capitalized first and last name
  ]
  
  for (const pattern of patterns) {
    const match = query.match(pattern)
    if (match && match[1]) {
      const name = match[1].trim()
      // Filter out common words that aren't names
      if (name.length > 3 && !['the', 'this', 'that', 'what', 'when', 'where', 'who', 'how'].includes(name.toLowerCase())) {
        return name
      }
    }
  }
  
  // Fallback: look for capitalized words (likely names)
  const words = query.split(/\s+/)
  const capitalizedWords = words.filter(w => /^[A-Z][a-z]+$/.test(w))
  if (capitalizedWords.length >= 2) {
    // Likely a first and last name
    return capitalizedWords.slice(0, 2).join(' ')
  }
  
  return null
}

export const handleNhscaAllAmerican: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const year = params.year
  const startYear = params.startYear
  const endYear = params.endYear
  const division = params.division ?? null
  // Extract name from params or query string
  let wrestlerName = params.wrestler || params.name
  if (!wrestlerName && (params.query || params.search)) {
    const query = params.query || params.search || ""
    wrestlerName = extractWrestlerNameFromQuery(query) || null
  }
  const schoolName = params.school
  
  // Gender: prefer explicit param from route (single source of truth), else derive from query
  // Route passes gender: 'F' | 'M' | null; handler recognizes girls, women, female (and male/men/boys)
  const query = (params.query || params.search || "").toLowerCase()
  const paramGender = params.gender as string | null | undefined
  let isWomenQuery: boolean
  let isMenQuery: boolean
  if (paramGender === "F" || paramGender === "Female") {
    isWomenQuery = true
    isMenQuery = false
  } else if (paramGender === "M" || paramGender === "Male") {
    isWomenQuery = false
    isMenQuery = true
  } else {
    isWomenQuery = (query.includes("female") || query.includes("women") || query.includes("woman") ||
                    query.includes("girls") || query.includes("girl")) &&
                   !/\bmale\b/.test(query) && !/\bmen\b/.test(query) && !/\bboys?\b/.test(query)
    isMenQuery = /\bmale\b/.test(query) || /\bmen\b/.test(query) || /\bboys?\b/.test(query)
  }

  // Query both tables to ensure we get all data
  // Query nhsca_placements table (PRIMARY SOURCE)
  let placementsQuery = adminClient
    .from("nhsca_placements")
    .select("athlete_name, placement, year, division, weight_class, high_school")
    .gte("placement", 1)
    .lte("placement", 8)
    .not("high_school", "is", null)
    .neq("high_school", "")
    .not("high_school", "ilike", "unknown")
    .not("athlete_name", "is", null)
    .neq("athlete_name", "")
  
  // Apply gender filter - default to male when unspecified (traditional boys divisions)
  if (isWomenQuery) {
    // Women only - girls/women/female divisions only
    placementsQuery = placementsQuery.or("division.ilike.%girl%,division.ilike.%women%,division.ilike.%female%")
  } else {
    // Male (explicit or default) - exclude girls divisions for generic queries like "show all NHSCA All-Americans"
    placementsQuery = placementsQuery
      .not("division", "ilike", "%girl%")
      .not("division", "ilike", "%women%")
      .not("division", "ilike", "%female%")
  }

  // Apply division filter (freshman, sophomore, junior, senior) when explicitly requested
  if (division && ["freshman", "sophomore", "junior", "senior"].includes(division.toLowerCase())) {
    placementsQuery = placementsQuery.ilike("division", `%${division}%`)
  }

  // Handle year filtering: single year, year range, or all years
  if (startYear && endYear) {
    placementsQuery = placementsQuery.gte("year", startYear).lte("year", endYear)
  } else if (year) {
    placementsQuery = placementsQuery.eq("year", year)
  } else if (startYear) {
    placementsQuery = placementsQuery.gte("year", startYear)
  } else if (endYear) {
    placementsQuery = placementsQuery.lte("year", endYear)
  }

  if (wrestlerName) {
    placementsQuery = placementsQuery.ilike("athlete_name", `%${wrestlerName}%`)
  }

  if (schoolName) {
    // Filter by school name with case-insensitive partial matching
    placementsQuery = placementsQuery.ilike("high_school", `%${schoolName}%`)
  }

  const { data: nhscaPlacementsData, error: nhscaPlacementsError } = await placementsQuery
    .order("year", { ascending: false })
    .order("placement", { ascending: true })
    .order("weight_class", { ascending: true })
    .limit(10000)

  // Query wrestling_nhsca_results table (FALLBACK/ADDITIONAL)
  let resultsQuery = adminClient
    .from("wrestling_nhsca_results")
    .select("athlete_name, placement, year, division, weight, high_school, state")
    .gte("placement", 1)
    .lte("placement", 8)
    .not("high_school", "is", null)
    .neq("high_school", "")
    .not("high_school", "ilike", "unknown")
    .not("athlete_name", "is", null)
    .neq("athlete_name", "")
  
  // Apply gender filter - default to male when unspecified (traditional boys divisions)
  if (isWomenQuery) {
    // Women only - girls/women/female divisions only
    resultsQuery = resultsQuery.or("division.ilike.%girl%,division.ilike.%women%,division.ilike.%female%")
  } else {
    // Male (explicit or default) - exclude girls divisions for generic queries
    resultsQuery = resultsQuery
      .not("division", "ilike", "%girl%")
      .not("division", "ilike", "%women%")
      .not("division", "ilike", "%female%")
  }

  // Apply division filter (freshman, sophomore, junior, senior) when explicitly requested
  if (division && ["freshman", "sophomore", "junior", "senior"].includes(division.toLowerCase())) {
    resultsQuery = resultsQuery.ilike("division", `%${division}%`)
  }

  // Handle year filtering: single year, year range, or all years
  if (startYear && endYear) {
    resultsQuery = resultsQuery.gte("year", startYear).lte("year", endYear)
  } else if (year) {
    resultsQuery = resultsQuery.eq("year", year)
  } else if (startYear) {
    resultsQuery = resultsQuery.gte("year", startYear)
  } else if (endYear) {
    resultsQuery = resultsQuery.lte("year", endYear)
  }

  if (wrestlerName) {
    resultsQuery = resultsQuery.ilike("athlete_name", `%${wrestlerName}%`)
  }

  if (schoolName) {
    // Filter by school name with case-insensitive partial matching
    resultsQuery = resultsQuery.ilike("high_school", `%${schoolName}%`)
  }

  const { data: nhscaData, error: nhscaError } = await resultsQuery
    .order("year", { ascending: false })
    .order("placement", { ascending: true })
    .order("weight", { ascending: true })
    .limit(10000)

  if (nhscaPlacementsError && nhscaError) {
    console.error("[Handler] nhsca_all_american error (both queries failed):", nhscaPlacementsError, nhscaError)
    throw nhscaPlacementsError
  }

  // Combine and deduplicate results
  // Use a more robust deduplication key that normalizes names and weights
  const allResults = new Map<string, any>()
  
  // Helper to normalize weight (remove "lbs" suffix, convert to number)
  const normalizeWeight = (w: any): string => {
    if (!w) return "0"
    const weightStr = String(w).replace(/lbs?/i, "").trim()
    return weightStr || "0"
  }
  
  // Helper to normalize name (lowercase, trim)
  const normalizeName = (name: string): string => {
    return (name || "").toLowerCase().trim()
  }
  
  // Helper to normalize school name (lowercase, trim, remove common variations)
  const normalizeSchool = (school: string): string => {
    if (!school) return ""
    return school.toLowerCase().trim()
      .replace(/\s+high\s+school$/i, "")
      .replace(/\s+hs$/i, "")
      .replace(/\s+school$/i, "")
  }
  
  // First, add nhsca_placements data (PRIMARY SOURCE - prefer this)
  if (nhscaPlacementsData && !nhscaPlacementsError) {
    nhscaPlacementsData.forEach((aa: any) => {
      const normalizedName = normalizeName(aa.athlete_name)
      const normalizedWeight = normalizeWeight(aa.weight_class || aa.weight)
      const normalizedSchool = normalizeSchool(aa.high_school || "")
      // Key: normalized name + year + division + normalized weight (school not in key to allow deduplication)
      const key = `${normalizedName}-${aa.year}-${aa.division || ""}-${normalizedWeight}`
      
      if (!allResults.has(key)) {
        allResults.set(key, {
          athlete_name: aa.athlete_name,
          placement: aa.placement,
          year: aa.year,
          division: aa.division,
          weight: aa.weight_class || aa.weight,
          high_school: aa.high_school,
          source: "nhsca_placements",
          normalizedSchool: normalizedSchool,
        })
      } else {
        // If key exists, prefer the record with the more complete school name
        const existing = allResults.get(key)!
        const existingSchool = normalizeSchool(existing.high_school || "")
        // Prefer longer/more complete school names, or keep existing if it's from nhsca_placements
        if (normalizedSchool.length > existingSchool.length || existing.source === "nhsca") {
          allResults.set(key, {
            athlete_name: aa.athlete_name,
            placement: aa.placement,
            year: aa.year,
            division: aa.division,
            weight: aa.weight_class || aa.weight,
            high_school: aa.high_school,
            source: "nhsca_placements",
            normalizedSchool: normalizedSchool,
          })
        }
      }
    })
  }
  
  // Then, add wrestling_nhsca_results data (FALLBACK - only if not already present)
  if (nhscaData && !nhscaError) {
    nhscaData.forEach((aa: any) => {
      const normalizedName = normalizeName(aa.athlete_name)
      const normalizedWeight = normalizeWeight(aa.weight || aa.weight_class)
      const normalizedSchool = normalizeSchool(aa.high_school || "")
      // Key: normalized name + year + division + normalized weight
      const key = `${normalizedName}-${aa.year}-${aa.division || ""}-${normalizedWeight}`
      
      if (!allResults.has(key)) {
        // Only add if not already present
        allResults.set(key, {
          athlete_name: aa.athlete_name,
          placement: aa.placement,
          year: aa.year,
          division: aa.division,
          weight: aa.weight || aa.weight_class,
          high_school: aa.high_school,
          source: "nhsca",
          normalizedSchool: normalizedSchool,
        })
      } else {
        // If key exists, only update if current record has a better school name
        const existing = allResults.get(key)!
        const existingSchool = normalizeSchool(existing.high_school || "")
        // Only update if new school name is significantly better (longer and more complete)
        if (normalizedSchool.length > existingSchool.length + 3 && existing.source === "nhsca") {
          allResults.set(key, {
            ...existing,
            high_school: aa.high_school,
            normalizedSchool: normalizedSchool,
          })
        }
      }
    })
  }

  // Merge broken "Name Part1" + "Part2" rows (e.g. "Jacob Perry New" + "Bern" -> "Jacob Perry" + "New Bern")
  const knownMultiWordSchools = new Set([
    "new bern", "mount airy", "first flight", "kitty hawk", "oak ridge",
    "northwest guilford", "northeast guilford", "browns summit", "blowing rock",
    "jay m. robinson", "robert b. glenn", "riverside-durham", "pilot mountain",
  ])
  const displaySchoolMap: Record<string, string> = {
    "new bern": "New Bern", "mount airy": "Mount Airy", "first flight": "First Flight",
    "kitty hawk": "Kitty Hawk", "oak ridge": "Oak Ridge",
    "northwest guilford": "Northwest Guilford", "northeast guilford": "Northeast Guilford",
    "browns summit": "Browns Summit", "blowing rock": "Blowing Rock",
    "jay m. robinson": "Jay M. Robinson", "robert b. glenn": "Robert B. Glenn",
    "riverside-durham": "Riverside-Durham", "pilot mountain": "Pilot Mountain",
  }
  const merged = Array.from(allResults.values()).map((r: any) => {
    const n = (r.athlete_name || "").trim()
    const s = (r.high_school || "").trim()
    const nameParts = n.split(/\s+/)
    const schoolParts = s.split(/\s+/).filter(Boolean)
    if (nameParts.length >= 2 && schoolParts.length >= 1) {
      const last = nameParts[nameParts.length - 1]
      const rest = schoolParts.join(" ")
      const c1 = `${last.toLowerCase()} ${rest.toLowerCase()}`.trim()
      const c2 = `${rest.toLowerCase()} ${last.toLowerCase()}`.trim()
      const match = knownMultiWordSchools.has(c1) ? c1 : knownMultiWordSchools.has(c2) ? c2 : null
      if (match) {
        const fixedName = nameParts.slice(0, -1).join(" ")
        const fixedSchool = displaySchoolMap[match] ?? match
        return { ...r, athlete_name: fixedName, high_school: fixedSchool, normalizedSchool: match }
      }
    }
    return r
  })

  // Re-deduplicate after merge (same name/year/division/weight can now collide)
  const mergedMap = new Map<string, any>()
  for (const r of merged) {
    const n = normalizeName(r.athlete_name)
    const w = normalizeWeight(r.weight_class || r.weight)
    const key = `${n}-${r.year}-${r.division || ""}-${w}`
    if (!mergedMap.has(key)) {
      mergedMap.set(key, r)
    } else {
      const ex = mergedMap.get(key)!
      const exSchool = normalizeSchool(ex.high_school || "")
      const rSchool = normalizeSchool(r.high_school || "")
      if (rSchool.length > exSchool.length) mergedMap.set(key, r)
    }
  }

  // Convert to array and sort
  // Check if user explicitly asked for "by year" sorting
  // Reuse the query variable from above (line 59) for consistency
  const sortByYear = query.includes("by year") || query.includes("by season") || query.includes("grouped by year")
  
  const combinedResults = Array.from(mergedMap.values())
    .sort((a, b) => {
      if (sortByYear) {
        // Sort by year (descending), then placement, then weight
        if (b.year !== a.year) return b.year - a.year
        if (a.placement !== b.placement) return a.placement - b.placement
        const aWeight = parseInt((a.weight || "").toString().replace(/lbs?/i, "")) || 0
        const bWeight = parseInt((b.weight || "").toString().replace(/lbs?/i, "")) || 0
        return aWeight - bWeight
      } else {
        // Default: Sort by athlete name alphabetically, then by year (descending), then by placement
        const aName = (a.athlete_name || "").toLowerCase()
        const bName = (b.athlete_name || "").toLowerCase()
        if (aName !== bName) return aName.localeCompare(bName)
        if (b.year !== a.year) return b.year - a.year
        if (a.placement !== b.placement) return a.placement - b.placement
        const aWeight = parseInt((a.weight || "").toString().replace(/lbs?/i, "")) || 0
        const bWeight = parseInt((b.weight || "").toString().replace(/lbs?/i, "")) || 0
        return aWeight - bWeight
      }
    })

  // Build year description for logging
  let yearDesc = ""
  if (startYear && endYear) {
    yearDesc = ` for ${startYear}-${endYear}`
  } else if (year) {
    yearDesc = ` for ${year}`
  } else if (startYear) {
    yearDesc = ` from ${startYear} onwards`
  } else if (endYear) {
    yearDesc = ` up to ${endYear}`
  }

  console.log(`[Handler] nhsca_all_american: Found ${combinedResults.length} unique All-Americans${yearDesc}${division ? ` (${division})` : ""}${wrestlerName ? ` for ${wrestlerName}` : ""}${schoolName ? ` from ${schoolName}` : ""}`)

  return {
    results: combinedResults,
  }
}

