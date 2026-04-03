"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Classification = "Freshman" | "Sophomore" | "Junior" | "Senior"

interface ParsedMatch {
  weight_class: string
  winner_name: string
  winner_location: string
  winner_state: string
  loser_name: string
  loser_location: string
  loser_state: string
  win_type: string
  score: string
  time?: string
  nc_wrestler_name?: string
  nc_is_winner: boolean
  opponent_name?: string
  opponent_state?: string
}

function parseWinType(abbrev: string): string {
  const types: Record<string, string> = {
    "F": "fall",
    "TF": "tech_fall",
    "MD": "major",
    "DEC": "decision",
    "SV": "sudden_victory",
    "TB": "tiebreaker",
    "UTB": "ultimate_tiebreaker",
    "FF": "forfeit",
    "DQ": "disqualification",
    "INJ": "injury",
    "DEF": "default"
  }
  return types[abbrev.toUpperCase()] || "decision"
}

function parseScore(score: string): { winner_score: number; loser_score: number } {
  const parts = score.split("-").map(s => parseInt(s.trim()))
  return {
    winner_score: parts[0] || 0,
    loser_score: parts[1] || 0
  }
}

function parseMatchLine(line: string): ParsedMatch | null {
  // Format: 106Charlie Fogle statesville, NC (NC) TF Bentley Alcantara Moncks Corner, SC (SC), 17-0 3:19
  // Or: 106Bodhi Nickerson Blossburg, PA (PA) F Gavin Spell Parkton, NC (NC), 2:57
  
  const trimmed = line.trim()
  if (!trimmed) return null
  
  // Extract weight class (3 digits at start)
  const weightMatch = trimmed.match(/^(\d{2,3})/)
  if (!weightMatch) return null
  
  const weight_class = weightMatch[1]
  const rest = trimmed.slice(weightMatch[0].length)
  
  // Find win type (F, TF, MD, DEC, SV, etc.) - it's between the two wrestlers
  const winTypePattern = /\s+(F|TF|MD|DEC|SV|TB|UTB|FF|DQ|INJ|DEF)\s+/i
  const winTypeMatch = rest.match(winTypePattern)
  
  if (!winTypeMatch) return null
  
  const win_type = winTypeMatch[1].toUpperCase()
  const winTypeIndex = rest.indexOf(winTypeMatch[0])
  
  // Winner is before the win type
  const winnerPart = rest.slice(0, winTypeIndex).trim()
  // Loser and score is after
  const loserAndScore = rest.slice(winTypeIndex + winTypeMatch[0].length).trim()
  
  // Parse winner: "Charlie Fogle statesville, NC (NC)"
  // Pattern: Name City, STATE (STATE)
  const wrestlerPattern = /^(.+?)\s+([^,]+),\s*(\w{2})\s*\((\w{2})\)$/
  const winnerMatch = winnerPart.match(wrestlerPattern)
  
  if (!winnerMatch) return null
  
  const winner_name = winnerMatch[1].trim()
  const winner_location = winnerMatch[2].trim()
  const winner_state = winnerMatch[4].trim() // Use the one in parentheses
  
  // Parse loser and score: "Bentley Alcantara Moncks Corner, SC (SC), 17-0 3:19"
  // Find the last comma followed by score
  const scorePattern = /,\s*(\d+-\d+)\s*(\d+:\d+)?$/
  const scoreMatch = loserAndScore.match(scorePattern)
  
  if (!scoreMatch) return null
  
  const score = scoreMatch[1]
  const time = scoreMatch[2]
  
  // Loser is everything before the score
  const loserPart = loserAndScore.slice(0, loserAndScore.lastIndexOf(scoreMatch[0])).trim()
  const loserMatch = loserPart.match(wrestlerPattern)
  
  if (!loserMatch) return null
  
  const loser_name = loserMatch[1].trim()
  const loser_location = loserMatch[2].trim()
  const loser_state = loserMatch[4].trim()
  
  // Determine if NC wrestler won or lost
  const nc_is_winner = winner_state === "NC"
  const nc_is_loser = loser_state === "NC"
  
  // Skip if no NC wrestler involved
  if (!nc_is_winner && !nc_is_loser) return null
  
  return {
    weight_class,
    winner_name,
    winner_location,
    winner_state,
    loser_name,
    loser_location,
    loser_state,
    win_type,
    score,
    time,
    nc_wrestler_name: nc_is_winner ? winner_name : loser_name,
    nc_is_winner,
    opponent_name: nc_is_winner ? loser_name : winner_name,
    opponent_state: nc_is_winner ? loser_state : winner_state
  }
}

export async function processNHSCAMatches(text: string, classification: Classification) {
  const supabase = await getSupabaseServerClient()
  
  const lines = text.split("\n").filter(line => line.trim())
  const results: { success: number; skipped: number; errors: string[] } = {
    success: 0,
    skipped: 0,
    errors: []
  }
  
  for (const line of lines) {
    try {
      const parsed = parseMatchLine(line)
      
      if (!parsed) {
        results.skipped++
        continue
      }
      
      // Find the NC wrestler in our roster
      const { data: wrestler } = await supabase
        .from("nhsca_roster")
        .select("id, name, wins, losses")
        .eq("classification", classification)
        .eq("weight_class", parsed.weight_class)
        .ilike("name", `%${parsed.nc_wrestler_name}%`)
        .single()
      
      if (!wrestler) {
        // Try broader search
        const nameParts = parsed.nc_wrestler_name?.split(" ") || []
        const lastName = nameParts[nameParts.length - 1]
        
        const { data: wrestlerByLastName } = await supabase
          .from("nhsca_roster")
          .select("id, name, wins, losses")
          .eq("classification", classification)
          .eq("weight_class", parsed.weight_class)
          .ilike("name", `%${lastName}%`)
          .single()
        
        if (!wrestlerByLastName) {
          results.errors.push(`Could not find wrestler: ${parsed.nc_wrestler_name} at ${parsed.weight_class} lbs (${classification})`)
          continue
        }
        
        // Use the found wrestler
        Object.assign(wrestler || {}, wrestlerByLastName)
      }
      
      if (!wrestler) continue
      
      const scores = parseScore(parsed.score)
      const result = parsed.nc_is_winner ? "W" : "L"
      
      // Check for duplicate match
      const { data: existingMatch } = await supabase
        .from("nhsca_matches")
        .select("id")
        .eq("nc_wrestler_id", wrestler.id)
        .ilike("opponent_name", `%${parsed.opponent_name}%`)
        .limit(1)
      
      if (existingMatch && existingMatch.length > 0) {
        results.skipped++
        continue
      }
      
      // Check if opponent is nationally ranked
      const { data: rankedOpponent } = await supabase
        .from("nhsca_ranked_wrestlers")
        .select("national_rank")
        .eq("classification", classification)
        .eq("weight_class", parsed.weight_class)
        .ilike("name", `%${parsed.opponent_name}%`)
        .single()
      
      // Insert the match
      const { error: matchError } = await supabase
        .from("nhsca_matches")
        .insert({
          nc_wrestler_id: wrestler.id,
          nc_wrestler_name: wrestler.name,
          opponent_name: parsed.opponent_name,
          opponent_state: parsed.opponent_state,
          opponent_school: parsed.nc_is_winner ? parsed.loser_location : parsed.winner_location,
          weight_class: parsed.weight_class,
          classification,
          result,
          win_type: parseWinType(parsed.win_type),
          nc_score: parsed.nc_is_winner ? scores.winner_score : scores.loser_score,
          opponent_score: parsed.nc_is_winner ? scores.loser_score : scores.winner_score,
          round: "R32", // Default, can be updated
          status: "completed"
        })
      
      if (matchError) {
        results.errors.push(`Error inserting match for ${wrestler.name}: ${matchError.message}`)
        continue
      }
      
      // Update wrestler record
      const newWins = parsed.nc_is_winner ? wrestler.wins + 1 : wrestler.wins
      const newLosses = parsed.nc_is_winner ? wrestler.losses : wrestler.losses + 1
      const newStatus = newLosses >= 2 ? "eliminated" : "active"
      
      await supabase
        .from("nhsca_roster")
        .update({ 
          wins: newWins, 
          losses: newLosses,
          status: newStatus
        })
        .eq("id", wrestler.id)
      
      results.success++
      
      // If it's a win against a ranked opponent, create a news alert
      if (parsed.nc_is_winner && rankedOpponent) {
        await supabase
          .from("win_alerts")
          .insert({
            wrestler_name: wrestler.name,
            opponent_name: parsed.opponent_name || "",
            opponent_seed: rankedOpponent.national_rank,
            win_type: parseWinType(parsed.win_type),
            weight_class: parseInt(parsed.weight_class),
            is_active: true,
            priority: rankedOpponent.national_rank <= 5 ? 1 : 2
          })
      }
      
    } catch (err) {
      results.errors.push(`Error processing line: ${line.slice(0, 50)}...`)
    }
  }
  
  revalidatePath("/nhsca/live")
  revalidatePath("/nhsca/live/control")
  
  return {
    success: results.success > 0,
    message: `Processed ${results.success} matches. Skipped ${results.skipped} (duplicates or non-NC). ${results.errors.length > 0 ? `Errors: ${results.errors.slice(0, 3).join("; ")}` : ""}`,
    details: results
  }
}
