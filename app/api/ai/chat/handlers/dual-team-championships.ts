import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleDualTeamChampionships: QueryHandler = async (
  params,
  request,
  messageId
) => {
  try {
    const adminClient = getSupabaseAdmin()
    const school = params.school
    const aggregateType = params.aggregateType || params.queryType || "count" // count, leaderboard, compare
    const division = params.division
    const year = params.year
    
    // Check if query mentions "NHSCA Dual" - clarify this is different from state duals
    const query = (params.query || params.search || "").toLowerCase()
    const isNhscaDualQuery = query.includes("nhsca") && query.includes("dual") && !query.includes("state")
    
    // If asking for leaderboard and mentions NHSCA Dual (not state), clarify
    if (isNhscaDualQuery && (aggregateType === "leaderboard" || params.most || params.top || query.includes("most"))) {
      // User is asking about NHSCA Duals team championships leaderboard
      // We don't have NHSCA Duals team championship data - only state duals
      // But check if they might mean state duals (common confusion)
      return {
        directResponse: NextResponse.json({
          answer: "Great question! **NHSCA Duals** (Memorial Day weekend) is a national team tournament, which is different from **NCHSAA State Dual Team Championships** (also called \"State Duals\" or \"Dual State\").\n\n**Tournament Clarification:**\n- **NCHSAA State Dual Team Championships** = \"State Duals\" or \"Dual State\" (NC state team championships)\n- **NHSCA Duals** = Memorial Day weekend national team tournament\n\nI currently have data for **NCHSAA State Dual Team Championships**. If you're asking about state duals, I can show you which high school has the most state dual team championships. Would you like me to show that?\n\nIf you're specifically asking about NHSCA Duals team championships (Memorial Day weekend), that data isn't currently in the database.",
          messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }),
      }
    }

    // If comparing two schools
    if (params.compareSchool || (school && params.school2)) {
      const school1 = school || params.school1
      const school2 = params.compareSchool || params.school2
      
      if (!school1 || !school2) {
        return {
          directResponse: NextResponse.json({
            answer: "Great question! I need two school names to compare. Try asking 'Who has more state dual titles, [school1] or [school2]?'",
            messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          }),
        }
      }

      // Fetch ALL championships and filter in JavaScript (more reliable than multiple queries)
      let query = adminClient
        .from("dual_team_champions")
        .select("champion_school, year, division")
        .eq("is_vacated", false)
      
      if (division) {
        query = query.eq("division", division)
      }

      const { data: allChampionships, error } = await query
      
      if (error) {
        console.error("[Dual Team] Error fetching championships for comparison:", error)
        return {
          directResponse: NextResponse.json({
            answer: "Great question! I ran into an issue comparing the schools. Please try again in a moment.",
            messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          }),
        }
      }
      
      // First, find actual school names in the database for both schools
      // This is more reliable than trying to match raw user input
      const findActualSchoolNames = async (schoolName: string): Promise<string[]> => {
        const normalized = schoolName.toLowerCase().trim()
        // Query database to find matching school names
        const { data: matches } = await adminClient
          .from("dual_team_champions")
          .select("champion_school")
          .ilike("champion_school", `%${normalized}%`)
          .limit(50)
        
        if (!matches || matches.length === 0) {
          return [normalized] // Fallback to original
        }
        
        // Get unique school names and count occurrences
        const schoolCounts = new Map<string, number>()
        matches.forEach((m: any) => {
          const school = (m.champion_school || "").trim()
          if (school) {
            schoolCounts.set(school.toLowerCase(), (schoolCounts.get(school.toLowerCase()) || 0) + 1)
          }
        })
        
        // Sort by count (most common first) and return top matches
        const sorted = Array.from(schoolCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name]) => name)
        
        // Also include the original normalized name if not already in list
        if (!sorted.includes(normalized)) {
          sorted.push(normalized)
        }
        
        return sorted.slice(0, 5) // Return top 5 matches
      }
      
      const [school1Matches, school2Matches] = await Promise.all([
        findActualSchoolNames(school1),
        findActualSchoolNames(school2)
      ])
      
      console.log("[Dual Team] School name matches:", {
        school1,
        school1Matches,
        school2,
        school2Matches
      })
      
      // Normalize school names for comparison (case-insensitive)
      const school1Lower = school1.toLowerCase().trim()
      const school2Lower = school2.toLowerCase().trim()
      
      // Filter and count in JavaScript - match against actual school names from database
      const data1 = (allChampionships || []).filter((champ: any) => {
        const champSchool = (champ.champion_school || "").toLowerCase().trim()
        
        // Check against all matched school names for school1
        for (const match of school1Matches) {
          // Exact match
          if (champSchool === match) return true
          // Contains match (bidirectional)
          if (champSchool.includes(match) || match.includes(champSchool)) return true
          // Word boundary match
          const matchWords = match.split(/\s+/).filter(w => w.length > 2)
          const champWords = champSchool.split(/\s+/).filter(w => w.length > 2)
          if (matchWords.length > 0 && matchWords.every(w => champWords.some(cw => cw === w || cw.includes(w) || w.includes(cw)))) return true
        }
        return false
      })
      
      const data2 = (allChampionships || []).filter((champ: any) => {
        const champSchool = (champ.champion_school || "").toLowerCase().trim()
        
        // Check against all matched school names for school2
        for (const match of school2Matches) {
          // Exact match
          if (champSchool === match) return true
          // Contains match (bidirectional)
          if (champSchool.includes(match) || match.includes(champSchool)) return true
          // Word boundary match
          const matchWords = match.split(/\s+/).filter(w => w.length > 2)
          const champWords = champSchool.split(/\s+/).filter(w => w.length > 2)
          if (matchWords.length > 0 && matchWords.every(w => champWords.some(cw => cw === w || cw.includes(w) || w.includes(cw)))) return true
        }
        return false
      })
      
      const count1 = data1.length
      const count2 = data2.length
      
      console.log("[Dual Team] Comparison results:", { 
        school1, 
        school1Lower,
        count1, 
        data1Sample: data1.slice(0, 3).map((d: any) => d.champion_school),
        school2, 
        school2Lower,
        count2,
        data2Sample: data2.slice(0, 3).map((d: any) => d.champion_school),
        totalChampionships: allChampionships?.length
      })

      const answer = count1 > count2
        ? `${school1} has more state dual team championships than ${school2}.\n\n${school1}: ${count1}\n${school2}: ${count2}\n\nDifference: ${school1} has ${count1 - count2} more`
        : count2 > count1
        ? `${school2} has more state dual team championships than ${school1}.\n\n${school1}: ${count1}\n${school2}: ${count2}\n\nDifference: ${school2} has ${count2 - count1} more`
        : `${school1} and ${school2} are tied with ${count1} state dual team championship${count1 !== 1 ? "s" : ""} each.`

      return {
        results: [
          { school: school1, count: count1 },
          { school: school2, count: count2 },
        ],
        aggregateResult: {
          school1: school1,
          school2: school2,
          count1: count1,
          count2: count2,
          difference: Math.abs(count1 - count2),
          winner: count1 > count2 ? school1 : count2 > count1 ? school2 : "tie",
        },
      }
    }

    // If asking for leaderboard (most titles)
    if (aggregateType === "leaderboard" || params.most || params.top) {
      let query = adminClient
        .from("dual_team_champions")
        .select("champion_school, year, division")
        .eq("is_vacated", false)

      if (division) {
        query = query.eq("division", division)
      }

      const { data: allChampionships, error } = await query.order("year", { ascending: false })

      if (error) {
        console.error("[Dual Team] Error fetching championships:", error)
        return {
          directResponse: NextResponse.json({
            answer: "Great question! I ran into an issue fetching the data. Please try again in a moment.",
            messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          }),
        }
      }
      
      console.log("[Dual Team] Fetched championships for leaderboard:", allChampionships?.length || 0, "records")

      // Count championships by school
      const schoolCounts: Record<string, { count: number; years: number[]; divisions: string[] }> = {}
      
      allChampionships?.forEach((champ: any) => {
        const school = champ.champion_school
        if (!schoolCounts[school]) {
          schoolCounts[school] = { count: 0, years: [], divisions: [] }
        }
        schoolCounts[school].count++
        if (!schoolCounts[school].years.includes(champ.year)) {
          schoolCounts[school].years.push(champ.year)
        }
        if (champ.division && !schoolCounts[school].divisions.includes(champ.division)) {
          schoolCounts[school].divisions.push(champ.division)
        }
      })

      // Sort by count
      const sorted = Object.entries(schoolCounts)
        .map(([school, data]) => ({
          school,
          count: data.count,
          years: data.years.sort((a, b) => b - a),
          divisions: data.divisions,
        }))
        .sort((a, b) => b.count - a.count)
      
      console.log("[Dual Team] Leaderboard top 5:", sorted.slice(0, 5).map(s => `${s.school}: ${s.count}`))

      const limit = params.limit || 20 // Show top 20 by default for leaderboard
      const topSchools = sorted.slice(0, limit)

      return {
        results: topSchools.map((school, index) => ({
          ...school,
          rank: index + 1,
        })),
        aggregateResult: {
          total: sorted.length,
          top: topSchools[0],
          schools: topSchools,
        },
      }
    }

    // If asking for a specific school's count
    if (school) {
      let query = adminClient
        .from("dual_team_champions")
        .select("champion_school, year, division")
        .ilike("champion_school", `%${school}%`)
        .eq("is_vacated", false)

      if (division) {
        query = query.eq("division", division)
      }

      if (year) {
        query = query.eq("year", year)
      }

      const { data: championships, error } = await query.order("year", { ascending: false })

      if (error) {
        console.error("[Dual Team] Error fetching championships:", error)
        return {
          directResponse: NextResponse.json({
            answer: "Great question! I ran into an issue fetching the data. Please try again in a moment.",
            messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          }),
        }
      }

      if (!championships || championships.length === 0) {
        return {
          directResponse: NextResponse.json({
            answer: `Great question! I don't see any state dual team championships for ${school}${division ? ` in ${division}` : ""}${year ? ` in ${year}` : ""}.`,
            messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          }),
        }
      }

      // Group by school name (in case of partial matches)
      const bySchool: Record<string, any[]> = {}
      championships.forEach((champ: any) => {
        if (!bySchool[champ.champion_school]) {
          bySchool[champ.champion_school] = []
        }
        bySchool[champ.champion_school].push(champ)
      })

      const results = Object.entries(bySchool).map(([schoolName, champs]) => ({
        school: schoolName,
        count: champs.length,
        years: champs.map((c: any) => c.year).sort((a: number, b: number) => b - a),
        divisions: [...new Set(champs.map((c: any) => c.division))],
        championships: champs,
      }))

      return {
        results,
        aggregateResult: {
          school: results[0].school,
          count: results.reduce((sum, r) => sum + r.count, 0),
          total: results.length,
        },
      }
    }

    // Default: return error asking for more specificity
    return {
      directResponse: NextResponse.json({
        answer: "Great question! To answer about state dual team championships, I need either a school name, or you can ask 'What school has the most state dual titles?'",
        messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }),
    }
  } catch (error: any) {
    console.error("[Dual Team] Exception:", error)
    return {
      directResponse: NextResponse.json({
        answer: "Great question! I ran into an issue processing your query. Please try again in a moment.",
        messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }),
    }
  }
}
