import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import { normalizeClubName } from "@/lib/clubs/club-normalize"
import { sanitizeClubWebsite, sanitizeSocialUrl } from "@/lib/clubs/club-submissions"
import { unknownColumnFrom } from "@/lib/clubs/update-club"

export const dynamic = "force-dynamic"

function asString(value: unknown): string {
  return String(value ?? "").trim()
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on"
}

function profileDisplayName(profile: Record<string, unknown> | null, email: string | undefined): string {
  const candidates = [
    profile?.full_name,
    profile?.name,
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" "),
    profile?.display_name,
    email,
  ]
  return candidates.map((value) => String(value ?? "").trim()).find(Boolean) ?? "RecruitNC user"
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to submit a club for review." }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const clubName = asString(body.clubName)
  const address = asString(body.address)
  const city = asString(body.city)
  const state = asString(body.state) || "NC"
  const zipCode = asString(body.zipCode)

  if (clubName.length < 2) {
    return NextResponse.json({ error: "Club name is required." }, { status: 400 })
  }
  // A town is enough to place a pin, and a street address is often genuinely unknown —
  // most clubs rent a school or rec-centre gym and publish no address. Demanding one
  // turned "tell us about your club" into research, so it is optional now.
  if (!address && !city && !zipCode) {
    return NextResponse.json(
      { error: "Tell us where the club trains — a town or ZIP code is enough." },
      { status: 400 },
    )
  }

  const admin = createAdminClientFresh()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("*")
    .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .maybeSingle()

  const payload = {
    submitted_by_user_id: user.id,
    submitted_by_email: user.email ?? null,
    submitted_by_name: profileDisplayName((profile as Record<string, unknown> | null) ?? null, user.email),
    club_name: clubName,
    normalized_name: normalizeClubName(clubName),
    address,
    city: city || null,
    state,
    zip_code: zipCode || null,
    contact_name: asString(body.contactName) || null,
    contact_phone: asString(body.contactPhone) || null,
    contact_email: asString(body.contactEmail) || null,
    website: sanitizeClubWebsite(body.website),
    instagram_url: sanitizeSocialUrl(body.instagramUrl, "instagram"),
    facebook_url: sanitizeSocialUrl(body.facebookUrl, "facebook"),
    has_youth: asBool(body.hasYouth),
    has_middle_school: asBool(body.hasMiddleSchool),
    has_high_school: asBool(body.hasHighSchool),
    has_mens: asBool(body.hasMens),
    has_womens: asBool(body.hasWomens),
    has_freestyle_greco: asBool(body.hasFreestyleGreco),
    notes: asString(body.notes) || null,
    status: "pending",
    updated_at: new Date().toISOString(),
  }

  // Retry without any column this database does not have yet. Postgres rejects the whole
  // insert on one unknown column, so shipping instagram_url ahead of its migration would
  // have failed every public submission — losing details a coach spent time gathering.
  let attempt: Record<string, unknown> = { ...payload }
  let data: { id?: unknown } | null = null
  let error: { code?: string; message: string } | null = null

  for (let i = 0; i < 6; i++) {
    const result = await admin.from("wrestling_club_submissions").insert(attempt).select("id").single()
    data = result.data as { id?: unknown } | null
    error = result.error as { code?: string; message: string } | null
    if (!error) break
    const missing = unknownColumnFrom(error)
    if (!missing || !(missing in attempt)) break
    delete attempt[missing]
    console.warn(`[clubs/submissions] dropping unknown column "${missing}" — run the pending migration`)
  }

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return NextResponse.json(
        {
          error:
            "Club submissions are not enabled yet. Run docs/sql/wrestling-club-map.sql.txt in Supabase, then try again.",
          migrationRequired: true,
        },
        { status: 503 },
      )
    }
    console.error("[clubs/submissions]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.id })
}
