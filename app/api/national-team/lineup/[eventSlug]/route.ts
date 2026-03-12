import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeEventSlugForLookup } from "@/lib/national-team-events"

/** Public lineup for an event: from admin-assigned interest forms (e.g. NHSCA Team 1 / Team 2). No PII. */
export type LineupEntry = {
  first_name: string
  last_name: string
  high_school: string
  graduation_year: string
  primary_weight: string
  team: string
  starter: boolean
}

export type LineupResponse = {
  ok: boolean
  event_slug?: string
  team1?: LineupEntry[]
  team2?: LineupEntry[]
  total?: number
  error?: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> }
): Promise<NextResponse<LineupResponse>> {
  const eventSlug = (await params).eventSlug?.trim() ?? ""
  const normalized = normalizeEventSlugForLookup(eventSlug)
  if (normalized !== "nhsca-duals-2026" && normalized !== "nhsca-2026") {
    return NextResponse.json({ ok: true, event_slug: eventSlug, team1: [], team2: [], total: 0 })
  }

  try {
    const admin = createAdminClient()
    const { data: rows, error } = await admin
      .from("national_team_interest_forms")
      .select("first_name, last_name, high_school, graduation_year, primary_weight, nhsca_duals_team, nhsca_duals_starter")
      .not("nhsca_duals_team", "is", null)
      .in("nhsca_duals_team", ["team_1", "team_2"])

    if (error) {
      if ((error as { code?: string })?.code === "42P01") {
        return NextResponse.json({ ok: true, event_slug: "nhsca-duals-2026", team1: [], team2: [], total: 0 })
      }
      console.warn("[national-team/lineup]", error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const team1: LineupEntry[] = []
    const team2: LineupEntry[] = []
    for (const r of rows ?? []) {
      const row = r as {
        first_name: string
        last_name: string
        high_school: string | null
        graduation_year: string | null
        primary_weight: string | null
        nhsca_duals_team: string | null
        nhsca_duals_starter: boolean
      }
      const entry: LineupEntry = {
        first_name: row.first_name ?? "",
        last_name: row.last_name ?? "",
        high_school: row.high_school ?? "",
        graduation_year: row.graduation_year ?? "",
        primary_weight: row.primary_weight ?? "",
        team: row.nhsca_duals_team === "team_2" ? "Team 2" : "Team 1",
        starter: !!row.nhsca_duals_starter,
      }
      if (row.nhsca_duals_team === "team_2") {
        team2.push(entry)
      } else {
        team1.push(entry)
      }
    }
    const total = team1.length + team2.length
    return NextResponse.json({
      ok: true,
      event_slug: "nhsca-duals-2026",
      team1,
      team2,
      total,
    })
  } catch (e) {
    console.warn("[national-team/lineup]", e)
    return NextResponse.json({ ok: false, error: "Failed to load lineup" }, { status: 500 })
  }
}
