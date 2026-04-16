import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

// Helper function to normalize name variations (e.g., "Nick" -> "Nicholas")
function normalizeNameVariation(name: string): string {
  const nameMap: Record<string, string> = {
    "nick": "nicholas",
    "jon": "jonathan",
    "john": "jonathan",
    "mike": "michael",
    "mikey": "michael",
    "tom": "thomas",
    "tommy": "thomas",
    "jim": "james",
    "jimmy": "james",
    "bob": "robert",
    "bobby": "robert",
    "dave": "david",
    "davey": "david",
    "dan": "daniel",
    "danny": "daniel",
    "chris": "christopher",
    "alex": "alexander",
    "will": "william",
    "bill": "william",
    "ed": "edward",
    "eddie": "edward",
    "joe": "joseph",
    "joey": "joseph",
    "sam": "samuel",
    "sammy": "samuel",
    "ben": "benjamin",
    "benny": "benjamin",
    "matt": "matthew",
    "nate": "nathaniel",
    "josh": "joshua",
    "andy": "andrew",
    "drew": "andrew",
  }
  const lower = name.toLowerCase().trim()
  return nameMap[lower] || name
}

// Helper function to extract and normalize name parts
function getNormalizedNameKey(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return fullName.toLowerCase()
  
  const firstName = parts[0]
  const lastName = parts[parts.length - 1] // Last part is last name
  const normalizedFirst = normalizeNameVariation(firstName)
  
  return `${normalizedFirst} ${lastName}`.toLowerCase()
}

// Helper function to parse weight to number
function parseWeight(weight: string | number | null): number {
  if (typeof weight === 'number') return weight
  if (!weight) return 0
  const match = String(weight).match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

// Helper to extract wrestler name from query string (shared with NHSCA handler)
function extractWrestlerNameFromQuery(query: string): string | null {
  if (!query) return null
  
  const lower = query.toLowerCase()
  
  // Patterns like "did [name] place", "is [name] a", "was [name] a"
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

export const handleSuper32AllAmerican: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const year = params.year
  const startYear = params.startYear
  const endYear = params.endYear
  // Extract name from params or query string
  let wrestlerName = params.wrestler || params.name
  if (!wrestlerName && (params.query || params.search)) {
    const query = params.query || params.search || ""
    wrestlerName = extractWrestlerNameFromQuery(query) || null
  }
  const schoolName = params.school
  const gender = params.gender // 'M' for Men, 'F' for Women, null for both
  const championsOnly = params.championsOnly // If true, only return placement = 1

  // Women's weight classes at Super32 (include NULL/M at these weights so we don't miss 2025+ data)
  const WOMENS_WEIGHT_CLASSES = new Set([
    "95", "97", "100", "103", "106", "107", "108", "110", "112", "114", "118", "120", "124", "126", "128", "132", "138", "140", "145", "148", "152", "160", "170", "185", "195", "200", "235"
  ])
  const isWomensWeight = (wc: string | number | null) => {
    if (wc == null) return false
    const n = String(wc).replace(/lbs?$/i, "").trim()
    return WOMENS_WEIGHT_CLASSES.has(n)
  }

  const buildBaseQuery = () => {
    let q = adminClient
      .from("super32_results")
      .select("athlete_name, placement, year, weight_class, wins, losses, record, high_school, school, gender")
      .gte("placement", 1)
      .lte("placement", championsOnly ? 1 : 8)
      .not("athlete_name", "is", null)
      .neq("athlete_name", "")
    if (startYear && endYear) q = q.gte("year", startYear).lte("year", endYear)
    else if (year) q = q.eq("year", year)
    else if (startYear) q = q.gte("year", startYear)
    else if (endYear) q = q.lte("year", endYear)
    if (wrestlerName) q = q.ilike("athlete_name", `%${wrestlerName}%`)
    if (schoolName) q = q.or(`high_school.ilike.%${schoolName}%,school.ilike.%${schoolName}%`)
    return q
  }

  let super32Data: any[] = []

  if (gender === "F") {
    // Female only: gender='F' plus NULL-gender at women's weight classes (do NOT include M - men's weights overlap and would mix in male AAs)
    const base = buildBaseQuery()
    const { data: dataF, error: errF } = await base.eq("gender", "F")
      .order("year", { ascending: false })
      .order("placement", { ascending: true })
      .order("weight_class", { ascending: true })
      .limit(10000)
    if (errF) {
      console.error("[Handler] super32_all_american error (F):", errF)
      throw errF
    }
    const baseNull = buildBaseQuery()
    const { data: dataNull, error: errNull } = await baseNull
      .is("gender", null)
      .order("year", { ascending: false })
      .order("placement", { ascending: true })
      .order("weight_class", { ascending: true })
      .limit(10000)
    if (errNull) {
      console.error("[Handler] super32_all_american error (null gender):", errNull)
      throw errNull
    }
    const seen = new Set<string>()
    ;(dataF || []).forEach((r: any) => {
      const key = `${r.athlete_name}|${r.year}|${r.weight_class}`
      if (!seen.has(key)) {
        seen.add(key)
        super32Data.push(r)
      }
    })
    ;(dataNull || []).forEach((r: any) => {
      if (!isWomensWeight(r.weight_class)) return
      const key = `${r.athlete_name}|${r.year}|${r.weight_class}`
      if (!seen.has(key)) {
        seen.add(key)
        super32Data.push({ ...r, gender: "F" })
      }
    })
  } else if (gender === "M") {
    const base = buildBaseQuery().eq("gender", "M")
    const { data, error: super32Error } = await base
      .order("year", { ascending: false })
      .order("placement", { ascending: true })
      .order("weight_class", { ascending: true })
      .limit(10000)
    if (super32Error) throw super32Error
    super32Data = data || []
  } else {
    const { data, error: super32Error } = await buildBaseQuery()
      .order("year", { ascending: false })
      .order("placement", { ascending: true })
      .order("weight_class", { ascending: true })
      .limit(10000)
    if (super32Error) throw super32Error
    super32Data = data || []
  }

  // Format results
  const formattedResults = (super32Data || []).map((aa: any) => ({
    athlete_name: aa.athlete_name,
    placement: aa.placement,
    year: aa.year,
    weight_class: aa.weight_class,
    weight: aa.weight_class,
    wins: aa.wins,
    losses: aa.losses,
    record: aa.record,
    high_school: aa.high_school || aa.school,
    gender: aa.gender,
    source: "super32",
  }))

  // Deduplicate results based on name variations, same year, and similar weight
  // Group by normalized name (e.g., "Nick Gregoris" and "Nicholas Gregoris" -> same key)
  const resultsByNormalizedName = new Map<string, any[]>()
  
  formattedResults.forEach((result: any) => {
    const normalizedKey = getNormalizedNameKey(result.athlete_name)
    if (!resultsByNormalizedName.has(normalizedKey)) {
      resultsByNormalizedName.set(normalizedKey, [])
    }
    resultsByNormalizedName.get(normalizedKey)!.push(result)
  })

  // For each normalized name group, deduplicate entries with same year and similar weight
  const deduplicatedResults: any[] = []
  const seenEntries = new Set<string>()
  
  resultsByNormalizedName.forEach((group) => {
    // Group by year first
    const byYear = new Map<number, any[]>()
    group.forEach((result: any) => {
      if (!byYear.has(result.year)) {
        byYear.set(result.year, [])
      }
      byYear.get(result.year)!.push(result)
    })

    // For each year, check for duplicates with similar weights
    byYear.forEach((yearGroup, year) => {
      yearGroup.forEach((result: any) => {
        const weight = parseWeight(result.weight_class)
        const entryKey = `${getNormalizedNameKey(result.athlete_name)}|${year}|${weight}`
        
        // Check if we've already added a similar entry (same normalized name, same year, similar weight)
        let isDuplicate = false
        for (const seenKey of seenEntries) {
          const [seenNormalized, seenYearStr, seenWeightStr] = seenKey.split('|')
          const seenYear = parseInt(seenYearStr, 10)
          const seenWeight = parseInt(seenWeightStr, 10)
          
          if (seenNormalized === getNormalizedNameKey(result.athlete_name) && 
              seenYear === year && 
              Math.abs(seenWeight - weight) <= 10) {
            // Same person, same year, similar weight - this is a duplicate
            isDuplicate = true
            
            // Prefer the full name version over nickname
            const currentNameParts = result.athlete_name.trim().split(/\s+/)
            const currentFirst = currentNameParts[0].toLowerCase()
            const normalizedFirst = normalizeNameVariation(currentFirst)
            
            // If current is a nickname and we have a full name version, skip this one
            if (normalizedFirst !== currentFirst) {
              break
            }
          }
        }
        
        if (!isDuplicate) {
          seenEntries.add(entryKey)
          
          // Prefer canonical/full name if available in the same year group
          const nameParts = result.athlete_name.trim().split(/\s+/)
          const firstName = nameParts[0]
          const normalizedFirst = normalizeNameVariation(firstName)
          
          // If this is a nickname, look for full name version in same year
          if (normalizedFirst !== firstName.toLowerCase()) {
            const fullNameVersion = yearGroup.find((r: any) => {
              const rParts = r.athlete_name.trim().split(/\s+/)
              const rFirst = rParts[0].toLowerCase()
              return rFirst === normalizedFirst && 
                     rParts.length === nameParts.length && // Same number of name parts
                     rParts[rParts.length - 1].toLowerCase() === nameParts[nameParts.length - 1].toLowerCase() // Same last name
            })
            
            if (fullNameVersion) {
              const fullWeight = parseWeight(fullNameVersion.weight_class)
              if (Math.abs(fullWeight - weight) <= 10) {
                // Use full name version instead
                result = { ...fullNameVersion }
              }
            }
          }
          
          deduplicatedResults.push(result)
        }
      })
    })
  })

  // Sort final results
  // Check if user explicitly asked for "by year" sorting
  // Use userQueryText to avoid conflict with database query variable
  const userQueryText = (params.query || params.search || "").toLowerCase()
  const sortByYear = userQueryText.includes("by year") || userQueryText.includes("by season") || userQueryText.includes("grouped by year")
  
  const results = deduplicatedResults.sort((a, b) => {
    if (sortByYear) {
      // Sort by year (descending), then placement, then weight
      if (b.year !== a.year) return b.year - a.year
      if (a.placement !== b.placement) return a.placement - b.placement
      const aWeight = parseWeight(a.weight_class)
      const bWeight = parseWeight(b.weight_class)
      return aWeight - bWeight
    } else {
      // Default: Sort by athlete name alphabetically, then by year (descending), then by placement
      const aName = (a.athlete_name || "").toLowerCase()
      const bName = (b.athlete_name || "").toLowerCase()
      if (aName !== bName) return aName.localeCompare(bName)
      if (b.year !== a.year) return b.year - a.year
      if (a.placement !== b.placement) return a.placement - b.placement
      const aWeight = parseWeight(a.weight_class)
      const bWeight = parseWeight(b.weight_class)
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

  const queryType = championsOnly ? "Super32 Champions" : "Super32 All-Americans"
  console.log(`[Handler] super32_all_american: Found ${results.length} ${queryType}${yearDesc}${wrestlerName ? ` for ${wrestlerName}` : ""}${schoolName ? ` from ${schoolName}` : ""}`)

  return {
    results,
  }
}
