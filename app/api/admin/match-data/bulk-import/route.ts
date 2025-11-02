import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wrestlers } = body

    if (!wrestlers || !Array.isArray(wrestlers)) {
      return NextResponse.json({ error: "Invalid wrestlers data" }, { status: 400 })
    }

    const supabase = createClient()
    let imported = 0
    const errors: string[] = []

    for (const wrestler of wrestlers) {
      try {
        // Extract wrestler info
        const firstName = wrestler.wrestler_name?.split(" ")[0] || ""
        const lastName = wrestler.wrestler_name?.split(" ").slice(1).join(" ") || ""

        // Try to find matching athlete in database
        let athleteId = null
        if (wrestler.wrestler_name) {
          const { data: matchingAthlete } = await supabase
            .from("athletes")
            .select("id")
            .ilike("name", wrestler.wrestler_name)
            .single()

          if (matchingAthlete) {
            athleteId = matchingAthlete.id
          }
        }

        // Calculate stats from matches
        const matches = wrestler.matches || []
        const wins = matches.filter((m: any) => m.result === "W").length
        const losses = matches.filter((m: any) => m.result === "L").length
        const pins = matches.filter(
          (m: any) =>
            (m.decision_type || "").toLowerCase().includes("pin") ||
            (m.decision_type || "").toLowerCase().includes("fall"),
        ).length
        const techFalls = matches.filter((m: any) => (m.decision_type || "").toLowerCase().includes("tech")).length
        const majorDecisions = matches.filter((m: any) =>
          (m.decision_type || "").toLowerCase().includes("major"),
        ).length
        const decisions = matches.filter(
          (m: any) =>
            (m.decision_type || "").toLowerCase().includes("decision") &&
            !(m.decision_type || "").toLowerCase().includes("major"),
        ).length
        const forfeits = matches.filter((m: any) => (m.decision_type || "").toLowerCase().includes("forfeit")).length

        const totalMatches = matches.length
        const pinPercentage = totalMatches > 0 ? ((pins / totalMatches) * 100).toFixed(1) : "0.0"
        const tfPercentage = totalMatches > 0 ? ((techFalls / totalMatches) * 100).toFixed(1) : "0.0"
        const finishingPercentage = totalMatches > 0 ? (((pins + techFalls) / totalMatches) * 100).toFixed(1) : "0.0"

        // Create the match record with athlete_id
        const matchRecord = {
          wrestler_id: wrestler.wrestler_id || null,
          athlete_id: athleteId,
          first_name: firstName,
          last_name: lastName,
          season: wrestler.season_year?.toString() || new Date().getFullYear().toString(),
          grade: "Freshman", // Default to Freshman as specified
          high_school: "Cardinal Gibbons High School", // Default as specified
          total_matches: totalMatches,
          wins: wins,
          losses: losses,
          pins: pins,
          tech_falls: techFalls,
          major_decisions: majorDecisions,
          decisions: decisions,
          forfeits_won: forfeits,
          pin_percentage: pinPercentage,
          tf_percentage: tfPercentage,
          finishing_percentage: finishingPercentage,
          matches: matches,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Insert the match record
        const { error } = await supabase.from("matches").insert([matchRecord])

        if (error) {
          errors.push(`Failed to import ${wrestler.wrestler_name}: ${error.message}`)
        } else {
          imported++
        }
      } catch (error) {
        errors.push(
          `Error processing ${wrestler.wrestler_name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      errors,
      message: `Successfully imported ${imported} wrestlers${errors.length > 0 ? ` with ${errors.length} errors` : ""}`,
    })
  } catch (error) {
    console.error("Bulk import error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
