/**
 * UNC vs NC State Wrestling Rivalry Handler
 * 
 * Handles all queries about the UNC vs NC State wrestling rivalry:
 * - "What is the rivalry match?"
 * - "Who won the rivalry last year?"
 * - "What is NC State's record against UNC?"
 * - "Who has the longest winning streak?"
 * - "When was the last time UNC won?"
 * - etc.
 */

import { NextRequest, NextResponse } from "next/server"
import { QueryHandler } from "./index"
import { getSupabaseAdmin } from "@/lib/server-supabase"

// Pattern matcher for rivalry queries
export function isRivalryQuery(query: string): boolean {
  const lower = query.toLowerCase()
  
  // ANY mention of "rivalry" = rivalry query (highest priority)
  if (lower.includes("rivalry")) {
    return true
  }
  
  // Both teams mentioned together
  const hasUNC = lower.includes("unc") || lower.includes("north carolina") || lower.includes("carolina") || lower.includes("tar heel")
  const hasNCState = lower.includes("nc state") || lower.includes("ncsu") || lower.includes("wolfpack") || lower.includes("pack")
  if (hasUNC && hasNCState) {
    return true
  }
  
  // "Last time [team] won/beat" queries - these are about the rivalry
  if ((lower.includes("last time") || lower.includes("when was") || lower.includes("when did")) &&
      (lower.includes("won") || lower.includes("beat") || lower.includes("win")) &&
      (hasUNC || hasNCState)) {
    return true
  }
  
  return false
}

// Extract query intent
function getRivalryIntent(query: string): {
  type: 'what_is' | 'record' | 'last_year' | 'streak' | 'last_time_won' | 'home_away' | 'who_won_year' | 'show_all' | 'tickets' | 'general'
  team?: 'unc' | 'ncstate'
  year?: number
  season?: string
} {
  const lower = query.toLowerCase()
  
  // "What is the rivalry?"
  if ((lower.includes("what is") || lower.includes("what's")) && lower.includes("rivalry")) {
    return { type: 'what_is' }
  }
  
  // "Last time won" queries - MUST CHECK FIRST to avoid conflicts with "last year" patterns
  // "when was the last time UNC won/beat NC State?" or "when was the last time UNC won a rivalry match?"
  // Also catch "when was the last time UNC won?" (without "beat")
  if ((lower.includes("last time") || lower.includes("when was") || lower.includes("when did")) && 
      (lower.includes("won") || lower.includes("beat") || lower.includes("win"))) {
    // Determine which team is asking about winning
    // If query says "UNC beat NC State" or "UNC won", then UNC is the team
    // If query says "NC State beat UNC" or "NC State won", then NC State is the team
    const uncWins = (lower.includes("unc") || lower.includes("north carolina") || lower.includes("carolina")) && 
                    (lower.includes("beat") || lower.includes("won"))
    const ncStateWins = (lower.includes("nc state") || lower.includes("ncsu") || lower.includes("wolfpack")) && 
                        (lower.includes("beat") || lower.includes("won"))
    
    // If UNC is mentioned first with "beat/won", it's about UNC winning
    // If NC State is mentioned first with "beat/won", it's about NC State winning
    // Default: if UNC mentioned, assume UNC; if NC State mentioned, assume NC State
    let team: 'unc' | 'ncstate' = 'unc'
    if (ncStateWins && !uncWins) {
      team = 'ncstate'
    } else if (uncWins) {
      team = 'unc'
    } else {
      // Fallback: check which team appears first
      const uncIndex = lower.indexOf("unc") !== -1 ? lower.indexOf("unc") : 
                      (lower.indexOf("north carolina") !== -1 ? lower.indexOf("north carolina") : 
                      (lower.indexOf("carolina") !== -1 ? lower.indexOf("carolina") : Infinity))
      const ncStateIndex = lower.indexOf("nc state") !== -1 ? lower.indexOf("nc state") : 
                          (lower.indexOf("ncsu") !== -1 ? lower.indexOf("ncsu") : 
                          (lower.indexOf("wolfpack") !== -1 ? lower.indexOf("wolfpack") : Infinity))
      
      if (ncStateIndex < uncIndex) {
        team = 'ncstate'
      }
    }
    
    return { type: 'last_time_won', team }
  }
  
  // "Who won last year?" or "last year's rivalry" - CHECK AFTER "last time" to avoid conflicts
  if (lower.includes("last year") && (lower.includes("who won") || lower.includes("rivalry") || lower.includes("match"))) {
    return { type: 'last_year' }
  }
  
  // "Who won the last rivalry match?" or "last rivalry match" or "last match"
  if ((lower.includes("last") && lower.includes("rivalry") && lower.includes("match")) ||
      (lower.includes("who won") && lower.includes("last") && (lower.includes("rivalry") || lower.includes("match")))) {
    return { type: 'last_year' }
  }
  
  // Record queries
  if (lower.includes("record") || lower.includes("series")) {
    if (lower.includes("home") || lower.includes("away")) {
      const team = lower.includes("nc state") || lower.includes("ncsu") ? 'ncstate' : 'unc'
      return { type: 'home_away', team }
    }
    return { type: 'record' }
  }
  
  // Streak queries - "longest winning streak", "who had the longest streak", etc.
  if (lower.includes("streak") || (lower.includes("longest") && (lower.includes("win") || lower.includes("streak")))) {
    return { type: 'streak' }
  }
  
  // "Who won in [year]?" or "who won the rivalry match in [year]?"
  const yearMatch = lower.match(/\b(19|20)\d{2}\b/)
  if (yearMatch && (lower.includes("who won") || lower.includes("rivalry"))) {
    return { type: 'who_won_year', year: parseInt(yearMatch[0]) }
  }
  
  // "Show all" queries or "who won in every year" or "show results by year"
  if (lower.includes("show all") || lower.includes("all results") || lower.includes("all matches") ||
      lower.includes("who won in every year") || lower.includes("who won every year") ||
      (lower.includes("every year") && lower.includes("who won")) ||
      (lower.includes("show") && lower.includes("results") && (lower.includes("by year") || lower.includes("by season"))) ||
      (lower.includes("show") && lower.includes("rivalry") && lower.includes("results"))) {
    return { type: 'show_all' }
  }
  
  // Ticket queries
  if (lower.includes("ticket") || lower.includes("buy")) {
    return { type: 'tickets' }
  }
  
  return { type: 'general' }
}

export const handleRivalry: QueryHandler = async (params, request, messageId) => {
  const query = (params.query || params.search || "").toLowerCase()
  const lower = query // Alias for consistency with getRivalryIntent
  const intent = getRivalryIntent(query)
  
  console.log("[Rivalry Handler] Query:", query)
  console.log("[Rivalry Handler] Intent:", JSON.stringify(intent))
  console.log("[Rivalry Handler] Has 'last time':", query.includes("last time"))
  console.log("[Rivalry Handler] Has 'beat':", query.includes("beat"))
  console.log("[Rivalry Handler] Has 'won':", query.includes("won"))
  
  try {
    const adminClient = getSupabaseAdmin()
    let answer = ""
    
    switch (intent.type) {
      case 'what_is': {
        const { data: allMatches, error } = await adminClient
          .from("unc_ncstate_rivalry")
          .select("*")
          .order("season", { ascending: false })
          .order("match_date", { ascending: false, nullsLast: true })
        
        if (error || !allMatches || allMatches.length === 0) {
          answer = "Great question! I couldn't retrieve the rivalry information at the moment."
          break
        }
        
        const uncWins = allMatches.filter((m: any) => m.unc_result === "W").length
        const uncLosses = allMatches.filter((m: any) => m.unc_result === "L").length
        const ties = allMatches.filter((m: any) => m.unc_result === "T").length
        const ncStateWins = uncLosses
        const ncStateLosses = uncWins
        
        const sortedMatches = [...allMatches].sort((a: any, b: any) => {
          const seasonA = parseInt(a.season.split("-")[0])
          const seasonB = parseInt(b.season.split("-")[0])
          if (seasonA !== seasonB) return seasonB - seasonA
          if (a.match_date && b.match_date) {
            return new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
          }
          return 0
        })
        
        const mostRecent = sortedMatches[0]
        const winner = mostRecent.unc_result === "W" ? "UNC" : mostRecent.unc_result === "L" ? "NC State" : "Tie"
        let score = ""
        if (mostRecent.unc_score !== null && mostRecent.nc_state_score !== null) {
          score = mostRecent.unc_result === "W" 
            ? `${mostRecent.unc_score}-${mostRecent.nc_state_score}`
            : `${mostRecent.nc_state_score}-${mostRecent.unc_score}`
        }
        
        const dateStr = mostRecent.match_date 
          ? new Date(mostRecent.match_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : mostRecent.season
        
        let seriesLeader = ""
        if (ncStateWins > uncWins) {
          seriesLeader = `NC State leads the series ${ncStateWins}-${uncWins}${ties > 0 ? `-${ties}` : ""}`
        } else if (uncWins > ncStateWins) {
          seriesLeader = `UNC leads the series ${uncWins}-${ncStateWins}${ties > 0 ? `-${ties}` : ""}`
        } else {
          seriesLeader = `The series is tied ${uncWins}-${uncWins}${ties > 0 ? `-${ties}` : ""}`
        }
        
        answer = `**UNC vs NC State Wrestling Rivalry**\n\n`
        answer += `The UNC vs NC State wrestling rivalry is one of the most competitive and longest-running rivalries in college wrestling. The two programs have met regularly since 1925, with the last 100 meetings spanning from the 1960-61 season through the 2025-26 season.\n\n`
        answer += `**Overall Series Record (Since 1925):**\n`
        answer += `• NC State leads the all-time series **65-62-3**\n`
        answer += `• UNC Record: 62-65-3\n`
        answer += `• NC State Record: 65-62-3\n\n`
        answer += `**Last 100 Matches (1960-61 through 2025-26):**\n`
        answer += `• ${seriesLeader}\n`
        answer += `• UNC Record: ${uncWins}-${uncLosses}${ties > 0 ? `-${ties}` : ""}\n`
        answer += `• NC State Record: ${ncStateWins}-${ncStateLosses}${ties > 0 ? `-${ties}` : ""}\n`
        answer += `• Total Matches: ${allMatches.length}\n\n`
        answer += `**Most Recent Match:**\n`
        answer += `The most recent match was on **${dateStr}** (${mostRecent.season} season), and **${winner}** won against ${winner === "UNC" ? "NC State" : "UNC"}${score ? ` ${score}` : ""}.\n\n`
        answer += `This rivalry features intense competition between two of North Carolina's premier wrestling programs, with matches often having significant implications for ACC standings and NCAA tournament seeding.`
        break
      }
      
      case 'record': {
        const { data: allMatches, error } = await adminClient
          .from("unc_ncstate_rivalry")
          .select("unc_result")
        
        if (error || !allMatches || allMatches.length === 0) {
          answer = "Great question! I couldn't retrieve the series record at the moment."
          break
        }
        
        const uncWins = allMatches.filter((m: any) => m.unc_result === "W").length
        const uncLosses = allMatches.filter((m: any) => m.unc_result === "L").length
        const ties = allMatches.filter((m: any) => m.unc_result === "T").length
        const ncStateWins = uncLosses
        const ncStateLosses = uncWins
        
        let seriesLeader = ""
        if (ncStateWins > uncWins) {
          seriesLeader = `NC State leads the series ${ncStateWins}-${uncWins}${ties > 0 ? `-${ties}` : ""}`
        } else if (uncWins > ncStateWins) {
          seriesLeader = `UNC leads the series ${uncWins}-${ncStateWins}${ties > 0 ? `-${ties}` : ""}`
        } else {
          seriesLeader = `Series is tied ${uncWins}-${uncWins}${ties > 0 ? `-${ties}` : ""}`
        }
        
        answer = `**UNC vs NC State Wrestling Series Record**\n\n`
        answer += `**Overall Series Record (Since 1925):**\n`
        answer += `• NC State leads the all-time series **65-62-3**\n`
        answer += `• UNC Record: 62-65-3\n`
        answer += `• NC State Record: 65-62-3\n\n`
        answer += `**Last 100 Matches (1960-61 through 2025-26):**\n`
        answer += `${seriesLeader}\n`
        answer += `• UNC Record: ${uncWins}-${uncLosses}${ties > 0 ? `-${ties}` : ""}\n`
        answer += `• NC State Record: ${ncStateWins}-${ncStateLosses}${ties > 0 ? `-${ties}` : ""}\n`
        answer += `• Total Matches: ${allMatches.length}`
        break
      }
      
      case 'last_year': {
        try {
          const { data: allMatches, error } = await adminClient
            .from("unc_ncstate_rivalry")
            .select("*")
            .order("season", { ascending: false })
            .order("match_date", { ascending: false, nullsLast: true })
          
          if (error) {
            console.error("[Rivalry Handler] Error fetching last year match:", error)
            answer = "Great question! I couldn't find last year's match."
            break
          }
          
          if (!allMatches || allMatches.length === 0) {
            answer = "Great question! I couldn't find last year's match."
            break
          }
          
          const sortedMatches = [...allMatches].sort((a: any, b: any) => {
            const seasonA = parseInt(a.season.split("-")[0])
            const seasonB = parseInt(b.season.split("-")[0])
            if (seasonA !== seasonB) return seasonB - seasonA
            if (a.match_date && b.match_date) {
              return new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
            }
            return 0
          })
          
          const recentMatch = sortedMatches[0]
          if (!recentMatch) {
            answer = "Great question! I couldn't find last year's match."
            break
          }
          
          const winner = recentMatch.unc_result === "W" ? "UNC" : recentMatch.unc_result === "L" ? "NC State" : "Tie"
          let score = ""
          if (recentMatch.unc_score !== null && recentMatch.nc_state_score !== null) {
            score = recentMatch.unc_result === "W"
              ? `${recentMatch.unc_score}-${recentMatch.nc_state_score}`
              : `${recentMatch.nc_state_score}-${recentMatch.unc_score}`
          }
          
          const dateStr = recentMatch.match_date 
            ? new Date(recentMatch.match_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : recentMatch.season
          
          const opponent = winner === "UNC" ? "NC State" : "UNC"
          answer = `**Last Year's Rivalry Match: ${recentMatch.season}**\n\n`
          if (recentMatch.match_date) {
            answer += `**Date:** ${dateStr}\n`
          }
          answer += `**Result:** ${winner} won against ${opponent}${score ? ` ${score}` : ""}\n`
        } catch (err: any) {
          console.error("[Rivalry Handler] Exception in last_year case:", err)
          answer = "Great question! I encountered an error finding last year's match."
        }
        break
      }
      
      case 'streak': {
        const { data: allMatches, error } = await adminClient
          .from("unc_ncstate_rivalry")
          .select("*")
          .order("match_date", { ascending: true, nullsFirst: false })
          .order("season", { ascending: true })
        
        if (error || !allMatches || allMatches.length === 0) {
          answer = "Great question! I couldn't retrieve the match data to calculate winning streaks."
          break
        }
        
        let uncStreaks: Array<{ start: any, end: any, length: number }> = []
        let ncStateStreaks: Array<{ start: any, end: any, length: number }> = []
        let currentUNCStreak: any[] = []
        let currentNCStateStreak: any[] = []
        
        for (const match of allMatches) {
          if (match.unc_result === "W") {
            currentUNCStreak.push(match)
            if (currentNCStateStreak.length > 0) {
              ncStateStreaks.push({
                start: currentNCStateStreak[0],
                end: currentNCStateStreak[currentNCStateStreak.length - 1],
                length: currentNCStateStreak.length
              })
              currentNCStateStreak = []
            }
          } else if (match.unc_result === "L") {
            currentNCStateStreak.push(match)
            if (currentUNCStreak.length > 0) {
              uncStreaks.push({
                start: currentUNCStreak[0],
                end: currentUNCStreak[currentUNCStreak.length - 1],
                length: currentUNCStreak.length
              })
              currentUNCStreak = []
            }
          } else {
            if (currentUNCStreak.length > 0) {
              uncStreaks.push({
                start: currentUNCStreak[0],
                end: currentUNCStreak[currentUNCStreak.length - 1],
                length: currentUNCStreak.length
              })
              currentUNCStreak = []
            }
            if (currentNCStateStreak.length > 0) {
              ncStateStreaks.push({
                start: currentNCStateStreak[0],
                end: currentNCStateStreak[currentNCStateStreak.length - 1],
                length: currentNCStateStreak.length
              })
              currentNCStateStreak = []
            }
          }
        }
        
        if (currentUNCStreak.length > 0) {
          uncStreaks.push({
            start: currentUNCStreak[0],
            end: currentUNCStreak[currentUNCStreak.length - 1],
            length: currentUNCStreak.length
          })
        }
        if (currentNCStateStreak.length > 0) {
          ncStateStreaks.push({
            start: currentNCStateStreak[0],
            end: currentNCStateStreak[currentNCStateStreak.length - 1],
            length: currentNCStateStreak.length
          })
        }
        
        const longestUNCStreak = uncStreaks.length > 0 
          ? uncStreaks.reduce((max, streak) => streak.length > max.length ? streak : max, uncStreaks[0])
          : null
        const longestNCStateStreak = ncStateStreaks.length > 0
          ? ncStateStreaks.reduce((max, streak) => streak.length > max.length ? streak : max, ncStateStreaks[0])
          : null
        
        if (longestUNCStreak && longestNCStateStreak) {
          const overallLongest = longestUNCStreak.length >= longestNCStateStreak.length 
            ? { team: "UNC", streak: longestUNCStreak }
            : { team: "NC State", streak: longestNCStateStreak }
          
          const startDate = overallLongest.streak.start.match_date 
            ? new Date(overallLongest.streak.start.match_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : overallLongest.streak.start.season
          const endDate = overallLongest.streak.end.match_date
            ? new Date(overallLongest.streak.end.match_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : overallLongest.streak.end.season
          
          answer = `**Longest Winning Streak**\n\n`
          answer += `**${overallLongest.team}** holds the longest winning streak with **${overallLongest.streak.length} consecutive wins**.\n\n`
          answer += `**Streak Details:**\n`
          answer += `• Started: ${startDate} (${overallLongest.streak.start.season})\n`
          answer += `• Ended: ${endDate} (${overallLongest.streak.end.season})\n\n`
          
          answer += `**All Winning Streaks:**\n\n`
          answer += `**UNC:**\n`
          if (longestUNCStreak) {
            answer += `• Longest: ${longestUNCStreak.length} wins (${longestUNCStreak.start.season} - ${longestUNCStreak.end.season})\n`
          }
          answer += `**NC State:**\n`
          if (longestNCStateStreak) {
            answer += `• Longest: ${longestNCStateStreak.length} wins (${longestNCStateStreak.start.season} - ${longestNCStateStreak.end.season})\n`
          }
        } else {
          answer = "Great question! I couldn't calculate the winning streaks at the moment."
        }
        break
      }
      
      case 'last_time_won': {
        const teamFilter = intent.team === 'unc' ? "W" : "L"
        const { data: allWins, error } = await adminClient
          .from("unc_ncstate_rivalry")
          .select("*")
          .eq("unc_result", teamFilter)
          .order("season", { ascending: false })
          .order("match_date", { ascending: false, nullsLast: true })
        
        if (error || !allWins || allWins.length === 0) {
          const teamName = intent.team === 'unc' ? "UNC" : "NC State"
          answer = `Great question! I couldn't find when ${teamName} last won.`
          break
        }
        
        const sortedWins = [...allWins].sort((a: any, b: any) => {
          const seasonA = parseInt(a.season.split("-")[0])
          const seasonB = parseInt(b.season.split("-")[0])
          if (seasonA !== seasonB) return seasonB - seasonA
          if (a.match_date && b.match_date) {
            return new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
          }
          return 0
        })
        
        const lastWin = sortedWins[0]
        const teamName = intent.team === 'unc' ? "UNC" : "NC State"
        let score = ""
        if (lastWin.unc_score !== null && lastWin.nc_state_score !== null) {
          score = teamFilter === "W"
            ? `${lastWin.unc_score}-${lastWin.nc_state_score}`
            : `${lastWin.nc_state_score}-${lastWin.unc_score}`
        }
        
        const dateStr = lastWin.match_date 
          ? new Date(lastWin.match_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : lastWin.season
        
        const opponent = intent.team === 'unc' ? "NC State" : "UNC"
        answer = `**Last Time ${teamName} Won Against ${opponent}**\n\n`
        answer += `${teamName} last won against ${opponent} on **${dateStr}** (${lastWin.season} season) with a score of **${score}**.\n`
        break
      }
      
      case 'tickets': {
        answer = `**Buy Tickets for the UNC vs NC State Wrestling Match**\n\n`
        answer += `You can purchase tickets online at:\n\n`
        answer += `👉 [https://gopack.evenue.net/events/WRS](https://gopack.evenue.net/events/WRS)\n\n`
        answer += `**Match Details:**\n`
        answer += `• **Date:** Friday, January 24, 2026\n`
        answer += `• **Time:** 7:00 PM\n`
        answer += `• **Location:** Reynolds Coliseum @ NC State, Raleigh, NC\n\n`
        answer += `Get your tickets now and don't miss this exciting rivalry matchup!`
        break
      }
      
      case 'who_won_year': {
        const year = intent.year
        if (!year) {
          answer = "Great question! I couldn't determine which year you're asking about."
          break
        }
        
        // For year Y, check BOTH seasons that could contain a match in calendar year Y:
        // - season Y-(Y+1): e.g. 2026-27 (fall 2026 - spring 2027)
        // - season (Y-1)-Y: e.g. 2025-26 (fall 2025 - spring 2026, includes Jan 2026)
        const seasonA = `${year}-${String(year + 1).slice(-2)}`
        const seasonB = `${year - 1}-${String(year).slice(-2)}`
        
        const { data: matchesA, error: errA } = await adminClient
          .from("unc_ncstate_rivalry")
          .select("*")
          .eq("season", seasonA)
          .order("match_date", { ascending: false, nullsLast: true })
        
        const { data: matchesB, error: errB } = await adminClient
          .from("unc_ncstate_rivalry")
          .select("*")
          .eq("season", seasonB)
          .order("match_date", { ascending: false, nullsLast: true })
        
        const error = errA || errB
        const filtered = [...(matchesA || []), ...(matchesB || [])].filter((m: any) => {
          if (m.match_date) {
            return new Date(m.match_date).getFullYear() === year
          }
          return m.season === seasonB
        })
        const matches = filtered.sort((a: any, b: any) => {
          if (!a.match_date && !b.match_date) return 0
          if (!a.match_date) return 1
          if (!b.match_date) return -1
          return new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
        })
        
        if (error || !matches || matches.length === 0) {
          answer = `Great question! I couldn't find a rivalry match for ${year}.`
          break
        }
        
        const match = matches[0]
        const winner = match.unc_result === "W" ? "UNC" : match.unc_result === "L" ? "NC State" : "Tie"
        let score = ""
        if (match.unc_score !== null && match.nc_state_score !== null) {
          score = match.unc_result === "W"
            ? `${match.unc_score}-${match.nc_state_score}`
            : `${match.nc_state_score}-${match.unc_score}`
        }
        
        const dateStr = match.match_date 
          ? new Date(match.match_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : match.season
        
        const opponent = winner === "UNC" ? "NC State" : "UNC"
        answer = `**Who Won the Rivalry Match in ${year}?**\n\n`
        answer += `${winner} won against ${opponent}${score ? ` ${score}` : ""} on ${dateStr} (${match.season} season).`
        break
      }
      
      case 'show_all': {
        const { data: allMatches, error } = await adminClient
          .from("unc_ncstate_rivalry")
          .select("*")
          .order("season", { ascending: false })
          .order("match_date", { ascending: false, nullsLast: true })
        
        if (error || !allMatches || allMatches.length === 0) {
          answer = "Great question! I couldn't retrieve all rivalry matches at the moment."
          break
        }
        
        answer = `**All UNC vs NC State Wrestling Matches (${allMatches.length} total)**\n\n`
        
        // Group by season
        const matchesBySeason: Record<string, any[]> = {}
        allMatches.forEach((match: any) => {
          if (!matchesBySeason[match.season]) {
            matchesBySeason[match.season] = []
          }
          matchesBySeason[match.season].push(match)
        })
        
        const seasons = Object.keys(matchesBySeason).sort((a, b) => {
          const yearA = parseInt(a.split("-")[0])
          const yearB = parseInt(b.split("-")[0])
          return yearB - yearA
        })
        
        seasons.forEach((season) => {
          const seasonMatches = matchesBySeason[season]
          answer += `**${season} Season**\n`
          seasonMatches.forEach((match: any) => {
            const winner = match.unc_result === "W" ? "UNC" : match.unc_result === "L" ? "NC State" : "Tie"
            const opponent = winner === "UNC" ? "NC State" : "UNC"
            let score = ""
            if (match.unc_score !== null && match.nc_state_score !== null) {
              score = match.unc_result === "W"
                ? `${match.unc_score}-${match.nc_state_score}`
                : `${match.nc_state_score}-${match.unc_score}`
            }
            const dateStr = match.match_date 
              ? new Date(match.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : "Date not available"
            answer += `• ${dateStr}: ${winner} won against ${opponent}${score ? ` ${score}` : ""}\n`
          })
          answer += `\n`
        })
        break
      }
      
      case 'home_away': {
        const { data: allMatches, error } = await adminClient
          .from("unc_ncstate_rivalry")
          .select("unc_result, location_site_type")
        
        if (error || !allMatches || allMatches.length === 0) {
          answer = "Great question! I couldn't retrieve the home/away records at the moment."
          break
        }
        
        const askingAboutNCState = lower.includes("nc state") || lower.includes("ncsu")
        const askingAboutUNC = lower.includes("unc") || lower.includes("carolina")
        const askingAboutHome = lower.includes("at home") || (lower.includes("home") && !lower.includes("away"))
        const askingAboutAway = lower.includes("at away") || lower.includes("away")
        
        if (askingAboutHome) {
          if (askingAboutNCState) {
            // NC State's home record (location_site_type = "away" for UNC means NC State is home)
            const homeMatches = allMatches.filter((m: any) => m.location_site_type === "away")
            const wins = homeMatches.filter((m: any) => m.unc_result === "L").length
            const losses = homeMatches.filter((m: any) => m.unc_result === "W").length
            const ties = homeMatches.filter((m: any) => m.unc_result === "T").length
            answer = `**NC State's home record vs UNC**\n\n`
            answer += `NC State has a record of ${wins}-${losses}${ties > 0 ? `-${ties}` : ""} at home against UNC.\n`
            answer += `This is based on ${homeMatches.length} match${homeMatches.length === 1 ? "" : "es"} played in Raleigh.`
          } else if (askingAboutUNC) {
            // UNC's home record (location_site_type = "home" for UNC)
            const homeMatches = allMatches.filter((m: any) => m.location_site_type === "home")
            const wins = homeMatches.filter((m: any) => m.unc_result === "W").length
            const losses = homeMatches.filter((m: any) => m.unc_result === "L").length
            const ties = homeMatches.filter((m: any) => m.unc_result === "T").length
            answer = `**UNC's home record vs NC State**\n\n`
            answer += `UNC has a record of ${wins}-${losses}${ties > 0 ? `-${ties}` : ""} at home against NC State.\n`
            answer += `This is based on ${homeMatches.length} match${homeMatches.length === 1 ? "" : "es"} played in Chapel Hill.`
          } else {
            // Both teams' home records
            const uncHomeMatches = allMatches.filter((m: any) => m.location_site_type === "home")
            const ncStateHomeMatches = allMatches.filter((m: any) => m.location_site_type === "away")
            const uncHomeWins = uncHomeMatches.filter((m: any) => m.unc_result === "W").length
            const uncHomeLosses = uncHomeMatches.filter((m: any) => m.unc_result === "L").length
            const ncStateHomeWins = ncStateHomeMatches.filter((m: any) => m.unc_result === "L").length
            const ncStateHomeLosses = ncStateHomeMatches.filter((m: any) => m.unc_result === "W").length
            answer = `**Home Records in UNC vs NC State Wrestling Rivalry**\n\n`
            answer += `**UNC at Home (Chapel Hill):** ${uncHomeWins}-${uncHomeLosses}\n`
            answer += `**NC State at Home (Raleigh):** ${ncStateHomeWins}-${ncStateHomeLosses}\n`
          }
        } else if (askingAboutAway) {
          if (askingAboutNCState) {
            // NC State's away record
            const awayMatches = allMatches.filter((m: any) => m.location_site_type === "home")
            const wins = awayMatches.filter((m: any) => m.unc_result === "L").length
            const losses = awayMatches.filter((m: any) => m.unc_result === "W").length
            const ties = awayMatches.filter((m: any) => m.unc_result === "T").length
            answer = `**NC State's away record vs UNC**\n\n`
            answer += `NC State has a record of ${wins}-${losses}${ties > 0 ? `-${ties}` : ""} on the road against UNC.\n`
            answer += `This is based on ${awayMatches.length} match${awayMatches.length === 1 ? "" : "es"} played in Chapel Hill.`
          } else if (askingAboutUNC) {
            // UNC's away record
            const awayMatches = allMatches.filter((m: any) => m.location_site_type === "away")
            const wins = awayMatches.filter((m: any) => m.unc_result === "W").length
            const losses = awayMatches.filter((m: any) => m.unc_result === "L").length
            const ties = awayMatches.filter((m: any) => m.unc_result === "T").length
            answer = `**UNC's away record vs NC State**\n\n`
            answer += `UNC has a record of ${wins}-${losses}${ties > 0 ? `-${ties}` : ""} on the road against NC State.\n`
            answer += `This is based on ${awayMatches.length} match${awayMatches.length === 1 ? "" : "es"} played in Raleigh.`
          } else {
            answer = "Great question! I couldn't determine which team's away record you're asking about."
          }
        } else {
          answer = "Great question! I couldn't determine if you're asking about home or away records."
        }
        break
      }
      
      default: {
        // General fallback - check if it's actually a "last time" query that wasn't caught
        console.log("[Rivalry Handler] Default case - query:", query, "intent:", intent)
        
        // Try to catch "when was the last time X beat Y" queries that might have been missed
        if (lower.includes("last time") && (lower.includes("beat") || lower.includes("won"))) {
          // Re-run the last_time_won detection logic
          const uncWins = (lower.includes("unc") || lower.includes("north carolina") || lower.includes("carolina")) && 
                          (lower.includes("beat") || lower.includes("won"))
          const ncStateWins = (lower.includes("nc state") || lower.includes("ncsu") || lower.includes("wolfpack")) && 
                              (lower.includes("beat") || lower.includes("won"))
          
          let team: 'unc' | 'ncstate' = 'unc'
          if (ncStateWins && !uncWins) {
            team = 'ncstate'
          } else if (uncWins) {
            team = 'unc'
          } else {
            // Fallback: check which team appears first
            const uncIndex = lower.indexOf("unc") !== -1 ? lower.indexOf("unc") : 
                            (lower.indexOf("north carolina") !== -1 ? lower.indexOf("north carolina") : 
                            (lower.indexOf("carolina") !== -1 ? lower.indexOf("carolina") : Infinity))
            const ncStateIndex = lower.indexOf("nc state") !== -1 ? lower.indexOf("nc state") : 
                                (lower.indexOf("ncsu") !== -1 ? lower.indexOf("ncsu") : 
                                (lower.indexOf("wolfpack") !== -1 ? lower.indexOf("wolfpack") : Infinity))
            
            if (ncStateIndex < uncIndex) {
              team = 'ncstate'
            }
          }
          
          // Handle as last_time_won
          const teamFilter = team === 'unc' ? "W" : "L"
          const { data: allWins, error } = await adminClient
            .from("unc_ncstate_rivalry")
            .select("*")
            .eq("unc_result", teamFilter)
            .order("season", { ascending: false })
            .order("match_date", { ascending: false, nullsLast: true })
          
          if (error || !allWins || allWins.length === 0) {
            const teamName = team === 'unc' ? "UNC" : "NC State"
            answer = `Great question! I couldn't find when ${teamName} last won.`
            break
          }
          
          const sortedWins = [...allWins].sort((a: any, b: any) => {
            const seasonA = parseInt(a.season.split("-")[0])
            const seasonB = parseInt(b.season.split("-")[0])
            if (seasonA !== seasonB) return seasonB - seasonA
            if (a.match_date && b.match_date) {
              return new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
            }
            return 0
          })
          
          const lastWin = sortedWins[0]
          const teamName = team === 'unc' ? "UNC" : "NC State"
          let score = ""
          if (lastWin.unc_score !== null && lastWin.nc_state_score !== null) {
            score = teamFilter === "W"
              ? `${lastWin.unc_score}-${lastWin.nc_state_score}`
              : `${lastWin.nc_state_score}-${lastWin.unc_score}`
          }
          
          const dateStr = lastWin.match_date 
            ? new Date(lastWin.match_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : lastWin.season
          
          const opponent = team === 'unc' ? "NC State" : "UNC"
          answer = `**Last Time ${teamName} Won Against ${opponent}**\n\n`
          answer += `${teamName} last won against ${opponent} on **${dateStr}** (${lastWin.season} season)${score ? ` with a score of **${score}**` : ""}.\n`
          break
        }
        
        // General fallback
        const { data: allMatches, error } = await adminClient
          .from("unc_ncstate_rivalry")
          .select("unc_result")
          .limit(1)
        
        if (error || !allMatches || allMatches.length === 0) {
          answer = "Great question! I couldn't retrieve the UNC vs NC State rivalry information at the moment."
        } else {
          answer = "The UNC vs NC State wrestling rivalry is one of the most competitive in college wrestling. What would you like to know about it?"
        }
      }
    }
    
    return {
      directResponse: NextResponse.json({
        answer,
        messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        queryType: "unc_ncstate_rivalry",
      })
    }
  } catch (err: any) {
    console.error("[Rivalry Handler] Error:", err)
    return {
      directResponse: NextResponse.json({
        answer: "Great question! I encountered an error retrieving the UNC vs NC State rivalry information. Please try again later.",
        messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })
    }
  }
}
