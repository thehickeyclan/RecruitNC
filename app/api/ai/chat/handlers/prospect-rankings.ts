import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"
import { RECRUITNC_APP_URL, getAthleteProfileUrl } from "@/lib/athlete-profile-links"
import {
  clampProspectRankingsLimit,
  getPublicRankingsMax,
  isPublicRankingsYearPublished,
  PUBLISHED_PUBLIC_RANKINGS_YEARS,
} from "@/lib/public-rankings-cap"

const RECRUITNC_RANKINGS_CTA = `\n\n---\n**To see all rankings**, sign up for a free RecruitNC account or sign in: [RecruitNC →](${RECRUITNC_APP_URL})`

// Helper function for fuzzy name matching (similar to route.ts)
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[str2.length][str1.length]
}

export const handleProspectRankings: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  
  // Extract parameters
  const query = (params.query || params.search || "").toLowerCase()
  const originalQuery = (params.query || params.search || "")
  const graduationYear = params.year || params.graduationYear || params.graduationyear
  
  // Check if this is asking about Super32 performance among prospect rankings
  // This should be checked FIRST before individual ranking queries
  const isSuper32PerformanceQuery = 
    (query.includes("super32") || query.includes("super 32")) &&
    (query.includes("prospect") || query.includes("ranked") || query.includes("class of")) &&
    (query.includes("best") || query.includes("who did") || query.includes("performance") || query.includes("how did"))
  
  if (isSuper32PerformanceQuery) {
    // Extract graduation year
    let year: number | null = graduationYear ? parseInt(String(graduationYear), 10) : null
    if (!year) {
      const yearMatch = query.match(/\b(20\d{2})\b/)
      if (yearMatch) {
        let extractedYear = parseInt(yearMatch[1])
        if (extractedYear >= 2200 && extractedYear <= 2299) {
          extractedYear = extractedYear - 200
        }
        if (extractedYear >= 2000 && extractedYear <= 2100) {
          year = extractedYear
        }
      } else if (query.includes("class of")) {
        const classOfMatch = query.match(/class\s+of\s+(\d{4})/i)
        if (classOfMatch) {
          let extractedYear = parseInt(classOfMatch[1])
          if (extractedYear >= 2200 && extractedYear <= 2299) {
            extractedYear = extractedYear - 200
          }
          if (extractedYear >= 2000 && extractedYear <= 2100) {
            year = extractedYear
          }
        }
      }
    }
    if (!year) year = PUBLISHED_PUBLIC_RANKINGS_YEARS[0] ?? 2027
    if (!isPublicRankingsYearPublished(year)) {
      return {
        directResponse: NextResponse.json({
          answer: `Class of ${year} rankings are not public yet. Public RecruitNC rankings are currently available for Class of ${PUBLISHED_PUBLIC_RANKINGS_YEARS.join(" and ")}.`,
          messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          queryType: "prospect_rankings",
        }),
      }
    }
    
    console.log(`[Handler] prospect_rankings: Super32 performance query for class of ${year}`)
    
    // Official published ranks only.
    const maxRank = getPublicRankingsMax(year)
    const { data: rankings, error: rankingsError } = await adminClient
      .from("athletes")
      .select("id, name, highschool, prospect_ranking, graduationyear, gender")
      .eq("graduationyear", year)
      .not("prospect_ranking", "is", null)
      .lte("prospect_ranking", maxRank)
      .order("prospect_ranking", { ascending: true })
      .limit(maxRank)
    
    if (rankingsError) {
      console.error("[Handler] prospect_rankings error:", rankingsError)
      throw rankingsError
    }
    
    if (!rankings || rankings.length === 0) {
      return {
        directResponse: NextResponse.json({
          answer: `I couldn't find any prospect rankings for the class of ${year}.`,
          messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          queryType: "prospect_rankings",
        })
      }
    }
    
    // Get Super32 results for recent years (2024, 2025)
    const { data: super32Results, error: super32Error } = await adminClient
      .from("super32_results")
      .select("athlete_name, year, weight_class, wins, losses, record, placement, high_school, school")
      .in("year", [2024, 2025])
      .not("placement", "is", null)
      .order("placement", { ascending: true })
      .limit(5000)
    
    if (super32Error) {
      console.error("[Handler] prospect_rankings Super32 error:", super32Error)
      throw super32Error
    }
    
    // Match prospect rankings with Super32 results
    const matchedResults: any[] = []
    
    for (const athlete of rankings) {
      const athleteName = athlete.name
      
      // Find Super32 results for this athlete (fuzzy name matching)
      const super32Matches = (super32Results || []).filter((result: any) => {
        const resultName = (result.athlete_name || "").toLowerCase()
        const searchName = athleteName.toLowerCase()
        
        // Exact match or contains match
        if (resultName === searchName || resultName.includes(searchName) || searchName.includes(resultName)) {
          return true
        }
        
        // Check if first and last name match (handle middle names/initials)
        const resultParts = resultName.split(/\s+/)
        const searchParts = searchName.split(/\s+/)
        if (resultParts.length >= 2 && searchParts.length >= 2) {
          const resultFirst = resultParts[0]
          const resultLast = resultParts[resultParts.length - 1]
          const searchFirst = searchParts[0]
          const searchLast = searchParts[searchParts.length - 1]
          
          if (resultFirst === searchFirst && resultLast === searchLast) {
            return true
          }
        }
        
        return false
      })
      
      if (super32Matches.length > 0) {
        // Get best placement (lowest number is best)
        const bestResult = super32Matches.reduce((best: any, current: any) => {
          const bestPlace = best.placement || 999
          const currentPlace = current.placement || 999
          return currentPlace < bestPlace ? current : best
        })
        
        matchedResults.push({
          ...athlete,
          super32Result: bestResult,
          super32Placement: bestResult.placement,
          super32Year: bestResult.year,
          super32Weight: bestResult.weight_class,
          super32Record: bestResult.record || `${bestResult.wins || 0}-${bestResult.losses || 0}`,
        })
      }
    }
    
    if (matchedResults.length === 0) {
      return {
        directResponse: NextResponse.json({
          answer: `I couldn't find any Super32 results for the class of ${year} prospect rankings. They may not have competed at Super32 yet, or the data may need to be updated.`,
          messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          queryType: "prospect_rankings",
        })
      }
    }
    
    // Sort by Super32 placement (best first)
    matchedResults.sort((a, b) => {
      const aPlace = a.super32Placement || 999
      const bPlace = b.super32Placement || 999
      return aPlace - bPlace
    })
    
    // Format response
    let answer = `🏆 **Class of ${year} Prospect Rankings - Super32 Performance**\n\n`
    answer += `Found ${matchedResults.length} ranked prospect${matchedResults.length !== 1 ? 's' : ''} with Super32 results:\n\n`
    
    matchedResults.slice(0, 50).forEach((result: any, index: number) => {
      const name = result.name || "Unknown"
      const rank = result.prospect_ranking
      const placement = result.super32Placement
      const year = result.super32Year
      const weight = result.super32Weight || "Unknown"
      const record = result.super32Record
      const school = result.highschool || "Unknown"
      
      let nameText = name
      if (result.id) {
        const profileUrl = getAthleteProfileUrl(result.id)
        nameText = `[${name}](${profileUrl})`
      }
      
      const placementText = placement === 1 ? "1st" : placement === 2 ? "2nd" : placement === 3 ? "3rd" : `${placement}th`
      answer += `${index + 1}. **${nameText}** (Prospect Rank #${rank}) - ${placementText} place at Super32 ${year} (${weight}lbs, ${record})\n`
      answer += `   School: ${school}\n`
      answer += `\n`
    })
    
    if (matchedResults.length > 50) {
      answer += `\n*Showing top 50 of ${matchedResults.length} total matches.*\n`
    }
    
    return {
      directResponse: NextResponse.json({
        answer,
        results: matchedResults,
        count: matchedResults.length,
        messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        queryType: "prospect_rankings",
      })
    }
  }
  
  // Check if this is asking about a specific athlete's ranking
  // Patterns: "what is [name] ranked", "what is [name]'s ranking", "[name] ranked", "[name] ranking"
  // Exclude list queries like "show all", "who is ranked #1", "class of 2026", etc.
  const isListQuery = 
    query.includes("show") ||
    (query.includes("all") && (query.includes("ranked") || query.includes("class"))) ||
    query.includes("top") ||
    query.includes("class of") ||
    query.match(/\b(20\d{2})\b/) || // Contains a year
    query.includes("who is ranked #") ||
    query.match(/who\s+is\s+ranked\s+#?\d+/i) ||
    query.includes("ranked kids") ||
    query.includes("ranked prospects") ||
    (query.includes("who is") && query.includes("ranked") && !query.match(/what\s+is\s+[a-z]+\s+[a-z]+/i)) // "who is ranked #1" but not "what is John Smith ranked"
  
  const isIndividualRankingQuery = 
    !isListQuery &&
    (
      (query.includes("what is") && (query.includes("ranked") || query.includes("ranking")) && !query.includes("class of") && !query.match(/\b(20\d{2})\b/)) ||
      (query.match(/^[a-z]+\s+[a-z]+(?:\s+[a-z]+)?\s+(?:ranked|ranking)/i) && !query.includes("class of") && !query.match(/\b(20\d{2})\b/)) // Pattern: "John Smith ranked" but not with years
    )
  
  if (isIndividualRankingQuery) {
    // Extract athlete name from query
    // Remove common phrases: "what is", "ranked", "ranking", "what's", etc.
    let nameQuery = originalQuery
      .replace(/what\s+is\s+/i, "")
      .replace(/what's\s+/i, "")
      .replace(/\s+ranked.*/i, "")
      .replace(/\s+ranking.*/i, "")
      .replace(/\s+rank.*/i, "")
      .replace(/['']s\s+ranking.*/i, "")
      .replace(/['']s\s+ranked.*/i, "")
      .trim()
    
    // If name query is too short or looks like it's not a name, try to extract better
    if (nameQuery.length < 3 || nameQuery.split(/\s+/).length < 2) {
      // Try to find name between "what is" and "ranked/ranking"
      const nameMatch = originalQuery.match(/(?:what\s+is|what's)\s+([^?]+?)\s+(?:ranked|ranking|rank)/i)
      if (nameMatch) {
        nameQuery = nameMatch[1].trim()
      }
    }
    
    // Skip if it looks like a list query (contains "show", "all", "top", "class of", years, etc.)
    const nameQueryLower = nameQuery.toLowerCase()
    if (nameQueryLower.includes("show") || 
        nameQueryLower.includes("all") || 
        nameQueryLower.includes("top") || 
        nameQueryLower.includes("class of") ||
        nameQueryLower.match(/\b(20\d{2})\b/) ||
        nameQueryLower.includes("who is") ||
        nameQueryLower.includes("ranked kids") ||
        nameQueryLower.includes("ranked prospects")) {
      // This is actually a list query, skip individual handling
      console.log(`[Handler] prospect_rankings: Skipping individual query - looks like list query: "${nameQuery}"`)
    } else {
      console.log(`[Handler] prospect_rankings: Individual query for "${nameQuery}"`)
      
      if (nameQuery && nameQuery.length >= 3) {
        // Search for athlete by name — only within published top-N
        const normalizedName = nameQuery.toLowerCase().trim()
        const classYearGuess = (() => {
          const m = originalQuery.match(/\b(20\d{2})\b/)
          return m ? parseInt(m[1], 10) : null
        })()
        const lookupYears = classYearGuess ? [classYearGuess] : PUBLISHED_PUBLIC_RANKINGS_YEARS
        const maxForLookup = getPublicRankingsMax(lookupYears[0])
        if (classYearGuess && !isPublicRankingsYearPublished(classYearGuess)) {
          return {
            directResponse: NextResponse.json({
              answer: `Class of ${classYearGuess} rankings are not public yet. Public RecruitNC rankings are currently available for Class of ${PUBLISHED_PUBLIC_RANKINGS_YEARS.join(" and ")}.`,
              messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              queryType: "prospect_rankings",
            }),
          }
        }
        
        // Try exact match first
        let { data: exactMatches } = await adminClient
          .from("athletes")
          .select("id, name, highschool, prospect_ranking, graduationyear, gender")
          .ilike("name", `%${normalizedName}%`)
          .in("graduationyear", lookupYears)
          .not("prospect_ranking", "is", null)
          .lte("prospect_ranking", maxForLookup)
          .limit(10)
        
        if (exactMatches && exactMatches.length > 0) {
          // Prefer match in the queried class year when present
          if (classYearGuess) {
            const yearHits = exactMatches.filter((a: any) => Number(a.graduationyear) === classYearGuess)
            if (yearHits.length) exactMatches = yearHits
          }
          // If multiple matches, try to find best match
          let bestMatch = exactMatches[0]
          
          if (exactMatches.length > 1) {
            // Use fuzzy matching to find best match
            const scored = exactMatches.map((athlete: any) => {
              const athleteName = athlete.name.toLowerCase()
              const distance = levenshteinDistance(normalizedName, athleteName)
              const maxLen = Math.max(normalizedName.length, athleteName.length)
              const similarity = 1 - (distance / maxLen)
              return { athlete, similarity }
            })
            
            scored.sort((a: any, b: any) => b.similarity - a.similarity)
            bestMatch = scored[0].athlete
          }
          
          const rank = bestMatch.prospect_ranking
          const name = bestMatch.name
          const school = bestMatch.highschool || "Unknown"
          const year = bestMatch.graduationyear || "Unknown"
          const gender = bestMatch.gender || ""
          const publishedMax = getPublicRankingsMax(
            typeof year === "number" ? year : Number(year) || PUBLISHED_PUBLIC_RANKINGS_YEARS[0] || 2027,
          )
          
          let nameText = name
          if (bestMatch.id) {
            const profileUrl = getAthleteProfileUrl(bestMatch.id)
            nameText = `[${name}](${profileUrl})`
          }
          
          const genderText = gender ? ` (${gender})` : ""
          const answer = `🏆 **${nameText}** is ranked **#${rank}** in the prospect rankings for the class of ${year}${genderText} (published top ${publishedMax}).\n\n${school && school !== "Unknown" ? `**School:** ${school}` : ""}\n\n_View their full profile by clicking on their name above._`
          
          return {
            directResponse: NextResponse.json({
              answer,
              results: [bestMatch],
              count: 1,
              messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              queryType: "prospect_rankings",
            })
          }
        } else {
          // No exact match found
          return {
            directResponse: NextResponse.json({
              answer: `I couldn't find "${nameQuery}" in RecruitNC's published prospect rankings (top ${maxForLookup} per class). They may be unranked, or the name might be spelled differently.`,
              messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              queryType: "prospect_rankings",
            })
          }
        }
      }
    }
  }
  
  // Default to list query (top prospects or all published ranked)
  // Check if query asks for "all ranked" prospects — still capped at official top N
  const wantsAllRanked =
    query.includes("all ranked") ||
    query.includes("all ranking") ||
    (query.includes("show") && query.includes("all") && (query.includes("ranked") || query.includes("ranking")))
  
  // Check if query asks "who is ranked #X" - return just that person
  const whoIsRankedMatch = query.match(/who\s+is\s+ranked\s+#?(\d+)/i)
  let specificRank: number | null = null
  if (whoIsRankedMatch) {
    specificRank = parseInt(whoIsRankedMatch[1], 10)
  }
  
  // Extract number of top prospects - params.topN takes precedence (e.g. from route when unauthenticated)
  let topN: number | null = params.topN != null ? params.topN : null
  if (topN === null) {
    if (wantsAllRanked) {
      topN = null // clamped to official cap after year is known
    } else if (specificRank !== null) {
      topN = specificRank
    } else {
      const topMatch = query.match(/top\s+(\d+)/i)
      if (topMatch) {
        topN = parseInt(topMatch[1], 10)
      } else if (query.includes("top")) {
        topN = 10
      } else {
        topN = 10
      }
    }
  }
  
  const isAuthenticated = params.isAuthenticated === true
  const yearsParam = params.years as number[] | undefined
  
  // Extract graduation year from query if not provided in params
  let year: number | null = graduationYear ? parseInt(String(graduationYear), 10) : null
  if (!year) {
    const yearMatch = query.match(/\b(20\d{2})\b/) // Match years like 2026, 2027
    if (yearMatch) {
      let extractedYear = parseInt(yearMatch[1])
      // Fix common typos: 2206 -> 2026, 2207 -> 2027, etc.
      if (extractedYear >= 2200 && extractedYear <= 2299) {
        extractedYear = extractedYear - 200
      }
      if (extractedYear >= 2000 && extractedYear <= 2100) {
        year = extractedYear
      }
    } else if (query.includes("class of")) {
      const classOfMatch = query.match(/class\s+of\s+(\d{4})/i)
      if (classOfMatch) {
        let extractedYear = parseInt(classOfMatch[1])
        if (extractedYear >= 2200 && extractedYear <= 2299) {
          extractedYear = extractedYear - 200
        }
        if (extractedYear >= 2000 && extractedYear <= 2100) {
          year = extractedYear
        }
      }
    }
  }
  
  // Default to the first public class if no year specified.
  if (!year) {
    year = PUBLISHED_PUBLIC_RANKINGS_YEARS[0] ?? 2027
  }

  if (!isPublicRankingsYearPublished(year)) {
    return {
      directResponse: NextResponse.json({
        answer: `Class of ${year} rankings are not public yet. Public RecruitNC rankings are currently available for Class of ${PUBLISHED_PUBLIC_RANKINGS_YEARS.join(" and ")}.`,
        messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        queryType: "prospect_rankings",
      }),
    }
  }

  // RecruitNC only publishes top N per class — never list beyond that
  const publicCap = getPublicRankingsMax(year)
  topN = clampProspectRankingsLimit(year, topN)
  
  // Extract gender filter
  let genderFilter: string | null = null
  if (query.includes("female") || query.includes("woman") || query.includes("girls") || query.includes("girl")) {
    genderFilter = "Female"
  } else if (query.includes("male") || query.includes("man") || query.includes("boys") || query.includes("boy")) {
    genderFilter = "Male"
  }
  
  // Multi-year: "show class of 2027, 2028 rankings" or "top wrestlers" → top 5 per public graduation class
  const yearsToFetch = (yearsParam && yearsParam.length > 1)
    ? yearsParam.filter(isPublicRankingsYearPublished)
    : [year!]
  const effectiveTopN =
    yearsToFetch.length > 1 && !isAuthenticated
      ? Math.min(5, publicCap)
      : topN
  const showRankingsCTA = !isAuthenticated && effectiveTopN !== null && effectiveTopN <= 10
  const askedByClassificationOrWeight = /\b(1a|2a|3a|4a|1a-2a|2a-3a)\b|at\s+\d{3}/i.test(query)

  if (specificRank !== null && specificRank > publicCap) {
    return {
      directResponse: NextResponse.json({
        answer: `RecruitNC publishes the **top ${publicCap}** prospects for the class of ${year}. We don't publish rankings beyond #${publicCap}.`,
        messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        queryType: "prospect_rankings",
      }),
    }
  }

  if (yearsToFetch.length > 1) {
    const sections: string[] = []
    const intro = askedByClassificationOrWeight
      ? "Here are our **prospect rankings** — top 5 per graduation class. (Rankings aren’t filtered by NCHSAA classification or weight.)\n\n"
      : ""
    for (const y of yearsToFetch) {
      const yCap = getPublicRankingsMax(y)
      const yLimit = clampProspectRankingsLimit(y, effectiveTopN)
      let q = adminClient
        .from("athletes")
        .select("id, name, highschool, prospect_ranking, graduationyear, gender")
        .eq("graduationyear", y)
        .not("prospect_ranking", "is", null)
        .lte("prospect_ranking", yCap)
        .order("prospect_ranking", { ascending: true })
        .limit(yLimit)
      if (genderFilter) q = q.eq("gender", genderFilter)
      const { data: yrRankings } = await q
      if (yrRankings && yrRankings.length > 0) {
        sections.push(`**Class of ${y}** (Top ${yLimit}):`)
        yrRankings.forEach((a: any, i: number) => {
          const r = a.prospect_ranking ?? i + 1
          const nameText = a.id ? `[${a.name}](${getAthleteProfileUrl(a.id)})` : a.name
          sections.push(`${r}. **${nameText}** - ${a.highschool || "Unknown"}`)
        })
        sections.push("")
      }
    }
    let multiAnswer = intro + sections.join("\n")
    if (showRankingsCTA) multiAnswer += RECRUITNC_RANKINGS_CTA
    return {
      directResponse: NextResponse.json({
        answer: multiAnswer,
        results: [],
        count: 0,
        messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        queryType: "prospect_rankings",
      }),
    }
  }
  
  console.log(`[Handler] prospect_rankings: year=${year}, topN=${topN}, gender=${genderFilter || "all"}, isAuthenticated=${isAuthenticated}`)
  
  // Build query — always capped at official published top N
  let dbQuery = adminClient
    .from("athletes")
    .select("id, name, highschool, prospect_ranking, graduationyear, gender")
    .eq("graduationyear", year)
    .not("prospect_ranking", "is", null)
    .lte("prospect_ranking", publicCap)
    .order("prospect_ranking", { ascending: true })
    .limit(topN!)
  
  // Apply gender filter if specified
  if (genderFilter) {
    dbQuery = dbQuery.eq("gender", genderFilter)
  }
  
  const { data: rankings, error } = await dbQuery
  
  if (error) {
    console.error("[Handler] prospect_rankings error:", error)
    throw error
  }
  
  if (!rankings || rankings.length === 0) {
    let suggestion = ""
    try {
      const { data: yearsData } = await adminClient
        .from("athletes")
        .select("graduationyear")
        .not("prospect_ranking", "is", null)
        .not("graduationyear", "is", null)
      const years = [...new Set((yearsData || []).map((r: any) => Number(r.graduationyear)).filter((y: number) => y >= 2000 && y <= 2100))].sort()
      const publicYears = years.filter(isPublicRankingsYearPublished)
      if (publicYears.length > 0) {
        const list = publicYears.map((y) => `**${y}**`).join(", ")
        const ex = publicYears.length === 1
          ? `Try "class of ${publicYears[0]} rankings".`
          : `Try "class of ${publicYears[0]} rankings" or "show class of ${publicYears[publicYears.length - 1]} rankings".`
        suggestion = `\n\nProspect rankings are available for ${list}. ${ex}`
      }
    } catch (_) { /* ignore */ }
    const answer = `I couldn't find any prospect rankings for the class of ${year}${genderFilter ? ` (${genderFilter})` : ""}. The rankings may not be available yet for that class.${suggestion}`
    return {
      directResponse: NextResponse.json({
        answer,
        messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        queryType: "prospect_rankings",
      })
    }
  }
  
  // Format response
  const genderText = genderFilter ? ` (${genderFilter})` : ""
  
  // If asking for a specific rank (e.g., "who is ranked #1"), return just that person
  if (specificRank !== null && rankings.length > 0) {
    const rankedAthlete = rankings.find((a: any) => a.prospect_ranking === specificRank) || rankings[0]
    const name = rankedAthlete.name || "Unknown"
    const school = rankedAthlete.highschool || "Unknown"
    const rank = rankedAthlete.prospect_ranking || specificRank
    
    let nameText = name
    if (rankedAthlete.id) {
      const profileUrl = getAthleteProfileUrl(rankedAthlete.id)
      nameText = `[${name}](${profileUrl})`
    }
    
    const answer = `🏆 **${nameText}** is ranked **#${rank}** in the prospect rankings for the class of ${year}${genderText}.\n\n${school && school !== "Unknown" ? `**School:** ${school}` : ""}\n\n_View their full profile by clicking on their name above._`
    
    return {
      directResponse: NextResponse.json({
        answer,
        results: [rankedAthlete],
        count: 1,
        messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        queryType: "prospect_rankings",
      })
    }
  }
  
  // Check if detailed format is requested (for script output)
  const wantsDetailedFormat = params.detailed || params.script || 
                               query.includes("script") || 
                               query.includes("detailed") ||
                               (topN !== null && topN <= 25 && query.includes("top 25"))
  
  // If detailed format requested, fetch tournament results for each athlete
  if (wantsDetailedFormat && rankings.length > 0) {
    const detailedResults = await Promise.all(
      rankings.map(async (athlete: any) => {
        const athleteName = athlete.name
        const rank = athlete.prospect_ranking

        let nhscaResults: any[] | null = null
        if (athlete.id) {
          try {
            const { fetchRecruitNcWrestlingAchievements, mapRecruitNcNhscaToRows } = await import(
              "@/lib/recruitnc-wrestling-achievements"
            )
            const res = await fetchRecruitNcWrestlingAchievements({ athleteId: athlete.id })
            if (res?.nhsca?.length) {
              nhscaResults = mapRecruitNcNhscaToRows(res.nhsca, athleteName, athlete.highschool)
            }
          } catch {
            nhscaResults = null
          }
        }
        if (!nhscaResults) {
          const { data } = await adminClient
            .from("wrestling_nhsca_results")
            .select("year, placement, wins, losses, record, weight, division")
            .ilike("athlete_name", `%${athleteName}%`)
            .in("year", [2024, 2025])
            .order("year", { ascending: false })
          nhscaResults = data || []
        }
        
        // Query Super32 results for 2024 and 2025
        const { data: super32Results } = await adminClient
          .from("super32_results")
          .select("year, placement, wins, losses, record")
          .ilike("athlete_name", `%${athleteName}%`)
          .in("year", [2024, 2025])
          .order("year", { ascending: false })
        
        // Query State results for 2024 and 2025 ONLY (strictly filter to these years)
        const { data: allStateResults } = await adminClient
          .from("wrestling_nchsaa_results")
          .select("year, place, weight_class, classification")
          .ilike("wrestler_name", `%${athleteName}%`)
          .in("year", [2024, 2025]) // ONLY 2024 and 2025
          .order("year", { ascending: false })
          .order("place", { ascending: true })
        
        // Filter to only 2024 and 2025, get best placement per year
        const stateResults = (allStateResults || []).filter((r: any) => r.year === 2024 || r.year === 2025)
        const state2025 = stateResults.find((r: any) => r.year === 2025)
        const state2024 = stateResults.find((r: any) => r.year === 2024)
        
        // Format tournament results
        const formatPlacement = (placement: number | null) => {
          if (!placement) return "N/A"
          if (placement === 1) return "1st"
          if (placement === 2) return "2nd"
          if (placement === 3) return "3rd"
          return `${placement}th`
        }
        
        const formatRecord = (wins: number | null, losses: number | null, record: string | null) => {
          if (wins !== null && losses !== null) {
            return `${wins}-${losses}`
          }
          if (record) {
            return record
          }
          return "N/A"
        }
        
        // Get best result per year (in case of multiple entries)
        const nhsca2025 = nhscaResults?.find((r: any) => r.year === 2025)
        const nhsca2024 = nhscaResults?.find((r: any) => r.year === 2024)
        const super32_2025 = super32Results?.find((r: any) => r.year === 2025)
        const super32_2024 = super32Results?.find((r: any) => r.year === 2024)
        
        return {
          athlete,
          nhsca2025: nhsca2025 ? {
            placement: formatPlacement(nhsca2025.placement),
            record: formatRecord(nhsca2025.wins, nhsca2025.losses, nhsca2025.record)
          } : null,
          nhsca2024: nhsca2024 ? {
            placement: formatPlacement(nhsca2024.placement),
            record: formatRecord(nhsca2024.wins, nhsca2024.losses, nhsca2024.record)
          } : null,
          super32_2025: super32_2025 ? {
            placement: formatPlacement(super32_2025.placement),
            record: formatRecord(super32_2025.wins, super32_2025.losses, super32_2025.record)
          } : null,
          super32_2024: super32_2024 ? {
            placement: formatPlacement(super32_2024.placement),
            record: formatRecord(super32_2024.wins, super32_2024.losses, super32_2024.record)
          } : null,
          state2025: state2025 ? formatPlacement(state2025.place) : null,
          state2024: state2024 ? formatPlacement(state2024.place) : null,
        }
      })
    )
    
    // Format detailed output
    let answer = `🏆 **Top ${rankings.length} Prospects - Class of ${year}${genderText}**\n\n`
    
    detailedResults.forEach((result: any) => {
      const name = result.athlete.name || "Unknown"
      const rank = result.athlete.prospect_ranking
      
      // Create profile link if ID is available
      let nameText = name
      if (result.athlete.id) {
        const profileUrl = getAthleteProfileUrl(result.athlete.id)
        nameText = `[${name}](${profileUrl})`
      }
      
      answer += `**${nameText}** (#${rank} ranking)\n`
      
      // NHSCA results
      if (result.nhsca2025) {
        answer += `- NHSCA 2025: ${result.nhsca2025.placement} (${result.nhsca2025.record})\n`
      } else {
        answer += `- NHSCA 2025: N/A\n`
      }
      
      if (result.nhsca2024) {
        answer += `- NHSCA 2024: ${result.nhsca2024.placement} (${result.nhsca2024.record})\n`
      } else {
        answer += `- NHSCA 2024: N/A\n`
      }
      
      // Super32 results
      if (result.super32_2025) {
        answer += `- Super32 2025: ${result.super32_2025.placement} (${result.super32_2025.record})\n`
      } else {
        answer += `- Super32 2025: N/A\n`
      }
      
      if (result.super32_2024) {
        answer += `- Super32 2024: ${result.super32_2024.placement} (${result.super32_2024.record})\n`
      } else {
        answer += `- Super32 2024: N/A\n`
      }
      
      // State results
      answer += `- State 2025: ${result.state2025 || "N/A"}\n`
      answer += `- State 2024: ${result.state2024 || "N/A"}\n`
      
      // Add school info if available
      if (result.athlete.highschool) {
        answer += `- School: ${result.athlete.highschool}\n`
      }
      
      answer += `\n`
    })
    
    return {
      directResponse: NextResponse.json({
        answer,
        results: rankings,
        detailedResults: detailedResults,
        count: rankings.length,
        messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        queryType: "prospect_rankings",
      })
    }
  }
  
  // Otherwise, return list format
  const titleText = wantsAllRanked || topN === publicCap
    ? `🏆 **Class of ${year}${genderText} Rankings (Top ${publicCap})**`
    : `🏆 **Top ${topN} Prospects - Class of ${year}${genderText}**`
  let answer = `${titleText}\n\n`
  
  rankings.forEach((athlete: any, index: number) => {
    const rank = athlete.prospect_ranking || index + 1
    if (rank > publicCap) return
    const name = athlete.name || "Unknown"
    const school = athlete.highschool || "Unknown"
    
    // Create profile link if ID is available
    let nameText = name
    if (athlete.id) {
      const profileUrl = getAthleteProfileUrl(athlete.id)
      nameText = `[${name}](${profileUrl})`
    }
    
    answer += `${rank}. **${nameText}** - ${school}\n`
  })
  
  answer += `\n_RecruitNC publishes the top ${publicCap} for this class. Rankings may be updated periodically._`
  
  if (!isAuthenticated && topN !== null && topN <= 10) {
    answer += RECRUITNC_RANKINGS_CTA
  }
  
  return {
    directResponse: NextResponse.json({
      answer,
      results: rankings,
      count: rankings.length,
      messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      queryType: "prospect_rankings",
    })
  }
}
