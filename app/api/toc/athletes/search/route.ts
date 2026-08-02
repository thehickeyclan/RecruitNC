import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { mapAthleteRow, matchesAthleteNameSearch } from "@/lib/toc/invitation-service"

export const dynamic = "force-dynamic"

type InvitationJoinRow = {
  athlete_id: string
  status: string
  weight_class: number
  athletes: Record<string, unknown> | Record<string, unknown>[] | null
}

/** Private TOC invitation search — do not expose invited/confirmed rosters publicly. */
export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, athletes: [] }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("q") ?? "").trim()
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 10)

    if (query.length < 2) {
      return NextResponse.json({ athletes: [] })
    }

    const admin = createAdminClient()

    const { data: rows, error: invError } = await admin
      .from("toc_invitations")
      .select("athlete_id, status, weight_class, athletes(id, name, photourl, graduationyear, weightclass, highschool)")
      .in("status", ["invited", "confirmed"])

    if (invError) {
      if (invError.code === "42P01") {
        return NextResponse.json({
          athletes: [],
          unavailable: true,
          error: "Invitations are not configured yet. Contact NC United.",
        })
      }
      console.error("[toc/athletes/search]", invError)
      return NextResponse.json({ error: "Search unavailable" }, { status: 500 })
    }

    const invitedRows = rows ?? []
    const athletes = invitedRows
      .map((row) => {
        const inv = row as InvitationJoinRow
        const athleteRaw = Array.isArray(inv.athletes) ? inv.athletes[0] : inv.athletes
        if (!athleteRaw || typeof athleteRaw !== "object") return null

        const athlete = mapAthleteRow(athleteRaw as Record<string, unknown>)
        if (!matchesAthleteNameSearch(athlete.name, query)) return null

        return {
          id: athlete.id,
          name: athlete.name,
          school: athlete.highschool,
          graduationYear: athlete.graduationyear,
          weightClass: athlete.weightclass,
          invitationStatus: inv.status,
          invitedWeightClass: inv.weight_class,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit)

    return NextResponse.json({ athletes, invitedCount: invitedRows.length })
  } catch (e) {
    console.error("[toc/athletes/search]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
