import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function normalizeAthleteId(value: string): string {
  const trimmed = (value || "").trim()
  const slug = trimmed.split("?")[0].split("#")[0]
  const parts = slug.split("/").filter(Boolean)
  const candidate = parts.length ? parts[parts.length - 1] : trimmed
  const uuidMatch = candidate.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)
  return uuidMatch ? uuidMatch[0] : candidate.replace(/^\/+|\/+$/g, "")
}

function isValidUuid(id: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)
}

export async function POST(request: NextRequest) {
  try {
    const { athleteId, matchIds } = await request.json()

    const normalizedId = normalizeAthleteId(athleteId)

    if (!normalizedId || !isValidUuid(normalizedId) || !matchIds || !Array.isArray(matchIds) || matchIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Invalid request data: athleteId must be a UUID and matchIds must be a non-empty array.",
      })
    }

    // Update the matches to link them to the athlete
    const { data, error } = await supabase
      .from("matches")
      .update({ athlete_id: normalizedId })
      .in("id", matchIds)
      .select()

    if (!error && (!data || data.length === 0)) {
      console.warn("Link-athlete-matches: no rows updated for", { normalizedId, matchIds })
    }

    if (error) {
      console.error("Error linking matches:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
      })
    }

    return NextResponse.json({
      success: true,
      linkedMatches: data?.length || 0,
      matches: data,
    })
  } catch (error) {
    console.error("Link matches error:", error)
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
