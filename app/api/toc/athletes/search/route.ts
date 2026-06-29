import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { mapAthleteRow } from "@/lib/toc/invitation-service"

export const dynamic = "force-dynamic"

/** Public athlete search for TOC confirmation — only athletes with an active invitation. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("q") ?? "").trim()
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 10)

    if (query.length < 2) {
      return NextResponse.json({ athletes: [] })
    }

    const admin = createAdminClient()

    const { data: invitations, error: invError } = await admin
      .from("toc_invitations")
      .select("athlete_id, status, weight_class")
      .in("status", ["invited", "confirmed"])

    if (invError) {
      if (invError.code === "42P01") {
        return NextResponse.json({ athletes: [], unavailable: true })
      }
      console.error("[toc/athletes/search]", invError)
      return NextResponse.json({ error: "Search unavailable" }, { status: 500 })
    }

    const invitedIds = [...new Set((invitations ?? []).map((i) => i.athlete_id))]
    if (invitedIds.length === 0) {
      return NextResponse.json({ athletes: [] })
    }

    const { data: athletes, error } = await admin
      .from("athletes")
      .select("id, name, photourl, graduationyear, weightclass, highschool, wrestling_club, wrestlingClub")
      .in("id", invitedIds)
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(limit)

    if (error) {
      console.error("[toc/athletes/search]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const statusByAthlete = new Map(
      (invitations ?? []).map((i) => [i.athlete_id, { status: i.status, weightClass: i.weight_class }]),
    )

    const results = (athletes ?? []).map((row) => {
      const athlete = mapAthleteRow(row as Record<string, unknown>)
      const invite = statusByAthlete.get(athlete.id)
      return {
        id: athlete.id,
        name: athlete.name,
        school: athlete.highschool,
        graduationYear: athlete.graduationyear,
        weightClass: athlete.weightclass,
        invitationStatus: invite?.status ?? null,
        invitedWeightClass: invite?.weightClass ?? null,
      }
    })

    return NextResponse.json({ athletes: results })
  } catch (e) {
    console.error("[toc/athletes/search]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
