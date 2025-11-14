import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    console.log("Fetching match records from database...")

    // Get all match records from the matches table
    const { data: records, error } = await supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching match records:", error)
      return NextResponse.json(
        {
          error: "Failed to fetch records",
          details: error.message,
          wrestlers: [],
        },
        { status: 500 },
      )
    }

    if (!records || records.length === 0) {
      console.log("No records found in matches table")
      return NextResponse.json({
        wrestlers: [],
        message: "No match records found in database",
        debug: "Database query returned empty result",
      })
    }

    console.log(`Found ${records.length} match records in database`)

    // Log first few records to see structure
    console.log(
      "Sample records:",
      records.slice(0, 3).map((r) => ({
        name: `${r.first_name} ${r.last_name}`,
        season: r.season,
        grade: r.grade,
        wins: r.wins,
        losses: r.losses,
        total_matches: r.total_matches,
      })),
    )

    // Group by wrestler (case-insensitive to handle duplicates)
    const wrestlerGroups = new Map()

    for (const record of records) {
      try {
        console.log(`Processing: ${record.first_name} ${record.last_name} (${record.season})`)

        // Handle individual matches data
        let matchesData = []
        if (record.matches) {
          try {
            matchesData = typeof record.matches === "string" ? JSON.parse(record.matches) : record.matches
            if (!Array.isArray(matchesData)) {
              matchesData = []
            }
          } catch (e) {
            console.error(`Error parsing matches for ${record.first_name}:`, e)
            matchesData = []
          }
        }

        // Create a normalized wrestler key
        const wrestlerKey = `${record.first_name}_${record.last_name}`.toLowerCase().trim()

        if (!wrestlerGroups.has(wrestlerKey)) {
          wrestlerGroups.set(wrestlerKey, {
            first_name: record.first_name,
            last_name: record.last_name,
            high_school: record.high_school || "Unknown",
            seasons: new Map(),
          })
        }

        const wrestler = wrestlerGroups.get(wrestlerKey)

        // Use season + grade as key to prevent duplicates
        const seasonKey = `${record.season || "unknown"}_${record.grade || "unknown"}`.toLowerCase()

        // Only add if we don't already have this season, or if this record is newer
        if (
          !wrestler.seasons.has(seasonKey) ||
          new Date(record.created_at || 0) > new Date(wrestler.seasons.get(seasonKey).created_at || 0)
        ) {
          // Process individual matches if available
          const processedMatches = matchesData.map((match: any) => ({
            opponent: match.opponent || match.opponent_name || "Unknown",
            result: match.result || match.win_loss || "N/A",
            method: match.method || match.decision_type || match.decision || "Decision",
            date: match.date || match.match_date || null,
            tournament: match.tournament || match.venue || match.location || null,
            weight: match.weight || match.weight_class || null,
          }))

          // Get stats from record (these should be the summary stats)
          const wins = Number.parseInt(record.wins) || 0
          const losses = Number.parseInt(record.losses) || 0
          const pins = Number.parseInt(record.pins) || 0
          const techFalls = Number.parseInt(record.tech_falls) || 0
          const decisions = Number.parseInt(record.decisions) || 0
          const majorDecisions = Number.parseInt(record.major_decisions) || 0
          const forfeits = Number.parseInt(record.forfeits_won) || 0
          const totalMatches = Number.parseInt(record.total_matches) || wins + losses

          // FIXED: Proper win percentage calculation
          let winPercentage = 0
          const actualTotal = Math.max(totalMatches, wins + losses)

          if (actualTotal > 0) {
            winPercentage = (wins / actualTotal) * 100
          }

          // Same logic for pin and tech fall percentages
          let pinPercentage = 0
          let tfPercentage = 0

          if (actualTotal > 0) {
            pinPercentage = (pins / actualTotal) * 100
            tfPercentage = (techFalls / actualTotal) * 100
          }

          // Special logging for Anna to debug her stats
          if (record.first_name.toLowerCase().includes("anna")) {
            console.log(`ANNA DEBUG - Raw data:`, {
              wins: record.wins,
              losses: record.losses,
              total_matches: record.total_matches,
              calculated_wins: wins,
              calculated_losses: losses,
              calculated_total: totalMatches,
              actual_total: actualTotal,
              win_percentage: winPercentage,
              season: record.season,
              grade: record.grade,
            })
          }

          console.log(
            `${record.first_name} ${record.last_name} ${record.season}: ${wins}-${losses} (${winPercentage.toFixed(1)}%) - ${pins} pins`,
          )

          wrestler.seasons.set(seasonKey, {
            season: record.season || "Unknown",
            grade: record.grade || "Unknown",
            high_school: record.high_school || "Unknown",
            total_matches: actualTotal,
            wins,
            losses,
            pins,
            tech_falls: techFalls,
            decisions,
            major_decisions: majorDecisions,
            forfeits_won: forfeits,
            pin_percentage: pinPercentage,
            tf_percentage: tfPercentage,
            win_percentage: winPercentage,
            matches: processedMatches,
            created_at: record.created_at,
          })
        }
      } catch (parseError) {
        console.error(`Error parsing record ${record.id}:`, parseError)
        continue
      }
    }

    // Convert to final format and calculate career totals
    const wrestlers = Array.from(wrestlerGroups.values()).map((wrestler) => {
      const seasons = Object.fromEntries(wrestler.seasons)

      // Calculate career totals from seasons
      let careerWins = 0,
        careerLosses = 0,
        careerPins = 0,
        careerTechFalls = 0
      let careerDecisions = 0,
        careerMajorDecisions = 0,
        careerForfeits = 0,
        careerMatches = 0

      Object.values(seasons).forEach((season: any) => {
        careerWins += season.wins
        careerLosses += season.losses
        careerPins += season.pins
        careerTechFalls += season.tech_falls
        careerDecisions += season.decisions
        careerMajorDecisions += season.major_decisions
        careerForfeits += season.forfeits_won
        careerMatches += season.total_matches
      })

      // Fix career percentage calculations
      const careerWinPercentage = careerMatches > 0 ? ((careerWins / careerMatches) * 100).toFixed(1) : "0.0"
      const careerPinPercentage = careerMatches > 0 ? ((careerPins / careerMatches) * 100).toFixed(1) : "0.0"
      const careerTfPercentage = careerMatches > 0 ? ((careerTechFalls / careerMatches) * 100).toFixed(1) : "0.0"

      // Special logging for Anna's career totals
      if (wrestler.first_name.toLowerCase().includes("anna")) {
        console.log(`ANNA CAREER DEBUG:`, {
          career_wins: careerWins,
          career_losses: careerLosses,
          career_matches: careerMatches,
          career_win_percentage: careerWinPercentage,
          seasons_count: Object.keys(seasons).length,
          seasons_data: Object.values(seasons).map((s: any) => ({
            season: s.season,
            wins: s.wins,
            losses: s.losses,
            total: s.total_matches,
            win_pct: s.win_percentage,
          })),
        })
      }

      console.log(
        `Career totals for ${wrestler.first_name} ${wrestler.last_name}: ${careerWins}-${careerLosses} (${careerWinPercentage}%) - ${careerPins} pins`,
      )

      return {
        first_name: wrestler.first_name,
        last_name: wrestler.last_name,
        high_school: wrestler.high_school,
        seasons,
        career_totals: {
          total_matches: careerMatches,
          wins: careerWins,
          losses: careerLosses,
          pins: careerPins,
          tech_falls: careerTechFalls,
          decisions: careerDecisions,
          major_decisions: careerMajorDecisions,
          forfeits_won: careerForfeits,
          pin_percentage: careerPinPercentage,
          tf_percentage: careerTfPercentage,
          win_percentage: careerWinPercentage,
        },
      }
    })

    console.log(`Returning ${wrestlers.length} wrestlers with match data`)

    // Sort wrestlers by total career wins (descending)
    wrestlers.sort((a, b) => b.career_totals.wins - a.career_totals.wins)

    return NextResponse.json({
      wrestlers,
      total_records: records.length,
      processed_wrestlers: wrestlers.length,
      debug: {
        sample_names: wrestlers.slice(0, 5).map((w) => `${w.first_name} ${w.last_name}`),
        total_career_matches: wrestlers.reduce((sum, w) => sum + w.career_totals.total_matches, 0),
      },
    })
  } catch (error) {
    console.error("Error in match records API:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        wrestlers: [],
      },
      { status: 500 },
    )
  }
}
