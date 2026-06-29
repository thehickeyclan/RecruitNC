import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { toAthleteWithInvitation } from "@/lib/toc/invitation-service"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

/** Load athlete profile + invitation for verification step. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Athlete id required" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: athlete, error: athleteError } = await admin.from("athletes").select("*").eq("id", id).maybeSingle()

    if (athleteError) {
      console.error("[toc/athletes/[id]]", athleteError)
      return NextResponse.json({ error: athleteError.message }, { status: 500 })
    }
    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    const { data: invitation, error: invError } = await admin
      .from("toc_invitations")
      .select("*")
      .eq("athlete_id", id)
      .maybeSingle()

    if (invError?.code === "42P01") {
      return NextResponse.json({ error: "Invitations not configured yet" }, { status: 503 })
    }
    if (invError) {
      console.error("[toc/athletes/[id]]", invError)
      return NextResponse.json({ error: invError.message }, { status: 500 })
    }

    return NextResponse.json(toAthleteWithInvitation(athlete as Record<string, unknown>, invitation))
  } catch (e) {
    console.error("[toc/athletes/[id]]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
