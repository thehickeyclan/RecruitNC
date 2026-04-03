"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function addWrestler(formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient()

    const name = formData.get("name") as string
    const weight_class = formData.get("weight_class") as string
    const seed = formData.get("seed") as string
    const bracket_status = formData.get("bracket_status") as string

    const { error } = await supabase.from("nc_roster").insert({
      name,
      weight_class,
      seed: seed ? Number.parseInt(seed) : null,
      bracket_status,
      wins: 0,
      losses: 0,
    })

    if (error) throw error

    revalidatePath("/nhsca/live/roster")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error adding wrestler:", error)
    return { success: false, error: "Failed to add wrestler" }
  }
}

export async function updateWrestler(id: string, formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient()

    const name = formData.get("name") as string
    const weight_class = formData.get("weight_class") as string
    const wins = formData.get("wins") as string
    const losses = formData.get("losses") as string
    const seed = formData.get("seed") as string
    const bracket_status = formData.get("bracket_status") as string
    const placement = formData.get("placement") as string

    const { error } = await supabase
      .from("nc_roster")
      .update({
        name,
        weight_class,
        wins: Number.parseInt(wins),
        losses: Number.parseInt(losses),
        seed: seed ? Number.parseInt(seed) : null,
        bracket_status,
        placement: placement ? Number.parseInt(placement) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) throw error

    revalidatePath("/nhsca/live/roster")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error updating wrestler:", error)
    return { success: false, error: "Failed to update wrestler" }
  }
}

export async function deleteWrestler(id: string) {
  try {
    const supabase = await getSupabaseServerClient()

    const { error } = await supabase.from("nc_roster").delete().eq("id", id)

    if (error) throw error

    revalidatePath("/nhsca/live/roster")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error deleting wrestler:", error)
    return { success: false, error: "Failed to delete wrestler" }
  }
}

export async function bulkImportRoster(rosterText: string) {
  try {
    const supabase = await getSupabaseServerClient()

    // Parse the roster text (format: "Name WeightClass" per line)
    const lines = rosterText.trim().split("\n")
    const wrestlers = []
    const skipped = []

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Split by last space to separate name and weight class
      const lastSpaceIndex = trimmedLine.lastIndexOf(" ")

      if (lastSpaceIndex === -1) {
        // No space found - skip this entry
        skipped.push(trimmedLine)
        continue
      }

      const name = trimmedLine.substring(0, lastSpaceIndex).trim()
      const potentialWeightClass = trimmedLine.substring(lastSpaceIndex + 1).trim()

      // Check if the last part is a valid weight class (should be a number)
      if (!potentialWeightClass || isNaN(Number(potentialWeightClass))) {
        // Not a valid weight class - skip this entry
        skipped.push(trimmedLine)
        continue
      }

      if (name && potentialWeightClass) {
        wrestlers.push({
          name,
          weight_class: potentialWeightClass,
          wins: 0,
          losses: 0,
          bracket_status: "active",
        })
      }
    }

    if (wrestlers.length === 0) {
      return {
        success: false,
        message:
          skipped.length > 0
            ? `No valid wrestler data found. Skipped ${skipped.length} entries without weight classes.`
            : "No valid wrestler data found",
      }
    }

    // Insert all wrestlers
    const { error } = await supabase.from("nc_roster").insert(wrestlers)

    if (error) throw error

    revalidatePath("/nhsca/live/roster")
    revalidatePath("/")

    const message =
      skipped.length > 0
        ? `Successfully imported ${wrestlers.length} wrestlers. Skipped ${skipped.length} entries without weight classes: ${skipped.join(", ")}`
        : `Successfully imported ${wrestlers.length} wrestlers`

    return { success: true, message }
  } catch (error) {
    console.error("Error importing roster:", error)
    return { success: false, message: "Failed to import roster" }
  }
}

export async function autoFixEliminatedWrestlers() {
  try {
    const supabase = await getSupabaseServerClient()

    // Update all wrestlers with 2+ losses to eliminated status
    const { data, error } = await supabase
      .from("nc_roster")
      .update({ bracket_status: "eliminated" })
      .gte("losses", 2)
      .eq("bracket_status", "active")
      .select("name, weight_class, wins, losses")

    if (error) throw error

    revalidatePath("/nhsca/live/roster")
    revalidatePath("/")
    revalidatePath("/nhsca/live/control")

    return {
      success: true,
      message: `Updated ${data?.length || 0} wrestlers to eliminated status`,
      updated: data || [],
    }
  } catch (error) {
    console.error("Error auto-fixing eliminated wrestlers:", error)
    return { success: false, message: "Failed to update eliminated wrestlers" }
  }
}
