import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { recordClaimConsent } from "@/lib/profile-claim"
import { notifyProfileClaim } from "@/lib/profile-claim-notify"

/**
 * Claiming a wrestler's profile from the phone.
 *
 * The web has had this for a while at `/api/athletes/claim-profile`, but that route reads the
 * session from cookies, which the app does not have — it carries a bearer token. An app calling
 * it is simply treated as signed out, so this is the same decision behind an endpoint both
 * clients can reach.
 *
 * Two relationships, because they are genuinely different:
 *
 *   self   — sets `claimed_by_user_id`. One owner, and it is the wrestler's.
 *   parent — writes `parent_athlete_links`, which is many-to-many, so a parent with three
 *            wrestlers links all three and never takes the profile off the kid.
 *
 * A profile that already has an owner cannot be claimed again. The parent link stays available
 * either way: a father linking to his son's claimed profile is the normal case, not a conflict.
 */

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const athleteId = String(id ?? "").trim()
  if (!athleteId) return NextResponse.json({ ok: false, error: "Missing athlete id" }, { status: 400 })

  const viewerId = await resolveRequestUserId(request)
  if (!viewerId) return NextResponse.json({ ok: false, error: "Sign in to claim a profile." }, { status: 401 })

  const body = (await request.json().catch(() => null)) as
    | { as?: unknown; graduationYear?: unknown; highSchool?: unknown }
    | null
  const relationship = body?.as === "parent" ? "parent" : body?.as === "self" ? "self" : null
  if (!relationship) {
    return NextResponse.json({ ok: false, error: 'Say whether this is "self" or "parent".' }, { status: 400 })
  }

  const admin = createAdminClient()

  /* For the alert: who claimed it, in the same shape the website sends. */
  const { data: viewerProfile } = await admin
    .from("user_profiles")
    .select("email")
    .eq("user_id", viewerId)
    .maybeSingle()
  const viewerEmail = (viewerProfile as { email?: string } | null)?.email ?? null

  const { data: athlete, error: loadError } = await admin
    .from("athletes")
    .select("id, name, claimed_by_user_id")
    .eq("id", athleteId)
    .maybeSingle()

  if (loadError || !athlete) {
    return NextResponse.json({ ok: false, error: "That profile does not exist." }, { status: 404 })
  }

  /*
   * The create-profile wizard ends here when the wrestler was already on file. What it asked
   * (class, high school) fills the profile's blanks - only blanks: an import or an earlier edit
   * that set them is not overwritten by a claim. Imports of girls' results left 113 NC profiles
   * with no class year, invisible to every class filter.
   */
  const fillBlanks = async () => {
    const year = Number(body?.graduationYear)
    if (Number.isInteger(year) && year >= 2020 && year <= 2040) {
      await admin.from("athletes").update({ graduationyear: year }).eq("id", athleteId).is("graduationyear", null)
    }
    const school = typeof body?.highSchool === "string" ? body.highSchool.trim() : ""
    if (school.length >= 2 && school.length <= 80) {
      await admin.from("athletes").update({ highschool: school }).eq("id", athleteId).or("highschool.is.null,highschool.eq.")
    }
  }

  if (relationship === "parent") {
    // Read then insert rather than upsert: there is no unique constraint on the pair, so an
    // onConflict target would be rejected. Same shape the Blue registration uses.
    const { data: existing } = await admin
      .from("parent_athlete_links")
      .select("id")
      .eq("user_id", viewerId)
      .eq("athlete_id", athleteId)
      .maybeSingle()

    if (!existing) {
      const { error } = await admin
        .from("parent_athlete_links")
        .insert({ user_id: viewerId, athlete_id: athleteId })
      if (error) {
        console.error("[mobile] parent link failed:", error.message)
        return NextResponse.json({ ok: false, error: "Could not link that athlete." }, { status: 500 })
      }
    }
    if (!existing) {
      await notifyProfileClaim({
        athleteId,
        athleteName: String(athlete.name ?? "Athlete"),
        relationship: "parent",
        claimantName: null,
        claimantEmail: viewerEmail,
        previousOwnerUserId: null,
      })
      await recordClaimConsent(admin, {
        userId: viewerId,
        athleteId,
        relationship: "parent",
        athleteName: athlete.name ?? null,
        ip: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      })
    }
    await fillBlanks()
    return NextResponse.json({
      ok: true,
      relationship,
      athleteName: athlete.name ?? null,
      already: Boolean(existing),
    })
  }

  if (athlete.claimed_by_user_id) {
    if (String(athlete.claimed_by_user_id) === viewerId) {
      return NextResponse.json({ ok: true, relationship, athleteName: athlete.name ?? null, already: true })
    }
    return NextResponse.json(
      { ok: false, error: "Someone has already claimed this profile. Contact us if that is wrong." },
      { status: 409 },
    )
  }

  const { error } = await admin
    .from("athletes")
    .update({ claimed_by_user_id: viewerId, claimed_at: new Date().toISOString() })
    .eq("id", athleteId)
    // Nobody else claimed it in the moment between the read above and this write.
    .is("claimed_by_user_id", null)

  if (error) {
    console.error("[mobile] claim failed:", error.message)
    return NextResponse.json({ ok: false, error: "Could not claim that profile." }, { status: 500 })
  }

  await fillBlanks()

  /* The website has told somebody about every claim for months; the app told nobody. */
  await notifyProfileClaim({
    athleteId,
    athleteName: String(athlete.name ?? "Athlete"),
    relationship: "self",
    claimantName: null,
    claimantEmail: viewerEmail,
    previousOwnerUserId: null,
  })
  await recordClaimConsent(admin, {
    userId: viewerId,
    athleteId,
    relationship: "self",
    athleteName: athlete.name ?? null,
    ip: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  })

  return NextResponse.json({ ok: true, relationship, athleteName: athlete.name ?? null })
}
