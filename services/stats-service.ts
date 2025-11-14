import { supabase } from "@/lib/supabase"

export async function getCommitmentStats() {
  try {
    console.log("Fetching commitment stats...")

    const { count: totalCount, error: totalError } = await supabase
      .from("athletes")
      .select("*", { count: "exact", head: true })
      .not("college", "is", null)
      .neq("college", "")
      .or("is_prospect.is.null,is_prospect.eq.false")

    if (totalError) {
      console.error("Error fetching total commitments:", totalError)
      return getDefaultStats()
    }

    const { count: count2025, error: error2025 } = await supabase
      .from("athletes")
      .select("*", { count: "exact", head: true })
      .not("college", "is", null)
      .neq("college", "")
      .or("is_prospect.is.null,is_prospect.eq.false")
      .eq("graduationyear", 2025)

    if (error2025) {
      console.error("Error fetching class of 2025 commitments:", error2025)
      return getDefaultStats()
    }

    const { count: count2026, error: error2026 } = await supabase
      .from("athletes")
      .select("*", { count: "exact", head: true })
      .not("college", "is", null)
      .neq("college", "")
      .or("is_prospect.is.null,is_prospect.eq.false")
      .eq("graduationyear", 2026)

    if (error2026) {
      console.error("Error fetching class of 2026 commitments:", error2026)
      return getDefaultStats()
    }

    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("college, division")
      .not("college", "is", null)
      .neq("college", "")
      .or("is_prospect.is.null,is_prospect.eq.false")

    if (athletesError) {
      console.error("Error fetching athletes for division breakdown:", athletesError)
      return getDefaultStats()
    }

    // Initialize division counts
    const divisionCounts = {
      D1: 0,
      D2: 0,
      D3: 0,
      NAIA: 0,
      NJCAA: 0,
    }

    // Process each athlete
    athletes.forEach((athlete) => {
      const college = (athlete.college || "").toLowerCase()
      const division = (athlete.division || "").toLowerCase()

      // Handle specific colleges directly
      if (
        college.includes("nc state") ||
        college.includes("north carolina state") ||
        college === "unc" ||
        college === "unc chapel hill" ||
        college.includes("university of north carolina at chapel hill") ||
        college.includes("appalachian state") ||
        college.includes("app state")
      ) {
        divisionCounts.D1++
        return
      }

      if (college.includes("unc pembroke") || college.includes("university of north carolina at pembroke")) {
        divisionCounts.D2++
        return
      }

      // Handle by division value
      if (division === "division i") {
        divisionCounts.D1++
      } else if (division === "division ii") {
        divisionCounts.D2++
      } else if (division === "division iii") {
        divisionCounts.D3++
      } else if (division === "naia") {
        divisionCounts.NAIA++
      } else if (division === "njcaa") {
        divisionCounts.NJCAA++
      }
      // Handle common variations
      else if (division.includes("d1") || division.includes("division 1") || division.includes("di")) {
        divisionCounts.D1++
      } else if (division.includes("d2") || division.includes("division 2") || division.includes("dii")) {
        divisionCounts.D2++
      } else if (division.includes("d3") || division.includes("division 3") || division.includes("diii")) {
        divisionCounts.D3++
      } else if (division.includes("naia")) {
        divisionCounts.NAIA++
      } else if (
        division.includes("juco") ||
        division.includes("junior") ||
        division.includes("jc") ||
        division.includes("community") ||
        division.includes("njcaa")
      ) {
        divisionCounts.NJCAA++
      }
    })

    return {
      totalCommitments: totalCount || 0,
      classOf2025: count2025 || 0,
      classOf2026: count2026 || 0,
      divisionBreakdown: divisionCounts,
    }
  } catch (error) {
    console.error("Error fetching commitment stats:", error)
    return getDefaultStats()
  }
}

export async function getTopEntities() {
  try {
    const { data: colleges, error: collegesError } = await supabase
      .from("athletes")
      .select("college, gender")
      .not("college", "is", null)
      .neq("college", "")
      .or("is_prospect.is.null,is_prospect.eq.false")

    if (collegesError) {
      console.error("Error fetching top colleges:", collegesError)
      return getDefaultTopEntities()
    }

    // Process college data
    const collegeMap: Record<string, { count: number; menCount: number; womenCount: number }> = {}
    colleges.forEach((athlete) => {
      const college = athlete.college
      if (!college) return

      if (!collegeMap[college]) {
        collegeMap[college] = { count: 0, menCount: 0, womenCount: 0 }
      }

      collegeMap[college].count++

      if (athlete.gender?.toLowerCase() === "male") {
        collegeMap[college].menCount++
      } else if (athlete.gender?.toLowerCase() === "female") {
        collegeMap[college].womenCount++
      }
    })

    const topColleges = Object.entries(collegeMap)
      .map(([name, stats]) => ({
        id: name,
        name,
        count: stats.count,
        menCount: stats.menCount,
        womenCount: stats.womenCount,
      }))
      .sort((a, b) => b.count - a.count)

    const { data: highSchools, error: highSchoolsError } = await supabase
      .from("athletes")
      .select("highschool")
      .not("highschool", "is", null)
      .neq("highschool", "")
      .or("is_prospect.is.null,is_prospect.eq.false")

    if (highSchoolsError) {
      console.error("Error fetching top high schools:", highSchoolsError)
      return { ...getDefaultTopEntities(), colleges: topColleges }
    }

    // Process high school data
    const highSchoolMap: Record<string, number> = {}
    highSchools.forEach((athlete) => {
      const highSchool = athlete.highschool
      if (!highSchool) return

      if (!highSchoolMap[highSchool]) {
        highSchoolMap[highSchool] = 0
      }

      highSchoolMap[highSchool]++
    })

    const topHighSchools = Object.entries(highSchoolMap)
      .map(([name, count]) => ({
        id: name,
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count)

    const { data: wrestlingClubs, error: clubsError } = await supabase
      .from("athletes")
      .select("wrestlingclub")
      .not("wrestlingclub", "is", null)
      .neq("wrestlingclub", "")
      .or("is_prospect.is.null,is_prospect.eq.false")

    if (clubsError) {
      console.error("Error fetching top wrestling clubs:", clubsError)
      return {
        colleges: topColleges,
        highSchools: topHighSchools,
        wrestlingClubs: [],
      }
    }

    // Process wrestling club data
    const clubMap: Record<string, number> = {}
    wrestlingClubs.forEach((athlete) => {
      const club = athlete.wrestlingclub
      if (!club) return

      if (!clubMap[club]) {
        clubMap[club] = 0
      }

      clubMap[club]++
    })

    const topWrestlingClubs = Object.entries(clubMap)
      .map(([name, count]) => ({
        id: name,
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count)

    return {
      colleges: topColleges,
      highSchools: topHighSchools,
      wrestlingClubs: topWrestlingClubs,
    }
  } catch (error) {
    console.error("Error fetching top entities:", error)
    return getDefaultTopEntities()
  }
}

function getDefaultStats() {
  return {
    totalCommitments: 0,
    classOf2025: 0,
    classOf2026: 0,
    divisionBreakdown: {
      D1: 0,
      D2: 0,
      D3: 0,
      NAIA: 0,
      NJCAA: 0,
    },
  }
}

function getDefaultTopEntities() {
  return {
    colleges: [],
    highSchools: [],
    wrestlingClubs: [],
  }
}
