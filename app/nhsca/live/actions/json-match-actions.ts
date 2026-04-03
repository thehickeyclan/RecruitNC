"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { isDuplicateMatch } from "@/lib/nhsca-live/duplicate-detection"
import { createWinAlert } from "@/app/nhsca/live/actions/win-alert-actions"
import { namesMatch } from "@/lib/nhsca-live/names-match" // Declare the variable before using it

interface ClaudeMatch {
  weight: number
  wrestler: string
  city: string
  state: string
  result: string // "F", "DEC", "TF", "MD", "LOSS - F", "LOSS - DEC", etc.
  opponent: string
  opponent_city: string
  opponent_state: string
  score?: string
  time?: string
  opponent_seed?: number
}

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
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/[^a-z\s]/g, "") // Remove special characters, keep only letters and spaces
}

function findBestMatch(targetName: string, candidates: any[]): { match: any; confidence: number } | null {
  const normalizedTarget = normalizeName(targetName)
  let bestMatch: any = null
  let bestScore = 0

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeName(candidate.name)
    let score = 0

    // Exact match after normalization = 100% confidence
    if (normalizedTarget === normalizedCandidate) {
      return { match: candidate, confidence: 1.0 }
    }

    // Check if one name contains the other (handles middle names)
    if (normalizedTarget.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedTarget)) {
      score = 0.9
    }

    // Check last name + first initial match
    const targetParts = normalizedTarget.split(" ")
    const candidateParts = normalizedCandidate.split(" ")

    if (targetParts.length > 0 && candidateParts.length > 0) {
      const targetLastName = targetParts[targetParts.length - 1]
      const candidateLastName = candidateParts[candidateParts.length - 1]
      const targetFirstInitial = targetParts[0][0]
      const candidateFirstInitial = candidateParts[0][0]

      if (targetLastName === candidateLastName && targetFirstInitial === candidateFirstInitial) {
        score = Math.max(score, 0.85)
      }

      // Check if last names match (even if first names differ)
      if (targetLastName === candidateLastName) {
        score = Math.max(score, 0.7)
      }
    }

    // Use Levenshtein distance for fuzzy matching (handles typos like Riley/Rylie)
    const distance = levenshteinDistance(normalizedTarget, normalizedCandidate)
    const maxLength = Math.max(normalizedTarget.length, normalizedCandidate.length)
    const similarity = 1 - distance / maxLength

    // If similarity is high (>70%), consider it a match
    if (similarity > 0.7) {
      score = Math.max(score, similarity)
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = candidate
    }
  }

  // Return match if confidence is above 70%
  if (bestScore >= 0.7) {
    return { match: bestMatch, confidence: bestScore }
  }

  return null
}

async function postProcessMatches(supabase: any) {
  console.log("[v0] Starting post-processing: checking for seeded wins and eliminations...")

  let seededWinsFound = 0
  let wrestlersEliminated = 0

  // 1. Find all wins that don't have opponent_seed set
  const { data: unprocessedWins } = await supabase
    .from("live_matches")
    .select("*")
    .eq("result", "win")
    .or("opponent_seed.is.null,is_notable.eq.false")

  if (unprocessedWins && unprocessedWins.length > 0) {
    console.log(`[v0] Found ${unprocessedWins.length} wins to check against seeded wrestlers`)

    for (const match of unprocessedWins) {
      // Try to find opponent in seeded_wrestlers
      const { data: seededOpponents } = await supabase
        .from("seeded_wrestlers")
        .select("*")
        .eq("weight_class", match.weight_class)

      if (seededOpponents && seededOpponents.length > 0) {
        const seededOpponent = seededOpponents.find((s: any) => namesMatch(s.full_name, match.opponent_name))

        if (seededOpponent) {
          console.log(
            `[v0] Found seeded win: ${match.nc_wrestler_name} beat #${seededOpponent.seed} ${seededOpponent.full_name}`,
          )

          // Update match with seed info
          await supabase
            .from("live_matches")
            .update({
              opponent_seed: seededOpponent.seed,
              is_notable: true,
            })
            .eq("id", match.id)

          // Create win alert if it doesn't exist
          const { data: existingAlert } = await supabase
            .from("win_alerts")
            .select("id")
            .eq("wrestler_name", match.nc_wrestler_name)
            .eq("opponent_name", match.opponent_name)
            .single()

          if (!existingAlert) {
            await createWinAlert({
              wrestlerName: match.nc_wrestler_name,
              weightClass: match.weight_class,
              opponentName: match.opponent_name,
              opponentSeed: seededOpponent.seed,
              winType: match.win_type,
              score: match.nc_score && match.opponent_score ? `${match.nc_score}-${match.opponent_score}` : "N/A",
            })
          }

          seededWinsFound++
        }
      }
    }
  }

  // 2. Mark all wrestlers with 2+ losses as eliminated
  const { data: activeWrestlers } = await supabase
    .from("nc_roster")
    .select("*")
    .eq("bracket_status", "active")
    .gte("losses", 2)

  if (activeWrestlers && activeWrestlers.length > 0) {
    console.log(`[v0] Found ${activeWrestlers.length} wrestlers with 2+ losses to mark as eliminated`)

    for (const wrestler of activeWrestlers) {
      await supabase.from("nc_roster").update({ bracket_status: "eliminated" }).eq("id", wrestler.id)

      wrestlersEliminated++
    }
  }

  console.log(
    `[v0] Post-processing complete: ${seededWinsFound} seeded wins found, ${wrestlersEliminated} wrestlers eliminated`,
  )

  return { seededWinsFound, wrestlersEliminated }
}

export async function processJSONMatches(jsonText: string) {
  try {
    const supabase = await getSupabaseServerClient()

    const matches: ClaudeMatch[] = JSON.parse(jsonText)

    if (!Array.isArray(matches)) {
      return { success: false, message: "Invalid JSON format. Expected an array of match objects." }
    }

    let processed = 0
    let skipped = 0
    let created = 0
    const errors: string[] = []
    const createdWrestlers: string[] = []

    for (const match of matches) {
      try {
        let isWin = true
        let method = match.result

        if (match.result.startsWith("LOSS")) {
          isWin = false
          method = match.result.replace("LOSS - ", "").trim()
        }

        const result = isWin ? "win" : "loss"

        const { data: wrestlers } = await supabase
          .from("nc_roster")
          .select("*")
          .eq("weight_class", match.weight.toString())

        let wrestler = null
        let matchConfidence = 0

        if (wrestlers && wrestlers.length > 0) {
          const matchResult = findBestMatch(match.wrestler, wrestlers)
          if (matchResult) {
            wrestler = matchResult.match
            matchConfidence = matchResult.confidence

            if (matchConfidence < 1.0) {
              console.log(
                `[v0] Fuzzy matched "${match.wrestler}" to "${wrestler.name}" (${Math.round(matchConfidence * 100)}% confidence)`,
              )
            }
          }
        }

        if (!wrestler) {
          console.log(`[v0] Creating new wrestler: ${match.wrestler} at ${match.weight} lbs`)

          // Determine gender from weight class (women's weights: 95-200, men's weights: 106-285)
          const gender = match.weight < 106 ? "Female" : "Male"

          const { data: newWrestler, error: createError } = await supabase
            .from("nc_roster")
            .insert({
              name: match.wrestler,
              weight_class: match.weight.toString(),
              wins: 0,
              losses: 0,
              bracket_status: "active",
              gender: gender,
              notable_win_count: 0,
            })
            .select()
            .single()

          if (createError) {
            errors.push(`Failed to create wrestler ${match.wrestler}: ${createError.message}`)
            skipped++
            continue
          }

          wrestler = newWrestler
          created++
          createdWrestlers.push(`${match.wrestler} (${match.weight} lbs, ${gender})`)
        }

        let ncScore = 0
        let oppScore = 0

        if (match.score && match.score.includes("-")) {
          const parts = match.score.split("-")
          if (isWin) {
            ncScore = Number.parseInt(parts[0]) || 0
            oppScore = Number.parseInt(parts[1]) || 0
          } else {
            oppScore = Number.parseInt(parts[0]) || 0
            ncScore = Number.parseInt(parts[1]) || 0
          }
        }

        const isDuplicate = await isDuplicateMatch(supabase, wrestler.name, match.opponent, result, ncScore, oppScore)

        if (isDuplicate) {
          console.log("[v0] Duplicate match detected, skipping:", wrestler.name, "vs", match.opponent)
          skipped++
          continue
        }

        let opponentSeed = match.opponent_seed || null

        if (!opponentSeed) {
          const { data: seededOpponents } = await supabase
            .from("seeded_wrestlers")
            .select("*")
            .eq("weight_class", match.weight.toString())

          if (seededOpponents && seededOpponents.length > 0) {
            const seededMatch = findBestMatch(
              match.opponent,
              seededOpponents.map((s) => ({ name: s.full_name, ...s })),
            )
            if (seededMatch) {
              opponentSeed = seededMatch.match.seed
              console.log(
                `[v0] Matched opponent "${match.opponent}" to seed #${opponentSeed} "${seededMatch.match.full_name}"`,
              )
            }
          }
        }

        const isNotable = opponentSeed !== null && opponentSeed > 0

        // Insert match
        const { error: insertError } = await supabase.from("live_matches").insert({
          nc_wrestler_name: wrestler.name,
          opponent_name: match.opponent,
          weight_class: match.weight.toString(),
          result: result,
          win_type: method,
          nc_score: ncScore,
          opponent_score: oppScore,
          opponent_seed: opponentSeed,
          is_notable: isNotable,
          status: "completed",
        })

        if (insertError) {
          errors.push(`Error inserting ${match.wrestler}: ${insertError.message}`)
          skipped++
          continue
        }

        if (isWin) {
          const scoreText = match.score || `${ncScore}-${oppScore}`

          await createWinAlert({
            wrestlerName: wrestler.name,
            weightClass: match.weight.toString(),
            opponentName: match.opponent,
            opponentSeed: opponentSeed,
            winType: method,
            score: scoreText,
          })
        }

        const newWins = isWin ? wrestler.wins + 1 : wrestler.wins
        const newLosses = !isWin ? wrestler.losses + 1 : wrestler.losses

        const newBracketStatus = newLosses >= 2 ? "eliminated" : wrestler.bracket_status

        await supabase
          .from("nc_roster")
          .update({
            wins: newWins,
            losses: newLosses,
            bracket_status: newBracketStatus,
          })
          .eq("id", wrestler.id)

        processed++
      } catch (err) {
        errors.push(`Error processing ${match.wrestler}: ${err}`)
        skipped++
      }
    }

    const postProcessResults = await postProcessMatches(supabase)

    revalidatePath("/")
    revalidatePath("/nhsca/live/control")

    let message = `✅ Processed ${processed} matches`
    if (created > 0) message += `\n➕ Created ${created} new wrestlers:\n${createdWrestlers.join("\n")}`
    if (skipped > 0) message += `\n⏭️ Skipped ${skipped} duplicates`
    if (postProcessResults.seededWinsFound > 0) {
      message += `\n🏆 Found ${postProcessResults.seededWinsFound} seeded wins automatically`
    }
    if (postProcessResults.wrestlersEliminated > 0) {
      message += `\n❌ Marked ${postProcessResults.wrestlersEliminated} wrestlers eliminated`
    }
    if (errors.length > 0) message += `\n\n⚠️ Errors:\n${errors.join("\n")}`

    return { success: true, message }
  } catch (error) {
    return { success: false, message: `Failed to parse JSON: ${error}` }
  }
}
