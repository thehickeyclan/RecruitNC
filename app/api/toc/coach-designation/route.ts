import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { getPublicAnnouncedWeight } from "@/lib/toc/public-announced-field"
import { verifyAthleteToken } from "@/lib/toc/coach-link"
import {
  dedupeIncoming,
  fitsWithinCap,
  validateCoachDesignation,
  type CoachDesignation,
} from "@/lib/toc/coach-designation"

/**
 * A family naming their wrestler's corner coaches.
 *
 * Reached only with the signed link we email to that family. The signature is checked here as
 * well as on the page, because a page gate stops nobody from posting straight to this route.
 *
 * It writes with the service role because the table is closed to anonymous reads — a list of
 * every coach and the wrestlers they corner is not something to leave readable.
 */

export const dynamic = "force-dynamic"

/** Announced athletes only. An unannounced weight is not a roster anyone outside should be probing. */
async function findAnnouncedAthlete(
  athleteId: string,
): Promise<{ name: string; weightClass: number } | null> {
  for (const weightClass of TOC_WEIGHT_CLASSES) {
    const weight = await getPublicAnnouncedWeight(weightClass)
    const hit = weight?.athletes.find((a) => a.athleteId === athleteId)
    if (hit) return { name: hit.name, weightClass }
  }
  return null
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    athleteId?: unknown
    token?: unknown
    coaches?: unknown
  } | null

  const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : ""
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  if (!athleteId) return NextResponse.json({ error: "Choose a wrestler." }, { status: 400 })

  // The page gate would be decoration on its own: anyone can post to this route directly. The
  // signature is what ties a submission to the family we sent the link to.
  if (!verifyAthleteToken(athleteId, token)) {
    return NextResponse.json(
      { error: "This link is not valid. Use the personal link from your email." },
      { status: 403 },
    )
  }

  const rawCoaches = Array.isArray(body?.coaches) ? body.coaches : []
  if (rawCoaches.length === 0) {
    return NextResponse.json({ error: "Add at least one coach." }, { status: 400 })
  }

  const coaches: CoachDesignation[] = []
  for (const raw of rawCoaches) {
    const parsed = validateCoachDesignation(raw as Record<string, unknown>)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    coaches.push(parsed.value)
  }
  const incoming = dedupeIncoming(coaches)

  const athlete = await findAnnouncedAthlete(athleteId)
  if (!athlete) {
    return NextResponse.json({ error: "That wrestler is not in an announced weight class." }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data: existing, error: readError } = await admin
    .from("toc_coach_designations")
    .select("coach_key")
    .eq("athlete_id", athleteId)

  if (readError) {
    console.error("[toc coach] read existing:", readError.message)
    return NextResponse.json({ error: "Could not save that right now." }, { status: 500 })
  }

  // The cap lives here rather than in the database: the unique constraint is per pair, so a
  // family returning a second time could otherwise add a third coach one visit at a time.
  const cap = fitsWithinCap((existing ?? []).map((r) => String(r.coach_key)), incoming)
  if (!cap.ok) return NextResponse.json({ error: cap.error }, { status: 409 })

  const now = new Date().toISOString()
  const { error: writeError } = await admin.from("toc_coach_designations").upsert(
    incoming.map((coach) => ({
      athlete_id: athleteId,
      athlete_name: athlete.name,
      weight_class: athlete.weightClass,
      coach_name: coach.coachName,
      coach_email: coach.coachEmail,
      coach_phone: coach.coachPhone,
      relationship: coach.relationship,
      coach_key: coach.coachKey,
      updated_at: now,
    })),
    { onConflict: "athlete_id,coach_key" },
  )

  if (writeError) {
    console.error("[toc coach] save:", writeError.message)
    return NextResponse.json({ error: "Could not save that right now." }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    athlete: athlete.name,
    weightClass: athlete.weightClass,
    saved: incoming.length,
  })
}
