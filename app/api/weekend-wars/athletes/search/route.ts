import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type AthleteRow = {
  id: string
  name: string | null
  highschool: string | null
  weightclass: string | number | null
  wrestlingClub: string | null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("q") ?? "").trim().slice(0, 80)
    if (query.length < 2) return NextResponse.json({ athletes: [] })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("athletes")
      .select("id, name, highschool, weightclass, wrestlingClub")
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(12)

    if (error) {
      console.error("[weekend-wars/search] athletes", error)
      return NextResponse.json({ error: "Athlete search is temporarily unavailable" }, { status: 500 })
    }

    const athletes = ((data ?? []) as AthleteRow[]).map((athlete) => ({
      id: athlete.id,
      name: athlete.name?.trim() || "Unnamed athlete",
      highSchool: athlete.highschool?.trim() || null,
      weightClass: athlete.weightclass == null ? null : String(athlete.weightclass).trim() || null,
      wrestlingClub: athlete.wrestlingClub?.trim() || null,
    }))

    return NextResponse.json({ athletes })
  } catch (error) {
    console.error("[weekend-wars/search]", error)
    return NextResponse.json({ error: "Athlete search is temporarily unavailable" }, { status: 500 })
  }
}
