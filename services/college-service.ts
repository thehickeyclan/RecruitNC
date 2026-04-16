import { supabase } from "@/lib/supabase"
import { mockColleges } from "@/lib/mock-data"
import { normalizeCollegeName } from "@/lib/college-utils"
import { normalizeDivision } from "@/lib/division-normalize"

export interface College {
  name: string
  division: string
  conference?: string
  location?: string
  count?: number
  weightClasses?: string
}

// Known college divisions mapping
const knownCollegeDivisions: Record<string, string> = {
  // D1 Schools
  "nc state": "NCAA D1",
  "north carolina state": "NCAA D1",
  unc: "NCAA D1",
  "unc chapel hill": "NCAA D1",
  "north carolina": "NCAA D1",
  "university of north carolina": "NCAA D1",
  "appalachian state": "NCAA D1",
  "app state": "NCAA D1",
  campbell: "NCAA D1",
  "campbell university": "NCAA D1",
  davidson: "NCAA D1",
  "davidson college": "NCAA D1",
  duke: "NCAA D1",
  "duke university": "NCAA D1",
  elon: "NCAA D1",
  "elon university": "NCAA D1",
  "gardner-webb": "NCAA D1",
  "gardner webb": "NCAA D1",
  "high point": "NCAA D1",
  "high point university": "NCAA D1",

  // D2 Schools
  "belmont abbey": "NCAA D2",
  "belmont abbey college": "NCAA D2",
  "unc pembroke": "NCAA D2",
  pembroke: "NCAA D2",
  queens: "NCAA D2",
  "queens university": "NCAA D2",
  limestone: "NCAA D2",
  "limestone university": "NCAA D2",
  coker: "NCAA D2",
  "coker university": "NCAA D2",
  newberry: "NCAA D2",
  "newberry college": "NCAA D2",
  "mars hill": "NCAA D2",
  "mars hill university": "NCAA D2",
  king: "NCAA D2",
  "king university": "NCAA D2",
  barton: "NCAA D2",
  "barton college": "NCAA D2",
  emmanuel: "NCAA D2",
  "emmanuel college": "NCAA D2",
  "lees-mcrae": "NCAA D2",
  "lees mcrae": "NCAA D2",
  "lenoir-rhyne": "NCAA D2",
  "lenoir rhyne": "NCAA D2",
  wingate: "NCAA D2",
  "wingate university": "NCAA D2",

  // D3 Schools
  roanoke: "NCAA D3",
  "roanoke college": "NCAA D3",
  ferrum: "NCAA D3",
  "ferrum college": "NCAA D3",
  greensboro: "NCAA D3",
  "greensboro college": "NCAA D3",
  guilford: "NCAA D3",
  "guilford college": "NCAA D3",
  methodist: "NCAA D3",
  "methodist university": "NCAA D3",
  "nc wesleyan": "NCAA D3",
  "north carolina wesleyan": "NCAA D3",
  averett: "NCAA D3",
  "averett university": "NCAA D3",
  "washington and lee": "NCAA D3",
  "washington & lee": "NCAA D3",
  "hampden-sydney": "NCAA D3",
  "hampden sydney": "NCAA D3",
  "randolph-macon": "NCAA D3",
  "randolph macon": "NCAA D3",
  bridgewater: "NCAA D3",
  "bridgewater college": "NCAA D3",
  shenandoah: "NCAA D3",
  "shenandoah university": "NCAA D3",
}

export async function getAllColleges(): Promise<College[]> {
  try {
    // Fetch all unique colleges from the athletes table
    const { data, error } = await supabase
      .from("athletes")
      .select("college, division, weightclass")
      .not("college", "is", null)
      .order("college")

    if (error) {
      console.error("Error fetching colleges from athletes:", error)
      return mockColleges
    }

    // Group by college and count athletes
    const collegeMap = new Map<string, College & { weightClassesSet: Set<string> }>()

    data.forEach((athlete) => {
      if (!athlete.college) return

      // Normalize the college name to prevent duplicates
      const normalizedName = normalizeCollegeName(athlete.college)
      const normalizedNameLower = normalizedName.toLowerCase()

      // Get the correct division - first check known mappings, then use athlete's division, then normalize
      let division = "Unknown"

      // Check if we have a known mapping for this college
      if (knownCollegeDivisions[normalizedNameLower]) {
        division = knownCollegeDivisions[normalizedNameLower]
      }
      // Otherwise use the athlete's division if available
      else if (athlete.division) {
        // Normalize the division format
        division = normalizeDivision(athlete.division)
      }

      if (!collegeMap.has(normalizedName)) {
        collegeMap.set(normalizedName, {
          name: normalizedName,
          division: division,
          count: 1,
          weightClassesSet: athlete.weightclass ? new Set([athlete.weightclass]) : new Set(),
          // Use mock data for additional info if available
          ...mockColleges.find((c) => c.name.toLowerCase() === normalizedNameLower),
        })
      } else {
        const college = collegeMap.get(normalizedName)!
        college.count = (college.count || 0) + 1

        // Only update division if current is unknown and we have a better one
        if (college.division === "Unknown" && division !== "Unknown") {
          college.division = division
        }

        // Track weight classes
        if (athlete.weightclass) {
          college.weightClassesSet.add(athlete.weightclass)
        }
      }
    })

    // Sort weight classes for each college
    const weightClassOrder = ["125", "133", "141", "149", "157", "165", "174", "184", "197", "285", "HWT"]

    for (const college of collegeMap.values()) {
      // Convert Set to Array, sort by weight class order, and join with commas
      const weightClasses = Array.from(college.weightClassesSet)
        .sort((a, b) => {
          return weightClassOrder.indexOf(a) - weightClassOrder.indexOf(b)
        })
        .join(", ")

      college.weightClasses = weightClasses

      // Remove the temporary weightClassesSet
      delete college.weightClassesSet
    }

    // Convert map to array
    return Array.from(collegeMap.values())
  } catch (error) {
    console.error("Error in getAllColleges:", error)
    return mockColleges
  }
}

export async function getCollegeByName(name: string): Promise<College | null> {
  try {
    // Normalize the college name
    const normalizedName = normalizeCollegeName(name)
    const normalizedNameLower = normalizedName.toLowerCase()

    // Check if we have a known division for this college
    const knownDivision = knownCollegeDivisions[normalizedNameLower] || null

    // First check if we have any athletes committed to this college
    const { data, error } = await supabase
      .from("athletes")
      .select("college, division")
      .ilike("college", `%${normalizedName}%`)
      .limit(1)
      .single()

    if (error) {
      // If not found in database, check mock data
      const mockCollege = mockColleges.find((c) => normalizeCollegeName(c.name).toLowerCase() === normalizedNameLower)

      // If we have a known division, use it
      if (mockCollege && knownDivision) {
        return {
          ...mockCollege,
          division: knownDivision,
        }
      }

      return mockCollege || null
    }

    // Return the college data
    return {
      name: normalizedName,
      // Use known division if available, otherwise normalize the athlete's division
      division: knownDivision || normalizeDivision(data.division) || "Unknown",
      // Use mock data for additional info if available
      ...mockColleges.find((c) => normalizeCollegeName(c.name).toLowerCase() === normalizedNameLower),
    }
  } catch (error) {
    console.error(`Error fetching college ${name}:`, error)
    return null
  }
}
