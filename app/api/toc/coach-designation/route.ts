import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { getPublicAnnouncedWeight } from "@/lib/toc/public-announced-field"
import {
  dedupeIncoming,
  fitsWithinCap,
  validateCoachDesignation,
  type CoachDesignation,
} from "@/lib/toc/coach-designation"

/**
 * A family naming their wrestler's corner coaches.
 *
 * The wrestler is chosen from the whole RecruitNC directory rather than the TOC field: a search
 * limited to invited athletes would answer "is this wrestler going to TOC?" for anyone who typed
 * a name, so it searches everybody and reveals nothing about the field.
 *
 * Club and date of birth, where a family supplies them, are held on the designation for review
 * rather than written to the athlete record. This form is public, and a public form that can
 * overwrite a child's details is not one worth having.
 *
 * It writes with the service role because the table is closed to anonymous reads — a list of
 * every coach and the wrestlers they corner is not something to leave readable.
 */

export const dynamic = "force-dynamic"

/**
 * The athlete, from the whole directory rather than the TOC field.
 *
 * Their weight class is filled in when they happen to be in an announced weight, so the check-in
 * list can group by it — but a designation for somebody not in the field is accepted and simply
 * reviewed. Refusing those would turn this form into a way to ask "is my kid in the TOC yet?".
 */
async function findAthlete(athleteId: string): Promise<{ name: string; weightClass: number | null } | null> {
  const admin = createAdminClient()
  const { data } = await admin.from("athletes").select("id, name").eq("id", athleteId).maybeSingle()
  if (!data) return null

  for (const weightClass of TOC_WEIGHT_CLASSES) {
    const weight = await getPublicAnnouncedWeight(weightClass)
    if (weight?.athletes.some((a) => a.athleteId === athleteId)) {
      return { name: data.name ?? "", weightClass }
    }
  }
  return { name: data.name ?? "", weightClass: null }
}

/**
 * The key this person is already filed under, if any.
 *
 * A coach's key is minted from whatever the family in front of us happened to know — an account if
 * the email matched one, otherwise the email, otherwise the phone. Three families knowing three
 * different details produced three coaches: Nick Kostoff arrived as `tel:5134907421`,
 * `nicholas.kostoff@gmail.com` and `user:ef08098a…`, and approving him for one wrestler left the
 * other two pending with no way to see it.
 *
 * So before minting anything, look for the same human already in the table — by phone first, since
 * that is the detail families most often share, then by email. Reusing that key makes the second
 * family's submission land on the first family's coach.
 */
async function existingCoachKey(
  admin: ReturnType<typeof createAdminClient>,
  coach: { coachEmail: string | null; phoneKey: string | null },
): Promise<string | null> {
  const filters: string[] = []
  if (coach.phoneKey) filters.push(`coach_phone_key.eq.${coach.phoneKey}`)
  if (coach.coachEmail) filters.push(`coach_email.eq.${coach.coachEmail.toLowerCase()}`)
  if (filters.length === 0) return null

  const { data, error } = await admin
    .from("toc_coach_designations")
    .select("coach_key, coach_phone_key, coach_email, created_at")
    .or(filters.join(","))
    .order("created_at", { ascending: true })
    .limit(1)

  if (error) {
    console.error("[toc coach] existing key lookup:", error.message)
    return null
  }
  const row = (data ?? [])[0] as { coach_key?: string | null } | undefined
  return row?.coach_key?.trim() || null
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    athleteId?: unknown
    coaches?: unknown
    submittedClub?: unknown
    submittedDob?: unknown
  } | null

  const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : ""
  if (!athleteId) return NextResponse.json({ error: "Choose a wrestler." }, { status: 400 })

  const rawCoaches = Array.isArray(body?.coaches) ? body.coaches : []
  if (rawCoaches.length === 0) {
    return NextResponse.json({ error: "Add at least one coach." }, { status: 400 })
  }

  const admin = createAdminClient()

  // A coach the family picked from our own directory: we hold their details, so the form never
  // sent them and never saw them. Resolve the id here instead.
  const chosenIds = rawCoaches
    .map((c) => (c && typeof (c as { knownUserId?: unknown }).knownUserId === "string"
      ? String((c as { knownUserId: string }).knownUserId)
      : null))
    .filter(Boolean) as string[]

  const knownById = new Map<string, { full_name: string | null; email: string | null; cell_phone: string | null }>()
  if (chosenIds.length > 0) {
    const { data: people } = await admin
      .from("user_profiles")
      .select("user_id, full_name, email, cell_phone")
      .in("user_id", chosenIds)
    for (const p of people ?? []) knownById.set(p.user_id, p)
  }

  const coaches: CoachDesignation[] = []
  for (const raw of rawCoaches) {
    const entry = raw as Record<string, unknown>
    const knownUserId = typeof entry.knownUserId === "string" ? entry.knownUserId : null
    const known = knownUserId ? knownById.get(knownUserId) : null

    const parsed = validateCoachDesignation(
      known
        ? {
            coachName: entry.coachName || known.full_name,
            coachEmail: known.email,
            coachPhone: known.cell_phone,
          }
        : entry,
    )
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    // Keyed on the person, so the same coach picked by two families is one coach whichever
    // detail each of them happened to know.
    const minted = known && knownUserId ? { ...parsed.value, coachKey: `user:${knownUserId}` } : parsed.value
    // Whatever we would have minted, an existing filing for the same person wins.
    const alreadyFiled = await existingCoachKey(admin, {
      coachEmail: minted.coachEmail,
      phoneKey: minted.phoneKey,
    })
    coaches.push(alreadyFiled ? { ...minted, coachKey: alreadyFiled } : minted)
  }
  const incoming = dedupeIncoming(coaches)

  const athlete = await findAthlete(athleteId)
  if (!athlete) return NextResponse.json({ error: "We could not find that wrestler." }, { status: 404 })

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
      coach_phone_key: coach.phoneKey,
      submitted_club: typeof body?.submittedClub === "string" && body.submittedClub.trim()
        ? body.submittedClub.trim()
        : null,
      submitted_dob: typeof body?.submittedDob === "string" && body.submittedDob.trim()
        ? body.submittedDob.trim()
        : null,
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
