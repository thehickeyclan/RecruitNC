"use server"

import { createClient } from "@/lib/supabase/server"

interface WrestlerMatch {
  round: string
  result: string // e.g., "WIN - VSU", "LOSS - VFA"
  opponent: string
  opponent_state: string
  score: string
  time?: string
  note?: string
}

interface WrestlerData {
  wrestler: string
  weight: number
  city: string
  record: string
  matches: WrestlerMatch[]
}

export async function processWomensMatches(jsonText: string) {
  try {
    const data: WrestlerData[] = JSON.parse(jsonText)
    const supabase = await createClient()

    let addedCount = 0
    let skippedCount = 0
    let errorCount = 0
    const errors: string[] = []
    const addedMatches: string[] = []
    const skippedMatches: string[] = []

    for (const wrestler of data) {
      try {
        // Validate required fields
        if (!wrestler.wrestler || !wrestler.weight || !wrestler.matches) {
          errors.push(`${wrestler.wrestler || "Unknown"}: Missing required fields`)
          errorCount++
          continue
        }

        // Ensure wrestler exists in roster
        const { data: existingWrestler } = await supabase
          .from("nc_roster")
          .select("*")
          .ilike("name", wrestler.wrestler)
          .eq("weight_class", wrestler.weight)
          .maybeSingle()

        if (!existingWrestler) {
          // Add wrestler to roster
          await supabase.from("nc_roster").insert({
            name: wrestler.wrestler,
            weight_class: wrestler.weight,
            city: wrestler.city || "NC",
            state: "NC",
            gender: "women",
            wins: 0,
            losses: 0,
            bracket_status: "active",
          })
        }

        // Process each match
        for (const match of wrestler.matches) {
          try {
            if (!match.result || !match.opponent || !match.score) {
              errors.push(`${wrestler.wrestler}: Match missing required fields (result, opponent, or score)`)
              errorCount++
              continue
            }

            if (match.opponent.toUpperCase() === "BYE") {
              skippedCount++
              skippedMatches.push(`${wrestler.wrestler} vs BYE (${wrestler.weight} lbs) - BYE skipped`)
              continue
            }

            // Parse result (e.g., "WIN - VSU" or "LOSS - VFA")
            const resultParts = match.result.split(" - ")
            if (resultParts.length !== 2) {
              errors.push(
                `${wrestler.wrestler}: Invalid result format "${match.result}" (expected "WIN - TYPE" or "LOSS - TYPE")`,
              )
              errorCount++
              continue
            }

            const [outcome, winType] = resultParts.map((s) => s.trim())
            const isWin = outcome === "WIN"

            // Check for duplicate
            const { data: existingMatch } = await supabase
              .from("live_matches")
              .select("*")
              .ilike("nc_wrestler_name", wrestler.wrestler)
              .ilike("opponent_name", match.opponent)
              .eq("weight_class", wrestler.weight)
              .maybeSingle()

            if (existingMatch) {
              skippedCount++
              skippedMatches.push(`${wrestler.wrestler} vs ${match.opponent} (${wrestler.weight} lbs) - already exists`)
              continue
            }

            const scoreParts = match.score.split("-")
            if (scoreParts.length !== 2) {
              errors.push(`${wrestler.wrestler} vs ${match.opponent}: Invalid score format "${match.score}"`)
              errorCount++
              continue
            }

            // Add match
            const matchData = {
              nc_wrestler_name: wrestler.wrestler,
              opponent_name: match.opponent,
              opponent_state: match.opponent_state || "Unknown",
              weight_class: wrestler.weight,
              result: isWin ? "W" : "L",
              win_type: winType || null,
              nc_score: isWin ? Number.parseInt(scoreParts[0]) : Number.parseInt(scoreParts[1]),
              opponent_score: isWin ? Number.parseInt(scoreParts[1]) : Number.parseInt(scoreParts[0]),
              round: match.round || "Unknown",
            }

            const { error: matchError } = await supabase.from("live_matches").insert(matchData)

            if (matchError) {
              errorCount++
              errors.push(`${wrestler.wrestler} vs ${match.opponent || "Unknown"}: ${matchError.message}`)
              continue
            }

            addedCount++
            addedMatches.push(
              `${wrestler.wrestler} ${isWin ? "WIN" : "LOSS"} vs ${match.opponent} (${match.score}) - ${match.round}`,
            )

            // Create win alert if it's a win
            if (isWin) {
              await supabase.from("win_alerts").insert({
                wrestler_name: wrestler.wrestler,
                opponent_name: match.opponent,
                weight_class: wrestler.weight,
                win_type: winType,
                score: match.score,
                opponent_seed: null,
                is_seeded_win: false,
              })
            }
          } catch (matchError) {
            errorCount++
            errors.push(`${wrestler.wrestler} vs ${match.opponent || "Unknown"}: ${matchError}`)
          }
        }

        // Recalculate record
        const { data: allMatches } = await supabase
          .from("live_matches")
          .select("result")
          .ilike("nc_wrestler_name", wrestler.wrestler)
          .eq("weight_class", wrestler.weight)

        if (allMatches) {
          const wins = allMatches.filter((m) => m.result === "W").length
          const losses = allMatches.filter((m) => m.result === "L").length
          const bracketStatus = losses >= 2 ? "eliminated" : "active"

          await supabase
            .from("nc_roster")
            .update({ wins, losses, bracket_status: bracketStatus })
            .ilike("name", wrestler.wrestler)
            .eq("weight_class", wrestler.weight)
        }
      } catch (wrestlerError) {
        errorCount++
        errors.push(`Error processing ${wrestler.wrestler || "Unknown"}: ${wrestlerError}`)
      }
    }

    const summary = [
      `✅ Processed ${addedCount} matches`,
      `⏭️  Skipped ${skippedCount} duplicates`,
      errorCount > 0 ? `⚠️  Errors: ${errorCount}` : null,
      "",
      addedMatches.length > 0 ? "Added matches:" : null,
      ...addedMatches.map((m) => `  • ${m}`),
      "",
      skippedMatches.length > 0 ? "Skipped (duplicates):" : null,
      ...skippedMatches.slice(0, 10).map((m) => `  • ${m}`),
      skippedMatches.length > 10 ? `  ... and ${skippedMatches.length - 10} more` : null,
      "",
      errors.length > 0 ? "Errors:" : null,
      ...errors.map((e) => `  • ${e}`),
    ]
      .filter(Boolean)
      .join("\n")

    return {
      success: errorCount === 0,
      message: summary,
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to parse JSON: ${error}`,
    }
  }
}
