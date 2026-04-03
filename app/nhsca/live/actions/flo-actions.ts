"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { parseMultipleUpdates } from "@/lib/nhsca-live/flo-parser"
import { revalidatePath } from "next/cache"
import { isDuplicateMatch } from "@/lib/nhsca-live/duplicate-detection"

export async function processFloUpdates(text: string) {
  const supabase = await getSupabaseServerClient()

  const matches = parseMultipleUpdates(text)

  if (matches.length === 0) {
    return { success: false, message: "No valid match results found in the text." }
  }

  const { data: ncRoster } = await supabase.from("nc_roster").select("*")

  if (!ncRoster) {
    return { success: false, message: "Could not load NC roster" }
  }

  let processedCount = 0
  let skippedCount = 0
  let ncMatchesFound = 0
  const ncMatches: string[] = []

  for (const match of matches) {
    const isNCWinner = match.winnerState === "NC"
    const isNCLoser = match.loserState === "NC"

    if (!isNCWinner && !isNCLoser) {
      skippedCount++
      continue
    }

    const ncWrestlerName = isNCWinner ? match.winnerName : match.loserName
    const opponentName = isNCWinner ? match.loserName : match.winnerName
    const result = isNCWinner ? "win" : "loss"

    let ncWrestler = ncRoster.find((w) => w.name.toLowerCase() === ncWrestlerName.toLowerCase())

    if (!ncWrestler) {
      const lastName = ncWrestlerName.split(" ").pop()?.toLowerCase()
      ncWrestler = ncRoster.find((w) => w.name.toLowerCase().includes(lastName || ""))
    }

    if (!ncWrestler) {
      skippedCount++
      continue
    }

    ncMatchesFound++

    const ncScore = isNCWinner ? match.score.split("-")[0] : match.score.split("-")[1]
    const opponentScore = isNCWinner ? match.score.split("-")[1] : match.score.split("-")[0]

    const isDuplicate = await isDuplicateMatch(supabase, ncWrestler.name, opponentName, result, ncScore, opponentScore)

    if (isDuplicate) {
      skippedCount++
      continue
    }

    ncMatches.push(`${ncWrestler.name} ${result === "win" ? "defeated" : "lost to"} ${opponentName}`)

    const { error } = await supabase.from("live_matches").insert({
      nc_wrestler_name: ncWrestler.name,
      opponent_name: opponentName,
      weight_class: match.weightClass || ncWrestler.weight_class,
      result,
      win_type: match.decisionType,
      nc_score: ncScore,
      opponent_score: opponentScore,
      placement: match.placement,
      status: "completed",
    })

    if (error) {
      console.error("Error inserting match:", error)
      continue
    }

    if (result === "win") {
      await supabase
        .from("nc_roster")
        .update({ wins: (ncWrestler.wins || 0) + 1 })
        .eq("id", ncWrestler.id)
    } else {
      await supabase
        .from("nc_roster")
        .update({ losses: (ncWrestler.losses || 0) + 1 })
        .eq("id", ncWrestler.id)
    }

    processedCount++
  }

  revalidatePath("/")
  revalidatePath("/nhsca/live")
  revalidatePath("/nhsca/live/control")

  if (ncMatchesFound === 0) {
    return {
      success: false,
      message: `Parsed ${matches.length} matches but found no NC wrestlers. Make sure NC wrestlers have "(NC)" in their state field.`,
    }
  }

  return {
    success: true,
    message: `Successfully processed ${processedCount} NC matches. Skipped ${skippedCount} duplicates or non-NC matches.\n\nNC Matches found:\n${ncMatches.join("\n")}`,
  }
}
