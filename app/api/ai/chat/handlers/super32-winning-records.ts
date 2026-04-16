import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleSuper32WinningRecords: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  
  // Extract parameters
  const query = (params.query || params.search || "").toLowerCase()
  const year = params.year || params.year
  
  // Extract year from query if not provided
  let targetYear: number | null = year ? parseInt(String(year), 10) : null
  if (!targetYear) {
    const yearMatch = query.match(/\b(20\d{2})\b/)
    if (yearMatch) {
      let extractedYear = parseInt(yearMatch[1])
      if (extractedYear >= 2200 && extractedYear <= 2299) {
        extractedYear = extractedYear - 200
      }
      if (extractedYear >= 2000 && extractedYear <= 2100) {
        targetYear = extractedYear
      }
    }
  }
  
  // Default to 2025 if no year specified
  if (!targetYear) {
    targetYear = 2025
  }
  
  console.log(`[Handler] super32_winning_records: year=${targetYear}`)
  
  // Query Super32 results for the specified year with winning records (wins > losses)
  const { data: results, error } = await adminClient
    .from("super32_results")
    .select("athlete_name, year, weight_class, wins, losses, record, placement, high_school, school")
    .eq("year", targetYear)
    .not("wins", "is", null)
    .not("losses", "is", null)
    .gt("wins", 0) // Must have at least one win
    .order("wins", { ascending: false })
    .order("athlete_name", { ascending: true })
    .limit(1000)
  
  if (error) {
    console.error("[Handler] super32_winning_records error:", error)
    throw error
  }
  
  // Filter for winning records (wins > losses)
  const winningRecords = (results || []).filter((r: any) => {
    const wins = r.wins || 0
    const losses = r.losses || 0
    return wins > losses
  })
  
  if (winningRecords.length === 0) {
    return {
      directResponse: NextResponse.json({
        answer: `I couldn't find any wrestlers with winning records at Super32 in ${targetYear}.`,
        messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        queryType: "super32_winning_records",
      })
    }
  }
  
  // Format response
  let answer = `🏆 **Wrestlers with Winning Records at Super32 ${targetYear}**\n\n`
  answer += `Found ${winningRecords.length} wrestler${winningRecords.length !== 1 ? 's' : ''} with winning records:\n\n`
  
  winningRecords.forEach((result: any) => {
    const name = result.athlete_name || "Unknown"
    const wins = result.wins || 0
    const losses = result.losses || 0
    const record = result.record || `${wins}-${losses}`
    const weight = result.weight_class || "Unknown"
    const placement = result.placement ? ` (${result.placement}${result.placement === 1 ? 'st' : result.placement === 2 ? 'nd' : result.placement === 3 ? 'rd' : 'th'} place)` : ""
    const school = result.high_school || result.school || "Unknown"
    
    answer += `**${name}** - ${weight}lbs - ${record}${placement}\n`
    answer += `  School: ${school}\n\n`
  })
  
  return {
    directResponse: NextResponse.json({
      answer,
      results: winningRecords,
      count: winningRecords.length,
      messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      queryType: "super32_winning_records",
    })
  }
}
