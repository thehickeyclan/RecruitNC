"use server"

import { supabase } from "@/lib/supabase"
import { mockAthletes } from "@/lib/mock-data"
import type { Athlete } from "@/types/athlete"

// Helper function to map database fields to our Athlete type
// Making this async as required for server actions
export async function mapAthleteFromDatabase(data: any): Promise<Athlete> {
  if (!data) return null as any

  // Create a mapped athlete object
  const athlete: Athlete = {
    id: data.id,
    name: data.name || "",
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    highschool: data.highschool || "",
    highSchool: data.highschool || "", // Map to camelCase version
    college: data.college || "",
    division: data.division || "",
    weightclass: data.weightclass || "",
    weightClass: data.weightclass || "", // Map to camelCase version
    graduationyear: data.graduationyear || new Date().getFullYear(),
    graduationYear: data.graduationyear || new Date().getFullYear(), // Map to camelCase version
    commitmentdate: data.commitmentdate || new Date().toISOString().split("T")[0],
    commitmentDate: data.commitmentdate || new Date().toISOString().split("T")[0], // Map to camelCase version
    photourl: data.photourl || "/diverse-wrestlers.png",
    photoUrl: data.photourl || "/diverse-wrestlers.png", // Map to camelCase version
    commitmentPhotoUrl: data.commitmentPhotoUrl || "",
    achievements: Array.isArray(data.achievements) ? data.achievements : [],
    bio: data.bio || undefined,
    gender: data.gender || "",
    weight: data.weight || null,
    highSchoolLogoUrl: data.highSchoolLogoUrl || "",
    wrestlingClub: data.wrestlingClub || "",
    wrestlingClubLogoUrl: data.wrestlingClubLogoUrl || "",
    ncUnitedTeam: data.ncUnitedTeam || "none",
    collegeLogoUrl: data.collegeLogoUrl || "",
    careerRecord: data.careerRecord || "",
    rankings: data.rankings || {},
    location: data.location || "",
    socialMedia: data.socialMedia || {},
    contactEmail: data.contactEmail || "",
    featured: data.featured || false,
  }

  return athlete
}

// Get recent commitments
export async function getRecentCommitments(count) {
  const { data, error } = await supabase
    .from("athletes")
    .select("*")
    .order("commitmentdate", { ascending: false })
    .limit(count)

  if (error) {
    console.error("Error fetching recent commitments:", error)
    return mockAthletes
  }

  // Use Promise.all to properly await all async mapping operations
  return await Promise.all(data.map(async (item) => await mapAthleteFromDatabase(item)))
}

// Get all athletes
export async function getAllAthletes() {
  const { data, error } = await supabase.from("athletes").select("*").order("commitmentdate", { ascending: false })

  if (error) {
    console.error("Error fetching athletes:", error)
    return []
  }

  // Use Promise.all to properly await all async mapping operations
  return await Promise.all(data.map(async (item) => await mapAthleteFromDatabase(item)))
}

// Get athlete by ID
export async function getAthleteById(id) {
  const { data, error } = await supabase.from("athletes").select("*").eq("id", id).single()

  if (error) {
    console.error(`Error fetching athlete with id ${id}:`, error)
    return null
  }

  return await mapAthleteFromDatabase(data)
}

// Create athlete
export async function createAthlete(athlete) {
  const { data, error } = await supabase.from("athletes").insert([athlete]).select().single()

  if (error) {
    console.error("Error creating athlete:", error)
    return null
  }

  return await mapAthleteFromDatabase(data)
}

// Update athlete
export async function updateAthlete(id, athlete) {
  const { data, error } = await supabase.from("athletes").update(athlete).eq("id", id).select().single()

  if (error) {
    console.error(`Error updating athlete with id ${id}:`, error)
    return null
  }

  return await mapAthleteFromDatabase(data)
}

// Delete athlete
export async function deleteAthlete(id) {
  const { error } = await supabase.from("athletes").delete().eq("id", id)

  if (error) {
    console.error(`Error deleting athlete with id ${id}:`, error)
    return false
  }

  return true
}

// Get Hayden's data for debugging
export async function getHaydenData() {
  try {
    const { data, error } = await supabase.from("athletes").select("*").ilike("name", "%Hayden%")

    if (error) {
      console.error("Error fetching Hayden's data:", error)
      return { error: error.message }
    }

    // Use Promise.all to properly await all async mapping operations
    const mappedData = await Promise.all(data.map(async (item) => await mapAthleteFromDatabase(item)))

    return {
      rawData: data,
      mappedData: mappedData,
    }
  } catch (error) {
    console.error("Exception in getHaydenData:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Inspect athletes table
export async function inspectAthletesTable() {
  try {
    const { data, error } = await supabase.from("athletes").select("*").limit(1)

    if (error) {
      console.error("Error inspecting athletes table:", error)
      return []
    }

    if (data && data.length > 0) {
      return Object.keys(data[0])
    }

    return []
  } catch (error) {
    console.error("Error inspecting athletes table:", error)
    return []
  }
}
