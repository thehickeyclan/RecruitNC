import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Helper to safely parse matches column (can be JSON string or array)
function parseMatchesField(value: unknown): any[] {
  if (!value) return []
  try {
    if (Array.isArray(value)) return value
    if (typeof value === "string") {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    }
    return []
  } catch {
    return []
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: athleteId } = await params

  if (!athleteId) {
    return NextResponse.json({ success: false, error: "Missing athlete id" }, { status: 400 })
  }

  try {
    // 1) Primary: fetch matches that were explicitly linked via athlete_id
    const { data: linkedRows, error: linkedError } = await supabase
      .from("matches")
      .select(
        [
          "id",
          "athlete_id",
          "season",
          "grade",
          "total_matches",
          "wins",
          "losses",
          "pins",
          "tech_falls",
          "decisions",
          "major_decisions",
          "forfeits_won",
          "matches",
          "high_school",
          "first_name",
          "last_name",
          "wrestler_id",
          "created_at",
        ].join(", "),
      )
      .eq("athlete_id", athleteId)
      .order("season", { ascending: false })

    if (linkedError) {
      console.error("matches-direct: error loading linked rows", linkedError)
      return NextResponse.json({ success: false, error: linkedError.message }, { status: 500 })
    }

    let results = linkedRows ?? []

    // Optional fallback: if no rows linked, try name-based exact (case-insensitive) match
    // This is read-only and won't change DB; helps legacy data show up if not linked yet.
    let fallbackUsed = false
    if (!results || results.length === 0) {
      const { data: athlete, error: athleteError } = await supabase
        .from("athletes")
        .select("id, name, firstName, lastName, firstname, lastname")
        .eq("id", athleteId)
        .single()

      if (!athleteError && athlete) {
        const a = athlete as Record<string, unknown>
        const fullName = (athlete.name || "").trim()
        let first = String(a.firstName ?? a.firstname ?? "").trim()
        let last = String(a.lastName ?? a.lastname ?? "").trim()

        if ((!first || !last) && fullName) {
          const parts = fullName.split(/\s+/)
          first = parts[0] || ""
          last = parts.slice(1).join(" ") || ""
        }

        if (first && last) {
          const { data: nameRows, error: nameError } = await supabase
            .from("matches")
            .select(
              [
                "id",
                "athlete_id",
                "season",
                "grade",
                "total_matches",
                "wins",
                "losses",
                "pins",
                "tech_falls",
                "decisions",
                "major_decisions",
                "forfeits_won",
                "matches",
                "high_school",
                "first_name",
                "last_name",
                "wrestler_id",
                "created_at",
              ].join(", "),
            )
            .ilike("first_name", first)
            .ilike("last_name", last)
            .order("season", { ascending: false })

          if (!nameError && nameRows && nameRows.length > 0) {
            results = nameRows
            fallbackUsed = true
          }
        }
      }
    }

    // Normalize/parse matches column to arrays, and shape the response to what the UI expects
    const processed = (results || []).map((row) => ({
      id: row.id,
      season: row.season,
      grade: row.grade,
      total_matches: row.total_matches || 0,
      wins: row.wins || 0,
      losses: row.losses || 0,
      pins: row.pins || 0,
      tech_falls: row.tech_falls || 0,
      decisions: row.decisions || 0,
      major_decisions: row.major_decisions || 0,
      forfeits_won: row.forfeits_won || 0,
      matches: parseMatchesField(row.matches),
      high_school: row.high_school || null,
      meta: {
        athlete_id: row.athlete_id || null,
        first_name: row.first_name || null,
        last_name: row.last_name || null,
        wrestler_id: row.wrestler_id || null,
        created_at: row.created_at || null,
      },
    }))

    return NextResponse.json({
      success: true,
      matches: processed,
      counts: {
        linked: linkedRows?.length || 0,
        totalReturned: processed.length,
      },
      fallbackUsed,
    })
  } catch (err) {
    console.error("matches-direct: unexpected error", err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
