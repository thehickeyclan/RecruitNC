"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { mapAthleteToDb, mapDbToAthlete } from "./athlete-utils"

export async function getAthletesAction() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("athletes").select("*").order("name")

    if (error) {
      console.error("Error fetching athletes:", error)
      return { success: false, error: error.message }
    }

    // Map database fields to frontend fields
    const athletes = await Promise.all(data.map((athlete) => mapDbToAthlete(athlete)))

    return { success: true, data: athletes }
  } catch (error) {
    console.error("Error in getAthletesAction:", error)
    return { success: false, error: "Failed to fetch athletes" }
  }
}

export async function getAthleteByIdAction(id: string) {
  try {
    console.log("[v0] getAthleteByIdAction - Fetching athlete with ID:", id)

    const supabase = await createClient()

    const { data, error } = await supabase.from("athletes").select("*").eq("id", id).single()

    if (error) {
      console.error("[v0] getAthleteByIdAction - Supabase error:", error)
      return { success: false, error: error.message }
    }

    if (!data) {
      console.error("[v0] getAthleteByIdAction - No data returned for ID:", id)
      return { success: false, error: "Athlete not found" }
    }

    console.log("[v0] getAthleteByIdAction - Raw data from database:", {
      id: data.id,
      name: data.name,
      hasPhotoUrl: !!data.photourl,
      hasCollege: !!data.college,
    })

    // Map database fields to frontend fields
    const athlete = await mapDbToAthlete(data)

    console.log("[v0] getAthleteByIdAction - Mapped athlete:", {
      id: athlete.id,
      name: athlete.name,
      hasPhotoUrl: !!athlete.photoUrl,
      hasCollege: !!athlete.college,
    })

    return { success: true, data: athlete }
  } catch (error) {
    console.error("[v0] getAthleteByIdAction - Unexpected error:", error)
    return {
      success: false,
      error: "Failed to fetch athlete: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

export async function updateAthleteAction(id: string, athleteData: any) {
  try {
    console.log("[v0] updateAthleteAction called with:", { id, phone: athleteData.phone })

    // Validate required fields
    if (!athleteData.firstName || !athleteData.lastName) {
      return {
        success: false,
        error: "First name and last name are required",
      }
    }

    // Ensure name is set correctly
    if (!athleteData.name) {
      athleteData.name = `${athleteData.firstName} ${athleteData.lastName}`.trim()
    }

    const supabase = await createClient()

    // Map frontend fields to database fields (including phone)
    const dbData = await mapAthleteToDb(athleteData)
    console.log("[v0] Updating athlete with data:", dbData)

    // Perform the update with error handling
    const { data, error } = await supabase.from("athletes").update(dbData).eq("id", id).select().single()

    if (error) {
      console.error("Error updating athlete:", error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: "Failed to update athlete" }
    }

    console.log("[v0] Athlete updated successfully")

    // Map database fields back to frontend fields for the response
    const updatedAthlete = await mapDbToAthlete(data)

    // Revalidate the athletes list and the individual athlete page
    revalidatePath("/admin/athletes")
    revalidatePath(`/athletes/${id}`)
    revalidatePath("/")

    return { success: true, data: updatedAthlete }
  } catch (error) {
    console.error("Error in updateAthleteAction:", error)
    return {
      success: false,
      error: "Failed to update athlete: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

export async function createAthleteAction(athleteData: any) {
  try {
    // Validate required fields
    if (!athleteData.firstName || !athleteData.lastName) {
      return {
        success: false,
        error: "First name and last name are required",
      }
    }

    // Ensure name is set correctly
    if (!athleteData.name) {
      athleteData.name = `${athleteData.firstName} ${athleteData.lastName}`.trim()
    }

    // Map frontend fields to database fields
    const dbData = await mapAthleteToDb(athleteData)

    const supabase = await createClient()
    const { data, error } = await supabase.from("athletes").insert([dbData]).select().single()

    if (error) {
      console.error("Error creating athlete:", error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: "Failed to create athlete" }
    }

    // Map database fields back to frontend fields for the response
    const newAthlete = await mapDbToAthlete(data)

    // Revalidate the athletes list
    revalidatePath("/admin/athletes")
    revalidatePath("/")

    return { success: true, data: newAthlete }
  } catch (error) {
    console.error("Error in createAthleteAction:", error)
    return {
      success: false,
      error: "Failed to create athlete: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

export async function deleteAthleteAction(id: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("athletes").delete().eq("id", id)

    if (error) {
      console.error("Error deleting athlete:", error)
      return { success: false, error: error.message }
    }

    // Revalidate the athletes list
    revalidatePath("/admin/athletes")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Error in deleteAthleteAction:", error)
    return { success: false, error: "Failed to delete athlete" }
  }
}

export async function getAthletes() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("athletes").select("*").order("name")

    if (error) {
      console.error("Error fetching athletes:", error)
      return { success: false, error: error.message }
    }

    return data
  } catch (error) {
    console.error("Error in getAthletes:", error)
    return null
  }
}
