"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { LiveMatch } from "@/lib/nhsca-live/types"

export async function addMatch(formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient()

    const nc_wrestler_id = formData.get("nc_wrestler_id") as string
    const opponent_name = formData.get("opponent_name") as string
    const round = formData.get("round") as string

    // Get NC wrestler details
    const { data: wrestler } = await supabase.from("nc_roster").select("*").eq("id", nc_wrestler_id).single()

    if (!wrestler) throw new Error("Wrestler not found")

    // Check if opponent is ranked
    const { data: rankedOpponent } = await supabase
      .from("ranked_wrestlers")
      .select("*")
      .ilike("name", opponent_name)
      .eq("weight_class", wrestler.weight_class)
      .single()

    const { error } = await supabase.from("live_matches").insert({
      nc_wrestler_id,
      nc_wrestler_name: wrestler.name,
      opponent_name,
      weight_class: wrestler.weight_class,
      round: round || null,
      status: "live",
      nc_score: 0,
      opponent_score: 0,
      is_notable: !!rankedOpponent,
    })

    if (error) throw error

    revalidatePath("/nhsca/live/matches")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error adding match:", error)
    return { success: false, error: "Failed to add match" }
  }
}

export async function updateMatch(matchId: string, ncScore: number, opponentScore: number) {
  try {
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("live_matches")
      .update({
        nc_score: ncScore,
        opponent_score: opponentScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/nhsca/live/matches")
    revalidatePath("/")
    return { success: true, match: data as LiveMatch }
  } catch (error) {
    console.error("Error updating match:", error)
    return { success: false, error: "Failed to update match" }
  }
}

export async function completeMatch(matchId: string, result: "win" | "loss", winType?: string) {
  try {
    const supabase = await getSupabaseServerClient()

    // Get match details
    const { data: match } = await supabase.from("live_matches").select("*").eq("id", matchId).single()

    if (!match) throw new Error("Match not found")

    // Update match status
    const { data: updatedMatch, error: matchError } = await supabase
      .from("live_matches")
      .update({
        status: "completed",
        result,
        win_type: winType || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId)
      .select()
      .single()

    if (matchError) throw matchError

    // Update wrestler record
    const { data: wrestler } = await supabase.from("nc_roster").select("*").eq("id", match.nc_wrestler_id).single()

    if (wrestler) {
      const newWins = result === "win" ? wrestler.wins + 1 : wrestler.wins
      const newLosses = result === "loss" ? wrestler.losses + 1 : wrestler.losses
      const notableWins = wrestler.notable_wins || []

      // Add to notable wins if it's a win against a ranked opponent
      if (result === "win" && match.is_notable && !notableWins.includes(match.opponent_name)) {
        notableWins.push(match.opponent_name)
      }

      await supabase
        .from("nc_roster")
        .update({
          wins: newWins,
          losses: newLosses,
          notable_wins: notableWins,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.nc_wrestler_id)
    }

    revalidatePath("/nhsca/live/matches")
    revalidatePath("/")
    revalidatePath("/nhsca/live/roster")
    return { success: true, match: updatedMatch as LiveMatch }
  } catch (error) {
    console.error("Error completing match:", error)
    return { success: false, error: "Failed to complete match" }
  }
}

export async function deleteMatch(matchId: string) {
  try {
    const supabase = await getSupabaseServerClient()

    const { error } = await supabase.from("live_matches").delete().eq("id", matchId)

    if (error) throw error

    revalidatePath("/nhsca/live/matches")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error deleting match:", error)
    return { success: false, error: "Failed to delete match" }
  }
}
