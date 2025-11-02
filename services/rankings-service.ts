import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export type ProspectRanking = {
  id: string
  athlete_id: string
  graduation_year: number
  overall_rank: number
  weight_class: string
  region?: string
  folkstyle_rank?: number
  freestyle_rank?: number
  greco_rank?: number
  ranking_notes?: string
  verified: boolean
  last_updated: string
  created_at: string

  // Joined athlete data
  athlete_name?: string
  high_school?: string
  photo_url?: string
  achievements?: string[]
  nationally_ranked_wins?: number
}

export type RankingFilters = {
  graduationYear?: number
  weightClass?: string
  region?: string
  verified?: boolean
}

// Evaluation criteria for NC Wrestling Prospect Rankings
export const RANKING_CRITERIA = [
  {
    rank: 1,
    title: "College Readiness",
    description:
      "Academic performance, maturity level, work ethic, and overall preparedness for collegiate wrestling demands",
  },
  {
    rank: 2,
    title: "National Tournament Results and College Opens",
    description:
      "Performance at national-level competitions including Fargo, Super 32, FloNationals, Beast of the East, and college open tournaments",
  },
  {
    rank: 3,
    title: "State Tournament Performance",
    description: "Consistent high-level performance at NCHSAA state championships across multiple years",
  },
  {
    rank: 4,
    title: "Head-to-Head Competition",
    description: "Direct competition results against other ranked wrestlers and quality of opponents faced",
  },
  {
    rank: 5,
    title: "Technical Skill Development",
    description: "Wrestling technique, tactical awareness, and continuous improvement in all positions",
  },
  {
    rank: 6,
    title: "Physical Attributes",
    description:
      "Strength, speed, conditioning, and physical development relative to weight class and competition level",
  },
]

// Default weight classes to use when the table doesn't exist yet - using high school weight classes
const DEFAULT_WEIGHT_CLASSES = [
  "106 lbs",
  "113 lbs",
  "120 lbs",
  "126 lbs",
  "132 lbs",
  "138 lbs",
  "144 lbs",
  "150 lbs",
  "157 lbs",
  "165 lbs",
  "175 lbs",
  "190 lbs",
  "215 lbs",
  "285 lbs",
]

// Default graduation years
const DEFAULT_GRADUATION_YEARS = [2025, 2026, 2027, 2028]

// Modified function to safely check if a table exists
async function tableExists(supabase: any, tableName: string): Promise<boolean> {
  try {
    // Try to query the table directly with a limit of 0 rows
    // This will fail if the table doesn't exist
    const { data, error } = await supabase.from(tableName).select("id").limit(0)

    // If there's no error, the table exists
    return !error
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error)
    return false
  }
}

export async function getProspectRankings(filters: RankingFilters = {}): Promise<ProspectRanking[]> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Check if the table exists
  const exists = await tableExists(supabase, "prospect_rankings")
  if (!exists) {
    console.log("prospect_rankings table does not exist yet")
    return []
  }

  let query = supabase.from("prospect_rankings").select(`*`).order("overall_rank", { ascending: true })

  // Apply filters
  if (filters.graduationYear) {
    query = query.eq("graduation_year", filters.graduationYear)
  }

  if (filters.weightClass) {
    query = query.eq("weight_class", filters.weightClass)
  }

  if (filters.region) {
    query = query.eq("region", filters.region)
  }

  if (filters.verified !== undefined) {
    query = query.eq("verified", filters.verified)
  }

  const { data: rankings, error } = await query

  if (error) {
    // Check if the error is because the table doesn't exist
    if (error.message.includes("does not exist")) {
      console.log("prospect_rankings table does not exist yet")
      return []
    }

    console.error("Error fetching prospect rankings:", error)
    return []
  }

  // Now fetch the athlete data separately
  if (rankings.length === 0) return []

  const athleteIds = rankings.map((ranking) => ranking.athlete_id)

  const { data: athletes, error: athletesError } = await supabase
    .from("athletes")
    .select("id, name, highschool, photourl, achievements, nationally_ranked_wins")
    .in("id", athleteIds)

  if (athletesError) {
    console.error("Error fetching athletes:", athletesError)
    return rankings as ProspectRanking[] // Return rankings without athlete data
  }

  // Create a map of athlete data for quick lookup
  const athleteMap = new Map(athletes.map((athlete) => [athlete.id, athlete]))

  // Combine the data
  return rankings.map((ranking) => ({
    ...ranking,
    athlete_name: athleteMap.get(ranking.athlete_id)?.name,
    high_school: athleteMap.get(ranking.athlete_id)?.highschool,
    photo_url: athleteMap.get(ranking.athlete_id)?.photourl,
    achievements: athleteMap.get(ranking.athlete_id)?.achievements,
    nationally_ranked_wins: athleteMap.get(ranking.athlete_id)?.nationally_ranked_wins,
  }))
}

export async function getProspectRankingsByYear(year: number): Promise<ProspectRanking[]> {
  return getProspectRankings({ graduationYear: year })
}

export async function getTopProspects(limit = 5): Promise<ProspectRanking[]> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    // Check if the table exists
    const exists = await tableExists(supabase, "prospect_rankings")
    if (!exists) {
      console.log("prospect_rankings table does not exist yet")
      return []
    }

    // First, get the rankings
    const { data: rankings, error } = await supabase
      .from("prospect_rankings")
      .select("*")
      .order("overall_rank", { ascending: true })
      .limit(limit)

    if (error) {
      // Check if the error is because the table doesn't exist
      if (error.message.includes("does not exist")) {
        console.log("prospect_rankings table does not exist yet")
        return []
      }

      console.error("Error fetching top prospects:", error)
      return []
    }

    if (rankings.length === 0) return []

    // Then, get the athlete data
    const athleteIds = rankings.map((ranking) => ranking.athlete_id)

    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, highschool, photourl, achievements, nationally_ranked_wins")
      .in("id", athleteIds)

    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return rankings as ProspectRanking[] // Return rankings without athlete data
    }

    // Create a map of athlete data for quick lookup
    const athleteMap = new Map(athletes.map((athlete) => [athlete.id, athlete]))

    // Combine the data
    return rankings.map((ranking) => ({
      ...ranking,
      athlete_name: athleteMap.get(ranking.athlete_id)?.name,
      high_school: athleteMap.get(ranking.athlete_id)?.highschool,
      photo_url: athleteMap.get(ranking.athlete_id)?.photourl,
      achievements: athleteMap.get(ranking.athlete_id)?.achievements,
      nationally_ranked_wins: athleteMap.get(ranking.athlete_id)?.nationally_ranked_wins,
    }))
  } catch (error) {
    console.error("Error in getTopProspects:", error)
    return []
  }
}

export async function getProspectRankingById(id: string): Promise<ProspectRanking | null> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Check if the table exists
  const exists = await tableExists(supabase, "prospect_rankings")
  if (!exists) {
    console.log("prospect_rankings table does not exist yet")
    return null
  }

  const { data: ranking, error } = await supabase.from("prospect_rankings").select("*").eq("id", id).single()

  if (error) {
    // Check if the error is because the table doesn't exist
    if (error.message.includes("does not exist")) {
      console.log("prospect_rankings table does not exist yet")
      return null
    }

    console.error("Error fetching prospect ranking:", error)
    return null
  }

  // Get the athlete data
  const { data: athlete, error: athleteError } = await supabase
    .from("athletes")
    .select("id, name, highschool, photourl, achievements, nationally_ranked_wins")
    .eq("id", ranking.athlete_id)
    .single()

  if (athleteError) {
    console.error("Error fetching athlete:", athleteError)
    return ranking as ProspectRanking // Return ranking without athlete data
  }

  return {
    ...ranking,
    athlete_name: athlete?.name,
    high_school: athlete?.highschool,
    photo_url: athlete?.photourl,
    achievements: athlete?.achievements,
    nationally_ranked_wins: athlete?.nationally_ranked_wins,
  }
}

export async function getAvailableGraduationYears(): Promise<number[]> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Check if the table exists
  const exists = await tableExists(supabase, "prospect_rankings")
  if (!exists) {
    console.log("prospect_rankings table does not exist yet, returning default years")
    return DEFAULT_GRADUATION_YEARS
  }

  const { data, error } = await supabase
    .from("prospect_rankings")
    .select("graduation_year")
    .order("graduation_year", { ascending: true })

  if (error) {
    // Check if the error is because the table doesn't exist
    if (error.message.includes("does not exist")) {
      console.log("prospect_rankings table does not exist yet, returning default years")
      return DEFAULT_GRADUATION_YEARS
    }

    console.error("Error fetching graduation years:", error)
    return DEFAULT_GRADUATION_YEARS
  }

  // Extract unique years
  const years = [...new Set(data.map((item) => item.graduation_year))]
  return years.length > 0 ? years : DEFAULT_GRADUATION_YEARS
}

export async function getWeightClasses(): Promise<string[]> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Check if the table exists
  const exists = await tableExists(supabase, "prospect_rankings")
  if (!exists) {
    console.log("prospect_rankings table does not exist yet, returning default weight classes")
    return DEFAULT_WEIGHT_CLASSES
  }

  const { data, error } = await supabase
    .from("prospect_rankings")
    .select("weight_class")
    .order("weight_class", { ascending: true })

  if (error) {
    // Check if the error is because the table doesn't exist
    if (error.message.includes("does not exist")) {
      console.log("prospect_rankings table does not exist yet, returning default weight classes")
      return DEFAULT_WEIGHT_CLASSES
    }

    console.error("Error fetching weight classes:", error)
    return DEFAULT_WEIGHT_CLASSES
  }

  // Extract unique weight classes
  const weightClasses = [...new Set(data.map((item) => item.weight_class))]
  return weightClasses.length > 0 ? weightClasses : DEFAULT_WEIGHT_CLASSES
}
