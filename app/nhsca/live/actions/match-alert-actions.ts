"use server"

import { createClient } from "@/lib/supabase/server"

export async function getRecentAlerts() {
  const supabase = await createClient()

  // Get alerts from last 24 hours
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

  const { data, error } = await supabase
    .from("match_alerts")
    .select("*")
    .gte("created_at", twentyFourHoursAgo.toISOString())
    .order("created_at", { descending: true })
    .limit(20)

  if (error) {
    console.error("Error fetching alerts:", error)
    return []
  }

  return data || []
}

export async function createMatchAlert(
  wrestlerName: string,
  weightClass: string,
  opponentName: string,
  opponentSeed: number | null,
  winType: string,
  score: string,
) {
  const supabase = await createClient()

  const isSeededWin = opponentSeed !== null && opponentSeed > 0

  const { error } = await supabase.from("match_alerts").insert({
    wrestler_name: wrestlerName,
    weight_class: weightClass,
    opponent_name: opponentName,
    opponent_seed: opponentSeed,
    win_type: winType,
    score: score,
    is_seeded_win: isSeededWin,
  })

  if (error) {
    console.error("Error creating alert:", error)
    throw error
  }
}
