"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function deleteWrestlerMatches(wrestlerName: string) {
  const supabase = await getSupabaseServerClient()

  try {
    const { error: matchError } = await supabase
      .from("live_matches")
      .delete()
      .ilike("nc_wrestler_name", `%${wrestlerName}%`)

    if (matchError) throw matchError

    // Reset wins and losses to 0 in nc_roster
    const { error: rosterError } = await supabase
      .from("nc_roster")
      .update({ wins: 0, losses: 0 })
      .ilike("name", `%${wrestlerName}%`)

    if (rosterError) throw rosterError

    revalidatePath("/")
    revalidatePath("/nhsca/live/control")

    return { success: true, message: `Deleted all matches and reset record for ${wrestlerName}` }
  } catch (error) {
    console.error("Error deleting matches:", error)
    return { success: false, message: "Failed to delete matches" }
  }
}
