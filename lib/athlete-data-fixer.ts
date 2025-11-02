"use server"

import { supabase } from "@/lib/supabase"

export async function fixAthleteData(athleteId: string) {
  try {
    // First, get the current athlete data
    const { data: athlete, error: fetchError } = await supabase
      .from("athletes")
      .select("*")
      .eq("id", athleteId)
      .single()

    if (fetchError) {
      console.error("Error fetching athlete:", fetchError)
      return { success: false, error: fetchError.message }
    }

    if (!athlete) {
      return { success: false, error: "Athlete not found" }
    }

    // Extract name parts if needed
    let firstName = athlete.firstName
    let lastName = athlete.lastName

    if (!firstName || !lastName) {
      const nameParts = (athlete.name || "").split(" ")
      firstName = firstName || nameParts[0] || ""
      lastName = lastName || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "")
    }

    // Prepare the update data
    const updateData: Record<string, any> = {
      firstName,
      lastName,
    }

    // Special handling for Liam Hickey
    if (athlete.name === "Liam Hickey") {
      // Make sure gender is set
      if (!athlete.gender) updateData.gender = "Male"

      // Make sure division is in the correct format
      if (athlete.division === "NCAA D1") updateData.division = "D1"

      // Fix college name if needed
      if (athlete.college === "UNC Chapel HIll") updateData.college = "UNC Chapel Hill"

      // Make sure we have the correct photo URLs
      if (!athlete.photoUrl && athlete.photourl) updateData.photoUrl = athlete.photourl
      if (!athlete.photourl && athlete.photoUrl) updateData.photourl = athlete.photoUrl
    }

    // Special handling for Hayden Litten
    if (athlete.name === "Hayden Litten") {
      // Make sure gender is set
      if (!athlete.gender) updateData.gender = "Male"

      // Make sure division is in the correct format
      if (athlete.division === "NCAA D1") updateData.division = "D1"

      // Make sure we have the correct photo URLs
      if (!athlete.photoUrl && athlete.photourl) updateData.photoUrl = athlete.photourl
      if (!athlete.photourl && athlete.photoUrl) updateData.photourl = athlete.photoUrl

      // If no photo URL exists, use the default
      if (!athlete.photourl && !athlete.photoUrl) {
        updateData.photourl = "/wrestler-profile.png"
        updateData.photoUrl = "/wrestler-profile.png"
      }
    }

    // Only update if there are changes to make
    if (Object.keys(updateData).length === 0) {
      return { success: true, message: "No updates needed", athlete }
    }

    // Update the athlete data
    const { data: updatedAthlete, error: updateError } = await supabase
      .from("athletes")
      .update(updateData)
      .eq("id", athleteId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating athlete:", updateError)
      return { success: false, error: updateError.message }
    }

    return {
      success: true,
      message: "Athlete data fixed successfully",
      updates: updateData,
      athlete: updatedAthlete,
    }
  } catch (error: any) {
    console.error("Error in fixAthleteData:", error)
    return { success: false, error: error.message || "Unknown error" }
  }
}
