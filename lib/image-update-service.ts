"use server"

import { supabase } from "@/lib/supabase"

// Function to update an athlete's image URL
export async function updateAthleteImage(athleteId: string, imageUrl: string): Promise<boolean> {
  try {
    console.log(`Updating athlete ${athleteId} with image URL: ${imageUrl}`)

    const { error } = await supabase
      .from("athletes")
      .update({
        photourl: imageUrl,
        commitmentphotourl: imageUrl, // Update both fields for compatibility
      })
      .eq("id", athleteId)

    if (error) {
      console.error("Error updating athlete image:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Exception in updateAthleteImage:", error)
    return false
  }
}

// Function to get athletes missing images
export async function getAthletesWithoutImages(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("athletes")
      .select("id, name, highschool, college")
      .or("photourl.is.null,photourl.eq.")
      .order("name")

    if (error) {
      console.error("Error fetching athletes without images:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Exception in getAthletesWithoutImages:", error)
    return []
  }
}
