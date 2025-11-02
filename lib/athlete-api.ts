"use server"

import { supabase } from "@/lib/supabase"
import { mockAthletes } from "@/lib/mock-data"
import type { Athlete } from "@/types/athlete"

// Helper function to map database fields to our Athlete type
function mapAthleteFromDatabase(data: any): Athlete {
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

// Helper function to map Athlete to database format
function mapAthleteToDatabaseFormat(athlete: Athlete): any {
  return {
    ...athlete,
    // Map any specific fields if needed
  }
}

// Get recent commitments
export async function getRecentCommitments(count: number): Promise<Athlete[]> {
  const { data, error } = await supabase
    .from("athletes")
    .select("*")
    .order("commitmentdate", { ascending: false })
    .limit(count)

  if (error) {
    console.error("Error fetching recent commitments:", error)
    return mockAthletes as any
  }

  return data.map(mapAthleteFromDatabase)
}

// Inspect athletes table
export async function inspectAthletesTable(): Promise<string[]> {
  try {
    // Try to get a single row to examine its structure
    const { data, error } = await supabase.from("athletes").select("*").limit(1)

    if (error) {
      console.error("Error inspecting athletes table:", error)
      return []
    }

    // If we have data, extract column names from the first row
    if (data && data.length > 0) {
      return Object.keys(data[0])
    }

    // If no data but no error, the table exists but is empty
    // Return an empty array as we can't determine columns
    return []
  } catch (error) {
    console.error("Error inspecting athletes table:", error)
    return []
  }
}

// Get all athletes
export async function getAllAthletes(): Promise<Athlete[]> {
  const { data, error } = await supabase.from("athletes").select("*").order("commitmentdate", { ascending: false })

  if (error) {
    console.error("Error fetching athletes:", error)
    return []
  }

  return data.map(mapAthleteFromDatabase)
}

// Get athlete by ID
export async function getAthleteById(id: string): Promise<Athlete | null> {
  const { data, error } = await supabase.from("athletes").select("*").eq("id", id).single()

  if (error) {
    console.error(`Error fetching athlete with id ${id}:`, error)
    return null
  }

  // Log the raw data for debugging
  console.log("Raw athlete data from database:", data)

  return mapAthleteFromDatabase(data)
}

// Create athlete
export async function createAthlete(athlete: Omit<Athlete, "id">): Promise<Athlete | null> {
  const { data, error } = await supabase.from("athletes").insert([athlete]).select().single()

  if (error) {
    console.error("Error creating athlete:", error)
    return null
  }

  return mapAthleteFromDatabase(data)
}

// Update athlete
export async function updateAthlete(id: string, athlete: Partial<Athlete>): Promise<Athlete | null> {
  const { data, error } = await supabase.from("athletes").update(athlete).eq("id", id).select().single()

  if (error) {
    console.error(`Error updating athlete with id ${id}:`, error)
    return null
  }

  return mapAthleteFromDatabase(data)
}

// Delete athlete
export async function deleteAthlete(id: string): Promise<boolean> {
  const { error } = await supabase.from("athletes").delete().eq("id", id)

  if (error) {
    console.error(`Error deleting athlete with id ${id}:`, error)
    return false
  }

  return true
}

// Function to specifically get Hayden's data for debugging
export async function getHaydenData(): Promise<any> {
  try {
    const { data, error } = await supabase.from("athletes").select("*").ilike("name", "%Hayden%")

    if (error) {
      console.error("Error fetching Hayden's data:", error)
      return { error: error.message }
    }

    return {
      rawData: data,
      mappedData: data.map(mapAthleteFromDatabase),
    }
  } catch (error) {
    console.error("Exception in getHaydenData:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Export the mapper functions as async to satisfy the "use server" requirement
export async function asyncMapAthleteFromDatabase(data: any): Promise<Athlete> {
  return mapAthleteFromDatabase(data)
}

export async function asyncMapAthleteToDatabaseFormat(athlete: Athlete): Promise<any> {
  return mapAthleteToDatabaseFormat(athlete)
}
