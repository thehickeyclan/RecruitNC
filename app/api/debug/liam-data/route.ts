import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get all Liam records
    const { data: records, error } = await supabase
      .from("matches")
      .select("*")
      .or("wrestler_id.ilike.%liam%,first_name.ilike.%liam%")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching Liam data:", error)
      return NextResponse.json({ error: "Failed to fetch Liam data" }, { status: 500 })
    }

    if (!records || records.length === 0) {
      return NextResponse.json({
        error: "No Liam data found",
        totalRecords: 0,
        records: [],
        debug_info: {
          message: "No records found for Liam",
          note: "Check if data has been uploaded",
        },
      })
    }

    // Group by season and detect duplicates
    const seasonGroups: { [key: string]: any[] } = {}
    const wrestlerIds: string[] = []

    records.forEach((record) => {
      const seasonKey = `${record.season}_${record.grade}`.toLowerCase()
      if (!seasonGroups[seasonKey]) {
        seasonGroups[seasonKey] = []
      }
      seasonGroups[seasonKey].push(record)
      if (!wrestlerIds.includes(record.wrestler_id)) {
        wrestlerIds.push(record.wrestler_id)
      }
    })

    // Check for duplicates
    const duplicates = Object.entries(seasonGroups).filter(([_, records]) => records.length > 1)
    const hasDuplicates = duplicates.length > 0

    // Analyze each record
    const analysis = []
    const careerFromStored = { wins: 0, losses: 0, pins: 0 }
    const careerFromMatches = { wins: 0, losses: 0, pins: 0 }

    for (const record of records) {
      try {
        // Parse stored totals
        const storedTotals = {
          total_matches: record.total_matches || 0,
          wins: record.wins || 0,
          losses: record.losses || 0,
          pins: record.pins || 0,
          record: `${record.wins || 0}-${record.losses || 0}`,
        }

        // Parse individual matches
        let individualMatches = []
        if (record.individual_matches) {
          try {
            individualMatches =
              typeof record.individual_matches === "string"
                ? JSON.parse(record.individual_matches)
                : record.individual_matches
          } catch (e) {
            console.error("Error parsing individual matches:", e)
          }
        }

        // Calculate totals from individual matches
        let calculatedWins = 0
        let calculatedLosses = 0
        let calculatedPins = 0

        if (Array.isArray(individualMatches)) {
          individualMatches.forEach((match) => {
            const result = match.result || match.win_loss || ""
            const method = match.method || match.decision || ""

            if (result.toUpperCase() === "W") {
              calculatedWins++
              if (method.toLowerCase().includes("fall") || method.toLowerCase().includes("pin")) {
                calculatedPins++
              }
            } else if (result.toUpperCase() === "L") {
              calculatedLosses++
            }
          })
        }

        const calculatedTotals = {
          total_matches: calculatedWins + calculatedLosses,
          wins: calculatedWins,
          losses: calculatedLosses,
          pins: calculatedPins,
          record: `${calculatedWins}-${calculatedLosses}`,
        }

        // Check for mismatch
        const hasMismatch =
          storedTotals.wins !== calculatedTotals.wins ||
          storedTotals.losses !== calculatedTotals.losses ||
          storedTotals.pins !== calculatedTotals.pins

        // Sample matches
        const sampleMatches = Array.isArray(individualMatches)
          ? individualMatches.slice(0, 3).map((match) => ({
              opponent: match.opponent || "Unknown",
              result: match.result || match.win_loss || "N/A",
              method: match.method || match.decision || "N/A",
              date: match.date || "N/A",
              venue: match.venue || match.tournament || match.location || null,
              weight: match.weight || null,
            }))
          : []

        analysis.push({
          id: record.id,
          wrestler_id: record.wrestler_id,
          season: record.season,
          grade: record.grade,
          created_at: record.created_at,
          storedTotals,
          calculatedTotals,
          hasMismatch,
          sampleMatches,
          totalMatches: Array.isArray(individualMatches) ? individualMatches.length : 0,
        })

        // Add to career totals
        careerFromStored.wins += storedTotals.wins
        careerFromStored.losses += storedTotals.losses
        careerFromStored.pins += storedTotals.pins

        careerFromMatches.wins += calculatedTotals.wins
        careerFromMatches.losses += calculatedTotals.losses
        careerFromMatches.pins += calculatedTotals.pins
      } catch (error) {
        console.error("Error analyzing record:", error)
        analysis.push({
          id: record.id,
          wrestler_id: record.wrestler_id,
          season: record.season,
          grade: record.grade,
          created_at: record.created_at,
          error: "Failed to analyze this record",
        })
      }
    }

    return NextResponse.json({
      totalRecords: records.length,
      analysis,
      hasDuplicates,
      duplicates: duplicates.map(([key, records]) => ({
        key,
        records: records.map((r) => ({
          id: r.id,
          created_at: r.created_at,
          wrestler_id: r.wrestler_id,
        })),
      })),
      wrestlerIds,
      careerFromStored,
      careerFromMatches,
      debug_info: {
        message: "Liam data analysis complete",
        note: "This shows stored totals vs calculated totals from individual matches",
      },
    })
  } catch (error) {
    console.error("Error in Liam data debug:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
