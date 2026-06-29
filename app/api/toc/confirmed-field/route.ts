import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/** Public confirmed field — RLS allows status=confirmed reads; service role for athlete join. */
export async function GET() {
  try {
    const admin = createAdminClient()

    const { data: invitations, error } = await admin
      .from("toc_invitations")
      .select("id, athlete_id, weight_class, seed, confirmed_at")
      .eq("status", "confirmed")
      .order("weight_class")
      .order("confirmed_at")

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ field: [] })
      }
      console.error("[toc/confirmed-field]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const athleteIds = [...new Set((invitations ?? []).map((i) => i.athlete_id))]
    if (athleteIds.length === 0) {
      return NextResponse.json({ field: [] })
    }

    const { data: athletes, error: athleteError } = await admin
      .from("athletes")
      .select("id, name, highschool, graduationyear, photourl")
      .in("id", athleteIds)

    if (athleteError) {
      console.error("[toc/confirmed-field]", athleteError)
      return NextResponse.json({ error: athleteError.message }, { status: 500 })
    }

    const athleteById = new Map((athletes ?? []).map((a) => [a.id, a]))

    const field = (invitations ?? []).map((inv) => {
      const athlete = athleteById.get(inv.athlete_id)
      return {
        weightClass: inv.weight_class,
        seed: inv.seed,
        confirmedAt: inv.confirmed_at,
        athlete: athlete
          ? {
              id: athlete.id,
              name: athlete.name,
              school: athlete.highschool,
              graduationYear: athlete.graduationyear,
              photoUrl: athlete.photourl,
            }
          : null,
      }
    })

    return NextResponse.json({ field })
  } catch (e) {
    console.error("[toc/confirmed-field]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
