import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Division I schools
    const divisionIColleges = [
      "%unc chapel hill%",
      "%north carolina chapel hill%",
      "%unc-chapel hill%",
      "%nc state%",
      "%north carolina state%",
      "%duke%",
      "%appalachian state%",
      "%app state%",
      "%east carolina%",
      "%ecu%",
      "%unc charlotte%",
      "%uncc%",
      "%charlotte%",
      "%unc greensboro%",
      "%uncg%",
      "%unc wilmington%",
      "%uncw%",
      "%campbell%",
      "%davidson%",
      "%elon%",
      "%gardner-webb%",
      "%gardner webb%",
      "%high point%",
      "%north carolina a&t%",
      "%nc a&t%",
      "%a&t%",
      "%north carolina central%",
      "%nc central%",
      "%western carolina%",
    ]

    // Division II schools
    const divisionIIColleges = [
      "%unc pembroke%",
      "%uncp%",
      "%mount olive%",
      "%university of mount olive%",
      "%belmont abbey%",
      "%barton%",
      "%catawba%",
      "%chowan%",
      "%elizabeth city state%",
      "%fayetteville state%",
      "%johnson c. smith%",
      "%johnson c smith%",
      "%lenoir-rhyne%",
      "%lenoir rhyne%",
      "%livingstone%",
      "%mars hill%",
      "%queens%",
      "%queens university%",
      "%queens charlotte%",
      "%shaw%",
      "%st. augustine%",
      "%saint augustine%",
      "%winston-salem state%",
      "%winston salem state%",
      "%wssu%",
      "%wingate%",
    ]

    // Division III schools
    const divisionIIIColleges = [
      "%greensboro college%",
      "%guilford%",
      "%methodist%",
      "%north carolina wesleyan%",
      "%nc wesleyan%",
      "%william peace%",
      "%brevard%",
      "%meredith%",
      "%salem%",
    ]

    // NAIA schools
    const naiaColleges = [
      "%montreat%",
      "%st. andrews%",
      "%saint andrews%",
      "%bluefield%",
      "%columbia international%",
      "%mid-atlantic christian%",
      "%mid atlantic christian%",
    ]

    // NJCAA schools
    const njcaaColleges = [
      "%wake tech%",
      "%louisburg%",
      "%alamance community%",
      "%alamance cc%",
      "%caldwell community%",
      "%caldwell cc%",
      "%cape fear community%",
      "%cape fear cc%",
      "%catawba valley community%",
      "%catawba valley cc%",
      "%central carolina community%",
      "%central carolina cc%",
      "%cleveland community%",
      "%cleveland cc%",
      "%davidson county community%",
      "%davidson county cc%",
      "%durham tech%",
      "%durham technical%",
      "%fayetteville tech%",
      "%fayetteville technical%",
      "%guilford tech%",
      "%guilford technical%",
      "%johnston community%",
      "%johnston cc%",
      "%lenoir community%",
      "%lenoir cc%",
      "%pitt community%",
      "%pitt cc%",
      "%rockingham community%",
      "%rockingham cc%",
      "%sandhills community%",
      "%sandhills cc%",
      "%southeastern community%",
      "%southeastern cc%",
      "%southwestern community%",
      "%southwestern cc%",
      "%surry community%",
      "%surry cc%",
      "%vance-granville community%",
      "%vance-granville cc%",
      "%vance granville%",
      "%wayne community%",
      "%wayne cc%",
      "%western piedmont community%",
      "%western piedmont cc%",
      "%wilkes community%",
      "%wilkes cc%",
    ]

    // Other Division I schools
    const otherDivisionIColleges = [
      "%virginia tech%",
      "%vt%",
      "%virginia%",
      "%uva%",
      "%clemson%",
      "%south carolina%",
      "%usc%",
      "%georgia%",
      "%uga%",
      "%georgia tech%",
      "%gt%",
      "%florida%",
      "%uf%",
      "%florida state%",
      "%fsu%",
      "%tennessee%",
      "%ut%",
      "%kentucky%",
      "%uk%",
      "%ohio state%",
      "%osu%",
      "%penn state%",
      "%psu%",
      "%michigan%",
      "%um%",
      "%michigan state%",
      "%msu%",
      "%iowa%",
      "%iowa state%",
      "%oklahoma%",
      "%ou%",
      "%oklahoma state%",
      "%osu%",
      "%nebraska%",
      "%minnesota%",
      "%wisconsin%",
      "%illinois%",
      "%purdue%",
      "%rutgers%",
      "%maryland%",
      "%indiana%",
      "%northwestern%",
    ]

    // Update Division I schools
    let d1Count = 0
    for (const pattern of divisionIColleges) {
      const { data, error, count } = await supabase
        .from("athletes")
        .update({ division: "Division I", updated_at: new Date().toISOString() })
        .like("college", pattern)

      if (error) {
        console.error(`Error updating Division I schools with pattern ${pattern}:`, error)
      } else {
        d1Count += count || 0
      }
    }

    // Update Division II schools
    let d2Count = 0
    for (const pattern of divisionIIColleges) {
      const { data, error, count } = await supabase
        .from("athletes")
        .update({ division: "Division II", updated_at: new Date().toISOString() })
        .like("college", pattern)

      if (error) {
        console.error(`Error updating Division II schools with pattern ${pattern}:`, error)
      } else {
        d2Count += count || 0
      }
    }

    // Update Division III schools
    let d3Count = 0
    for (const pattern of divisionIIIColleges) {
      const { data, error, count } = await supabase
        .from("athletes")
        .update({ division: "Division III", updated_at: new Date().toISOString() })
        .like("college", pattern)

      if (error) {
        console.error(`Error updating Division III schools with pattern ${pattern}:`, error)
      } else {
        d3Count += count || 0
      }
    }

    // Update NAIA schools
    let naiaCount = 0
    for (const pattern of naiaColleges) {
      const { data, error, count } = await supabase
        .from("athletes")
        .update({ division: "NAIA", updated_at: new Date().toISOString() })
        .like("college", pattern)

      if (error) {
        console.error(`Error updating NAIA schools with pattern ${pattern}:`, error)
      } else {
        naiaCount += count || 0
      }
    }

    // Update NJCAA schools
    let njcaaCount = 0
    for (const pattern of njcaaColleges) {
      const { data, error, count } = await supabase
        .from("athletes")
        .update({ division: "NJCAA", updated_at: new Date().toISOString() })
        .like("college", pattern)

      if (error) {
        console.error(`Error updating NJCAA schools with pattern ${pattern}:`, error)
      } else {
        njcaaCount += count || 0
      }
    }

    // Update other Division I schools
    let otherD1Count = 0
    for (const pattern of otherDivisionIColleges) {
      const { data, error, count } = await supabase
        .from("athletes")
        .update({ division: "Division I", updated_at: new Date().toISOString() })
        .like("college", pattern)

      if (error) {
        console.error(`Error updating other Division I schools with pattern ${pattern}:`, error)
      } else {
        otherD1Count += count || 0
      }
    }

    // Get division counts using raw SQL
    const { data: divisionCounts, error: countError } = await supabase.rpc("get_division_counts")

    if (countError) {
      console.error("Error getting division counts:", countError)
    }

    // Calculate total updated
    const totalUpdated = d1Count + d2Count + d3Count + naiaCount + njcaaCount + otherD1Count

    return NextResponse.json({
      success: true,
      totalUpdated,
      divisionCounts: divisionCounts || [],
      message: `Updated ${totalUpdated} athlete records with correct divisions.`,
    })
  } catch (error) {
    console.error("Error in direct division fix:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
