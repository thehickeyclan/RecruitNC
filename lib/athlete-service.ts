import { supabase } from "@/lib/supabase"

export interface Athlete {
  id: number
  name: string
  high_school?: string
  club?: string
  college?: string
  graduation_year?: number
  weight_class?: string
  gender?: string
  commitment_date?: string
  image_url?: string
  achievements?: string[]
  division?: string
  created_at?: string
  updated_at?: string
}

export async function getAllAthletes(): Promise<Athlete[]> {
  try {
    const { data, error } = await supabase.from("athletes").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching athletes:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getAllAthletes:", error)
    return []
  }
}

export async function getAthleteById(id: number): Promise<Athlete | null> {
  try {
    const { data, error } = await supabase.from("athletes").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching athlete:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getAthleteById:", error)
    return null
  }
}

export async function createAthlete(
  athlete: Omit<Athlete, "id" | "created_at" | "updated_at">,
): Promise<Athlete | null> {
  try {
    const { data, error } = await supabase.from("athletes").insert([athlete]).select().single()

    if (error) {
      console.error("Error creating athlete:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in createAthlete:", error)
    return null
  }
}

export async function updateAthlete(id: number, updates: Partial<Athlete>): Promise<Athlete | null> {
  try {
    const { data, error } = await supabase.from("athletes").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("Error updating athlete:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in updateAthlete:", error)
    return null
  }
}

export async function deleteAthlete(id: number): Promise<boolean> {
  try {
    const { error } = await supabase.from("athletes").delete().eq("id", id)

    if (error) {
      console.error("Error deleting athlete:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteAthlete:", error)
    return false
  }
}

export async function getAthletesByYear(year: number): Promise<Athlete[]> {
  try {
    const { data, error } = await supabase
      .from("athletes")
      .select("*")
      .eq("graduation_year", year)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching athletes by year:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getAthletesByYear:", error)
    return []
  }
}

export async function getAthletesByGender(gender: string): Promise<Athlete[]> {
  try {
    const { data, error } = await supabase
      .from("athletes")
      .select("*")
      .eq("gender", gender)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching athletes by gender:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getAthletesByGender:", error)
    return []
  }
}

export async function getAthletesByDivision(division: string): Promise<Athlete[]> {
  try {
    const { data, error } = await supabase
      .from("athletes")
      .select("*")
      .eq("division", division)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching athletes by division:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getAthletesByDivision:", error)
    return []
  }
}

export async function searchAthletes(query: string): Promise<Athlete[]> {
  try {
    const { data, error } = await supabase
      .from("athletes")
      .select("*")
      .or(`name.ilike.%${query}%,high_school.ilike.%${query}%,college.ilike.%${query}%,club.ilike.%${query}%`)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error searching athletes:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in searchAthletes:", error)
    return []
  }
}

export async function getHaydenData(): Promise<Athlete | null> {
  try {
    const { data, error } = await supabase.from("athletes").select("*").ilike("name", "%hayden%").single()

    if (error) {
      console.error("Error fetching Hayden data:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getHaydenData:", error)
    return null
  }
}
