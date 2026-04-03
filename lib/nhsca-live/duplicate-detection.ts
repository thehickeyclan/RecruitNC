import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Normalizes opponent names for duplicate detection
 * Removes weight class prefixes (e.g., "132Joey Enzminger" -> "Joey Enzminger")
 * Converts to lowercase and trims whitespace
 */
export function normalizeOpponentName(name: string): string {
  // Remove leading numbers (weight class prefix)
  const withoutWeight = name.replace(/^\d+/, "").trim()
  return withoutWeight.toLowerCase()
}

/**
 * Checks if a match already exists in the database
 * Uses comprehensive matching: wrestler name, opponent name (normalized), result, and scores
 */
export async function isDuplicateMatch(
  supabase: SupabaseClient,
  ncWrestlerName: string,
  opponentName: string,
  result: "win" | "loss",
  ncScore?: number | string,
  opponentScore?: number | string,
): Promise<boolean> {
  // Normalize the opponent name for comparison
  const normalizedOpponent = normalizeOpponentName(opponentName)

  console.log("[v0] Checking for duplicates:", {
    wrestler: ncWrestlerName,
    opponent: opponentName,
    normalizedOpponent,
    result,
    ncScore,
    opponentScore,
  })

  // Get all matches for this wrestler with the same result
  const { data: existingMatches } = await supabase
    .from("live_matches")
    .select("*")
    .ilike("nc_wrestler_name", ncWrestlerName)
    .eq("result", result)

  if (!existingMatches || existingMatches.length === 0) {
    console.log("[v0] No existing matches found for this wrestler")
    return false
  }

  // Check each existing match for a duplicate
  for (const match of existingMatches) {
    const existingOpponent = normalizeOpponentName(match.opponent_name)

    // Check if opponent names match (normalized)
    if (existingOpponent !== normalizedOpponent) {
      continue
    }

    // If we have scores, check if they match too
    if (ncScore !== undefined && opponentScore !== undefined) {
      const existingNcScore = Number.parseInt(match.nc_score?.toString() || "0")
      const existingOppScore = Number.parseInt(match.opponent_score?.toString() || "0")
      const newNcScore = Number.parseInt(ncScore.toString())
      const newOppScore = Number.parseInt(opponentScore.toString())

      if (existingNcScore === newNcScore && existingOppScore === newOppScore) {
        console.log("[v0] Duplicate match found (same opponent, result, and scores)")
        return true
      }
    } else {
      // No scores provided, just match on wrestler + opponent + result
      console.log("[v0] Duplicate match found (same opponent and result, no score check)")
      return true
    }
  }

  console.log("[v0] No duplicate found")
  return false
}
