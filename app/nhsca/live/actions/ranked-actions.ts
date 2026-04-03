"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function addRankedWrestler(formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient()

    const name = formData.get("name") as string
    const weight_class = formData.get("weight_class") as string
    const ranking = formData.get("ranking") as string
    const state = formData.get("state") as string
    const team = formData.get("team") as string

    const { error } = await supabase.from("ranked_wrestlers").insert({
      name,
      weight_class,
      ranking: Number.parseInt(ranking),
      state: state || null,
      team: team || null,
    })

    if (error) throw error

    revalidatePath("/nhsca/live/ranked")
    return { success: true }
  } catch (error) {
    console.error("Error adding ranked wrestler:", error)
    return { success: false, error: "Failed to add ranked wrestler" }
  }
}

export async function updateRankedWrestler(id: string, formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient()

    const name = formData.get("name") as string
    const weight_class = formData.get("weight_class") as string
    const ranking = formData.get("ranking") as string
    const state = formData.get("state") as string
    const team = formData.get("team") as string

    const { error } = await supabase
      .from("ranked_wrestlers")
      .update({
        name,
        weight_class,
        ranking: Number.parseInt(ranking),
        state: state || null,
        team: team || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) throw error

    revalidatePath("/nhsca/live/ranked")
    return { success: true }
  } catch (error) {
    console.error("Error updating ranked wrestler:", error)
    return { success: false, error: "Failed to update ranked wrestler" }
  }
}

export async function deleteRankedWrestler(id: string) {
  try {
    const supabase = await getSupabaseServerClient()

    const { error } = await supabase.from("ranked_wrestlers").delete().eq("id", id)

    if (error) throw error

    revalidatePath("/nhsca/live/ranked")
    return { success: true }
  } catch (error) {
    console.error("Error deleting ranked wrestler:", error)
    return { success: false, error: "Failed to delete ranked wrestler" }
  }
}
