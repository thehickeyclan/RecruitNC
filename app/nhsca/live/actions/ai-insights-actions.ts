"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getWinTypeDisplay } from "@/lib/nhsca-live/wrestling-terms"

export async function generateMatchInsights() {
  const supabase = await getSupabaseServerClient()

  const sixHoursAgo = new Date()
  sixHoursAgo.setHours(sixHoursAgo.getHours() - 6)

  const { data: completedMatches, error } = await supabase
    .from("live_matches")
    .select("*")
    .eq("status", "completed")
    .eq("result", "win")
    .gte("created_at", sixHoursAgo.toISOString())
    .order("created_at", { descending: true })
    .limit(20)

  if (error || !completedMatches || completedMatches.length === 0) {
    return []
  }

  const matchAlerts = completedMatches.map((match) => {
    const isSeededWin = match.opponent_seed && match.opponent_seed > 0
    const winTypeDisplay = getWinTypeDisplay(match.win_type)

    let text = ""
    let type: "big_win" | "win" = "win"

    if (isSeededWin) {
      type = "big_win"
      text = `${match.nc_wrestler_name} (${match.weight_class} lbs) defeats #${match.opponent_seed} seed ${match.opponent_name} by ${winTypeDisplay}`
    } else {
      text = `${match.nc_wrestler_name} (${match.weight_class} lbs) defeats ${match.opponent_name} by ${winTypeDisplay}`
    }

    return {
      type,
      text,
      wrestler: match.nc_wrestler_name,
      weightClass: match.weight_class,
      result: "win",
      seedInfo: match.opponent_seed ? `#${match.opponent_seed} seed` : null,
    }
  })

  return matchAlerts
}
