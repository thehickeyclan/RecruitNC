import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { WEEKEND_WARS_EVENT_SLUG } from "@/lib/weekend-wars"

export const dynamic = "force-dynamic"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const cleanOptional = (value: unknown, max: number) => {
  const cleaned = String(value ?? "").trim().slice(0, max)
  return cleaned || null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const athleteId = String(body.athleteId ?? "").trim()
    const attendingSaturday = body.attendingSaturday === true
    const attendingSunday = body.attendingSunday === true
    const openToCarpool = body.openToCarpool

    if (!UUID_PATTERN.test(athleteId)) {
      return NextResponse.json({ ok: false, error: "Choose your RecruitNC athlete profile" }, { status: 400 })
    }
    if (!attendingSaturday && !attendingSunday) {
      return NextResponse.json({ ok: false, error: "Select Saturday, Sunday, or both" }, { status: 400 })
    }
    if (typeof openToCarpool !== "boolean") {
      return NextResponse.json({ ok: false, error: "Answer the carpool question" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: athlete, error: athleteError } = await admin
      .from("athletes")
      .select("id, name, highschool, weightclass, wrestlingClub")
      .eq("id", athleteId)
      .maybeSingle()

    if (athleteError) {
      console.error("[weekend-wars/rsvp] lookup", athleteError)
      return NextResponse.json({ ok: false, error: "Unable to verify the athlete profile" }, { status: 500 })
    }
    if (!athlete) {
      return NextResponse.json({ ok: false, error: "RecruitNC athlete profile not found" }, { status: 404 })
    }

    const payload = {
      event_slug: WEEKEND_WARS_EVENT_SLUG,
      athlete_id: athleteId,
      athlete_name: String(athlete.name ?? "").trim() || "Unnamed athlete",
      weight_class: cleanOptional(body.weightClass, 40) ?? cleanOptional(athlete.weightclass, 40),
      high_school: cleanOptional(body.highSchool, 160) ?? cleanOptional(athlete.highschool, 160),
      wrestling_club: cleanOptional(body.wrestlingClub, 160) ?? cleanOptional(athlete.wrestlingClub, 160),
      attending_saturday: attendingSaturday,
      attending_sunday: attendingSunday,
      open_to_carpool: openToCarpool,
      updated_at: new Date().toISOString(),
    }

    const { error } = await admin
      .from("nc_united_practice_rsvps")
      .upsert(payload, { onConflict: "event_slug,athlete_id" })

    if (error) {
      console.error("[weekend-wars/rsvp] save", error)
      if (error.code === "42P01") {
        return NextResponse.json(
          { ok: false, error: "RSVPs are not open yet. Please try again shortly." },
          { status: 503 },
        )
      }
      return NextResponse.json({ ok: false, error: "Unable to save the RSVP" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, athleteName: payload.athlete_name })
  } catch (error) {
    console.error("[weekend-wars/rsvp]", error)
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 })
  }
}
