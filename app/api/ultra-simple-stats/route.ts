import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    console.log("Fetching ultra simple stats...")

    // Get total commitments
    const { count: totalCount, error: totalError } = await supabase
      .from("athletes")
      .select("*", { count: "exact", head: true })
      .not("college", "is", null)

    if (totalError) {
      console.error("Error fetching total commitments:", totalError)
      return NextResponse.json({ error: "Error fetching total commitments" }, { status: 500 })
    }

    // Get all athletes with college commitments
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, college, division")
      .not("college", "is", null)

    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return NextResponse.json({ error: "Error fetching athletes" }, { status: 500 })
    }

    // Count by division using a simple approach
    const divisionCounts = {
      D1: 0,
      D2: 0,
      D3: 0,
      NAIA: 0,
      NJCAA: 0,
    }

    // List of D1 colleges in North Carolina
    const d1Colleges = [
      "nc state",
      "north carolina state",
      "unc",
      "unc chapel hill",
      "university of north carolina",
      "university of north carolina at chapel hill",
      "appalachian state",
      "app state",
      "duke",
      "duke university",
      "wake forest",
      "wake forest university",
      "east carolina",
      "east carolina university",
      "ecu",
      "charlotte",
      "unc charlotte",
      "university of north carolina at charlotte",
      "davidson",
      "davidson college",
      "campbell",
      "campbell university",
      "high point",
      "high point university",
      "north carolina a&t",
      "north carolina a & t",
      "nc a&t",
      "nc a & t",
    ]

    // List of D2 colleges in North Carolina
    const d2Colleges = [
      "unc pembroke",
      "university of north carolina at pembroke",
      "wingate",
      "wingate university",
      "queens",
      "queens university",
      "lenoir-rhyne",
      "lenoir rhyne",
      "lenoir-rhyne university",
      "lenoir rhyne university",
      "barton",
      "barton college",
      "catawba",
      "catawba college",
      "chowan",
      "chowan university",
      "fayetteville state",
      "fayetteville state university",
      "johnson c. smith",
      "johnson c smith",
      "livingstone",
      "livingstone college",
      "mars hill",
      "mars hill university",
      "saint augustine's",
      "saint augustines",
      "shaw",
      "shaw university",
      "winston-salem state",
      "winston salem state",
      "winston-salem state university",
      "winston salem state university",
    ]

    // List of D3 colleges in North Carolina
    const d3Colleges = [
      "guilford",
      "guilford college",
      "greensboro",
      "greensboro college",
      "methodist",
      "methodist university",
      "north carolina wesleyan",
      "nc wesleyan",
      "william peace",
      "william peace university",
      "brevard",
      "brevard college",
      "pfeiffer",
      "pfeiffer university",
      "salem",
      "salem college",
    ]

    // List of NAIA colleges in North Carolina
    const naiaColleges = [
      "montreat",
      "montreat college",
      "st. andrews",
      "st andrews",
      "saint andrews",
      "st. andrews university",
      "st andrews university",
      "saint andrews university",
      "belmont abbey",
      "belmont abbey college",
      "lees-mcrae",
      "lees mcrae",
      "lees-mcrae college",
      "lees mcrae college",
    ]

    // List of NJCAA colleges in North Carolina
    const njcaaColleges = [
      "alamance",
      "alamance community college",
      "brunswick",
      "brunswick community college",
      "cape fear",
      "cape fear community college",
      "catawba valley",
      "catawba valley community college",
      "central carolina",
      "central carolina community college",
      "cleveland",
      "cleveland community college",
      "coastal carolina",
      "coastal carolina community college",
      "davidson-davie",
      "davidson davie",
      "davidson-davie community college",
      "davidson davie community college",
      "durham tech",
      "durham technical community college",
      "forsyth tech",
      "forsyth technical community college",
      "gaston",
      "gaston college",
      "guilford tech",
      "guilford technical community college",
      "isothermal",
      "isothermal community college",
      "johnston",
      "johnston community college",
      "lenoir",
      "lenoir community college",
      "martin",
      "martin community college",
      "mayland",
      "mayland community college",
      "nash",
      "nash community college",
      "pitt",
      "pitt community college",
      "randolph",
      "randolph community college",
      "rockingham",
      "rockingham community college",
      "rowan-cabarrus",
      "rowan cabarrus",
      "rowan-cabarrus community college",
      "rowan cabarrus community college",
      "sampson",
      "sampson community college",
      "sandhills",
      "sandhills community college",
      "southeastern",
      "southeastern community college",
      "southwestern",
      "southwestern community college",
      "stanly",
      "stanly community college",
      "surry",
      "surry community college",
      "vance-granville",
      "vance granville",
      "vance-granville community college",
      "vance granville community college",
      "wake tech",
      "wake technical community college",
      "wayne",
      "wayne community college",
      "western piedmont",
      "western piedmont community college",
      "wilkes",
      "wilkes community college",
      "wilson",
      "wilson community college",
    ]

    // Process each athlete
    athletes.forEach((athlete) => {
      const college = (athlete.college || "").toLowerCase().trim()
      const division = (athlete.division || "").toLowerCase().trim()

      // Check college name against our lists
      if (d1Colleges.some((d1) => college.includes(d1))) {
        divisionCounts.D1++
        return
      }

      if (d2Colleges.some((d2) => college.includes(d2))) {
        divisionCounts.D2++
        return
      }

      if (d3Colleges.some((d3) => college.includes(d3))) {
        divisionCounts.D3++
        return
      }

      if (naiaColleges.some((naia) => college.includes(naia))) {
        divisionCounts.NAIA++
        return
      }

      if (njcaaColleges.some((njcaa) => college.includes(njcaa))) {
        divisionCounts.NJCAA++
        return
      }

      // If college wasn't in our lists, use the division value
      if (division === "division i" || division.includes("d1") || division.includes("di")) {
        divisionCounts.D1++
      } else if (division === "division ii" || division.includes("d2") || division.includes("dii")) {
        divisionCounts.D2++
      } else if (division === "division iii" || division.includes("d3") || division.includes("diii")) {
        divisionCounts.D3++
      } else if (division.includes("naia")) {
        divisionCounts.NAIA++
      } else if (
        division.includes("njcaa") ||
        division.includes("juco") ||
        division.includes("junior") ||
        division.includes("jc") ||
        division.includes("community")
      ) {
        divisionCounts.NJCAA++
      } else {
        // If we can't determine the division, log it for debugging
        console.log(
          `Unknown division for athlete ${athlete.id}: college="${athlete.college}", division="${athlete.division}"`,
        )
      }
    })

    // Get class of 2025 commitments
    const { count: count2025, error: error2025 } = await supabase
      .from("athletes")
      .select("*", { count: "exact", head: true })
      .not("college", "is", null)
      .eq("graduationyear", 2025)

    // Get class of 2026 commitments
    const { count: count2026, error: error2026 } = await supabase
      .from("athletes")
      .select("*", { count: "exact", head: true })
      .not("college", "is", null)
      .eq("graduationyear", 2026)

    return NextResponse.json({
      totalCommitments: totalCount || 0,
      classOf2025: count2025 || 0,
      classOf2026: count2026 || 0,
      divisionBreakdown: divisionCounts,
      athleteCount: athletes.length,
    })
  } catch (error) {
    console.error("Error in ultra simple stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
