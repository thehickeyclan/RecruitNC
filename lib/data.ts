import { createClient } from "@/lib/supabase/server"

interface Athlete {
  id: string
  name?: string
  first_name?: string
  last_name?: string
  firstName?: string
  lastName?: string
  graduation_year?: number
  graduationyear?: number
  graduationYear?: number
  weight_class?: string
  weightclass?: string
  weightClass?: string
  weight?: string
  high_school?: string
  highschool?: string
  highSchool?: string
  club?: string
  wrestlingclub?: string
  wrestlingClub?: string
  wrestling_club?: string
  college?: string
  college_name?: string
  division?: string
  image_url?: string
  photourl?: string
  photoUrl?: string
  commitmentPhotoUrl?: string
  achievements?: string[]
  rankings?: any[]
  location?: string
  commitment_date?: string
  commitmentdate?: string
  commitmentDate?: string
  gender?: string
}

export async function getAthlete(id: string): Promise<Athlete | null> {
  try {
    const supabase = createClient()

    const { data: athlete, error } = await supabase.from("athletes").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching athlete:", error)
      return null
    }

    // Log the raw data for debugging
    console.log("Raw athlete data for ID", id, ":", JSON.stringify(athlete, null, 2))

    return athlete
  } catch (error) {
    console.error("Exception fetching athlete:", error)
    return null
  }
}

export async function getAthleteMatches(id: string) {
  try {
    const supabase = createClient()

    const { data: matches, error } = await supabase
      .from("matches")
      .select("*")
      .eq("athlete_id", id)
      .order("date", { ascending: false })

    if (error) {
      console.error("Error fetching matches:", error)
      return []
    }

    return matches || []
  } catch (error) {
    console.error("Exception fetching matches:", error)
    return []
  }
}
