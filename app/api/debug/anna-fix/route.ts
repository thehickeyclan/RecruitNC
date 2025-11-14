import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Get Anna's records
    const { data: annaRecords, error } = await supabase.from("matches").select("*").ilike("first_name", "%anna%")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("Anna's raw records:", annaRecords)

    // Analyze and potentially fix Anna's data
    const fixes = []

    for (const record of annaRecords || []) {
      const wins = Number.parseInt(record.wins) || 0
      const losses = Number.parseInt(record.losses) || 0
      const totalMatches = Number.parseInt(record.total_matches) || 0

      // Check if total_matches doesn't match wins + losses
      const calculatedTotal = wins + losses

      if (totalMatches !== calculatedTotal && calculatedTotal > 0) {
        console.log(`Fixing Anna's record: ${record.id}`)
        console.log(`  Current: wins=${wins}, losses=${losses}, total=${totalMatches}`)
        console.log(`  Should be: total=${calculatedTotal}`)

        // Update the record
        const { error: updateError } = await supabase
          .from("matches")
          .update({ total_matches: calculatedTotal })
          .eq("id", record.id)

        if (updateError) {
          console.error(`Error updating record ${record.id}:`, updateError)
        } else {
          fixes.push({
            id: record.id,
            old_total: totalMatches,
            new_total: calculatedTotal,
            wins,
            losses,
            season: record.season,
            grade: record.grade,
          })
        }
      }
    }

    return NextResponse.json({
      message: `Fixed ${fixes.length} records for Anna`,
      fixes,
      original_records: annaRecords?.map((r) => ({
        id: r.id,
        season: r.season,
        grade: r.grade,
        wins: r.wins,
        losses: r.losses,
        total_matches: r.total_matches,
      })),
    })
  } catch (error) {
    console.error("Error fixing Anna's data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
