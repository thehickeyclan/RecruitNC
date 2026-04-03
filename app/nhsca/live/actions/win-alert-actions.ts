"use server"

import { createClient } from "@/lib/supabase/server"

export async function createWinAlert(data: {
  wrestlerName: string
  weightClass: string
  opponentName: string
  opponentSeed?: number
  winType: string
  score: string
}) {
  try {
    const supabase = await createClient()

    const isSeededWin = data.opponentSeed !== undefined && data.opponentSeed > 0

    const { error } = await supabase.from("win_alerts").insert({
      wrestler_name: data.wrestlerName,
      weight_class: data.weightClass,
      opponent_name: data.opponentName,
      opponent_seed: data.opponentSeed || null,
      win_type: data.winType,
      score: data.score,
      is_seeded_win: isSeededWin,
    })

    if (error) {
      console.error("Error creating win alert:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to create win alert:", error)
    return { success: false, error: "Failed to create alert. Please run Script 72 to create the win_alerts table." }
  }
}

export async function getRecentWinAlerts(gender?: "Male" | "Female") {
  try {
    const supabase = await createClient()

    const { data: alertsData, error: alertsError } = await supabase
      .from("win_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    if (alertsError) {
      console.error("Error fetching win alerts:", alertsError)
      return []
    }

    if (gender && alertsData) {
      const { data: rosterData } = await supabase.from("nc_roster").select("name, gender").eq("gender", gender)

      if (rosterData) {
        const wrestlerNames = new Set(rosterData.map((w) => w.name))
        return alertsData.filter((alert) => wrestlerNames.has(alert.wrestler_name)).slice(0, 10)
      }
    }

    return alertsData?.slice(0, 10) || []
  } catch (error) {
    console.error("Failed to fetch win alerts:", error)
    return []
  }
}

export async function clearOldWinAlerts() {
  try {
    const supabase = await createClient()

    // Delete alerts older than 24 hours
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const { error } = await supabase.from("win_alerts").delete().lt("created_at", twentyFourHoursAgo.toISOString())

    if (error) {
      console.error("Error clearing old alerts:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to clear old alerts:", error)
    return { success: false, error: "Failed to clear alerts" }
  }
}
