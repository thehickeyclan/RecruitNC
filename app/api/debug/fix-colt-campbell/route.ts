import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Delete ALL existing match records for Colt Campbell to start clean
    await supabase.from("matches").delete().ilike("first_name", "%colt%").ilike("last_name", "%campbell%")
    await supabase.from("matches").delete().eq("wrestler_id", "colt_campbell_001")

    // Create ONLY Colt Campbell's data based on the exact match records you provided
    const coltCampbellSeasons = {
      freshman: {
        season: "2021-22",
        grade: "Freshman",
        total_matches: 62,
        wins: 48,
        losses: 14,
        pins: 23,
        tech_falls: 0,
        decisions: 25,
        major_decisions: 0,
        forfeits_won: 0,
        win_percentage: 77.4,
        matches: [],
      },
      sophomore: {
        season: "2022-23",
        grade: "Sophomore",
        total_matches: 65,
        wins: 60,
        losses: 5,
        pins: 26,
        tech_falls: 3,
        decisions: 31,
        major_decisions: 0,
        forfeits_won: 0,
        win_percentage: 92.3,
        matches: [],
      },
      junior: {
        season: "2023-24",
        grade: "Junior",
        total_matches: 61,
        wins: 61,
        losses: 0,
        pins: 40,
        tech_falls: 2,
        decisions: 19,
        major_decisions: 0,
        forfeits_won: 0,
        win_percentage: 100.0,
        matches: [],
      },
      senior: {
        season: "2024-25",
        grade: "Senior",
        total_matches: 60,
        wins: 60,
        losses: 0,
        pins: 43,
        tech_falls: 12,
        decisions: 5,
        major_decisions: 0,
        forfeits_won: 0,
        win_percentage: 100.0,
        matches: [],
      },
    }

    // Create the clean wrestler record for ONLY Colt Campbell
    const coltWrestlerRecord = {
      wrestler_id: "colt_campbell_001",
      first_name: "Colt",
      last_name: "Campbell",
      high_school: "Hickory Ridge High School",
      wrestler: {
        seasons: coltCampbellSeasons,
      },
    }

    // Insert ONLY Colt's record
    const { data: insertedMatch, error: insertError } = await supabase
      .from("matches")
      .insert([coltWrestlerRecord])
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting Colt's match record:", insertError)
      return NextResponse.json({
        success: false,
        error: `Failed to insert Colt's data: ${insertError.message}`,
      })
    }

    // Update ONLY Colt Campbell's athlete profile
    const { data: updatedAthlete, error: updateError } = await supabase
      .from("athletes")
      .update({
        highschool: "Hickory Ridge High School",
        careerRecord: "229-19",
        achievements: [
          "2x Undefeated State Champion",
          "4x State Finalist",
          "132 Career Pins",
          "Career Record: 229-19",
          "92.3% Win Rate",
        ],
      })
      .eq("name", "Colt Campbell")
      .select()

    if (updateError) {
      console.error("Error updating Colt's athlete profile:", updateError)
    }

    return NextResponse.json({
      success: true,
      message: "Colt Campbell's data has been cleaned and fixed",
      athlete: "Colt Campbell ONLY",
      breakdown: {
        freshman: "48-14 (62 matches, 23 pins, 0 TF) - 77.4%",
        sophomore: "60-5 (65 matches, 26 pins, 3 TF) - 92.3%",
        junior: "61-0 (61 matches, 40 pins, 2 TF) - 100.0%",
        senior: "60-0 (60 matches, 43 pins, 12 TF) - 100.0%",
      },
      totals: {
        record: "229-19",
        totalMatches: 248,
        pins: 132,
        techFalls: 17,
        winPercentage: 92.3,
      },
      insertedRecord: insertedMatch?.wrestler_id || null,
      updatedAthlete: updatedAthlete?.[0]?.name || null,
    })
  } catch (error) {
    console.error("Error in fix-colt-campbell:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
