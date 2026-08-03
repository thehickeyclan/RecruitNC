import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import { normalizeClubName } from "@/lib/clubs/club-normalize"
import { sanitizeClubWebsite, sanitizeSocialUrl } from "@/lib/clubs/club-submissions"

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
  if (address.length < 6) {
    return NextResponse.json({ error: "A street address is required so the club can be mapped." }, { status: 400 })
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

  const { data, error } = await admin
    .from("wrestling_club_submissions")
    .insert(payload)
    .select("id")
    .single()

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
