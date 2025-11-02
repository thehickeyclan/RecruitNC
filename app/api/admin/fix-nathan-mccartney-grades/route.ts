import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    console.log("Starting Nathan McCartney grade correction...")

    // First, let's find all Nathan McCartney match records
    const { data: nathanRecords, error: findError } = await supabase
      .from("matches")
      .select("*")
      .or("first_name.ilike.%nathan%,wrestler_id.ilike.%nathan%")
      .or("last_name.ilike.%mccartney%,wrestler_id.ilike.%mccartney%")

    if (findError) {
      console.error("Error finding Nathan's records:", findError)
      return NextResponse.json({ error: "Failed to find Nathan's records" }, { status: 500 })
    }

    console.log(`Found ${nathanRecords?.length || 0} potential Nathan McCartney records`)

    if (!nathanRecords || nathanRecords.length === 0) {
      return NextResponse.json({ error: "No Nathan McCartney records found" }, { status: 404 })
    }

    // Filter for exact matches
    const exactMatches = nathanRecords.filter((record) => {
      const firstName = (record.first_name || "").toLowerCase().trim()
      const lastName = (record.last_name || "").toLowerCase().trim()
      const wrestlerId = (record.wrestler_id || "").toLowerCase()

      return (
        (firstName === "nathan" && lastName === "mccartney") ||
        (wrestlerId.includes("nathan") && wrestlerId.includes("mccartney"))
      )
    })

    console.log(`Found ${exactMatches.length} exact Nathan McCartney matches`)

    const updates = []
    const gradeCorrections = {
      "2022-23": "Sophomore",
      "2023-24": "Junior",
      "2024-25": "Senior",
    }

    // Process each record and apply corrections
    for (const record of exactMatches) {
      const season = record.season
      const currentGrade = record.grade
      const correctGrade = gradeCorrections[season as keyof typeof gradeCorrections]

      if (correctGrade && currentGrade !== correctGrade) {
        console.log(`Updating record ${record.id}: ${season} from "${currentGrade}" to "${correctGrade}"`)

        const { error: updateError } = await supabase
          .from("matches")
          .update({ grade: correctGrade })
          .eq("id", record.id)

        if (updateError) {
          console.error(`Error updating record ${record.id}:`, updateError)
          updates.push({
            id: record.id,
            season,
            status: "error",
            error: updateError.message,
            from: currentGrade,
            to: correctGrade,
          })
        } else {
          updates.push({
            id: record.id,
            season,
            status: "success",
            from: currentGrade,
            to: correctGrade,
          })
        }
      } else if (correctGrade) {
        updates.push({
          id: record.id,
          season,
          status: "no_change",
          current: currentGrade,
          expected: correctGrade,
        })
      }
    }

    const successCount = updates.filter((u) => u.status === "success").length
    const errorCount = updates.filter((u) => u.status === "error").length
    const noChangeCount = updates.filter((u) => u.status === "no_change").length

    return NextResponse.json({
      success: true,
      message: `Nathan McCartney grade correction completed`,
      summary: {
        totalRecords: exactMatches.length,
        updated: successCount,
        errors: errorCount,
        noChange: noChangeCount,
      },
      corrections: gradeCorrections,
      updates,
    })
  } catch (error) {
    console.error("Error in Nathan McCartney grade correction:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
