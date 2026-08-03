import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { geocodeClub } from "@/lib/clubs/geocode"
import { sanitizeClubWebsite, sanitizeSocialUrl } from "@/lib/clubs/club-submissions"
import { updateClubTolerantOfMissingColumns } from "@/lib/clubs/update-club"

export const dynamic = "force-dynamic"

function asText(value: unknown): string | null {
  const text = String(value ?? "").trim()
  return text ? text : null
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on"
}

/** Clubs this user has an APPROVED claim on. A pending claim grants nothing. */
async function approvedClubIds(userId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("club_claims")
    .select("club_id")
    .eq("user_id", userId)
    .eq("status", "approved")
  if (error) return []
  return (data ?? []).map((row) => String((row as { club_id?: unknown }).club_id))
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in to manage a club." }, { status: 401 })

  const ids = await approvedClubIds(user.id)
  if (!ids.length) return NextResponse.json({ clubs: [] })

  const admin = createAdminClient()
  const { data, error } = await admin.from("wrestling_clubs").select("*").in("id", ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    clubs: (data ?? []).map((club) => {
      const row = club as Record<string, unknown>
      return {
        id: String(row.id),
        name: String(row.name ?? ""),
        address: (row.address as string | null) ?? null,
        city: (row.city as string | null) ?? null,
        state: (row.state as string | null) ?? "NC",
        zipCode: (row.zip_code as string | null) ?? null,
        website: (row.website as string | null) ?? null,
        instagramUrl: (row.instagram_url as string | null) ?? null,
        facebookUrl: (row.facebook_url as string | null) ?? null,
        contactPhone: (row.contact_phone as string | null) ?? null,
        contactEmail: (row.contact_email as string | null) ?? null,
        logoUrl: (row.logo_url as string | null) ?? null,
        verified: Boolean(row.verified),
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        programs: {
          youth: Boolean(row.youth_program),
          middleSchool: Boolean(row.middle_school_program),
          highSchool: Boolean(row.high_school_program),
          boys: Boolean(row.boys_program),
          girls: Boolean(row.girls_program),
          freestyleGreco: Boolean(row.freestyle_greco),
        },
      }
    }),
  })
}

/**
 * A claimant editing their own club.
 *
 * Deliberately narrower than the admin editor: address, contact, socials, logo and
 * programs only. `verified`, the club name and aliases are what make a listing
 * authoritative and stay admin-only — otherwise an approved claimant could rename a club
 * into someone else's identity and mark it verified.
 */
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in to manage a club." }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const clubId = String(body.clubId ?? "").trim()
  if (!clubId) return NextResponse.json({ error: "Missing club." }, { status: 400 })

  const allowed = await approvedClubIds(user.id)
  if (!allowed.includes(clubId)) {
    return NextResponse.json({ error: "You do not manage that club." }, { status: 403 })
  }

  const address = asText(body.address)
  const city = asText(body.city)
  const zipCode = asText(body.zipCode)

  const patch: Record<string, unknown> = {
    address,
    city,
    zip_code: zipCode,
    state: "NC",
    website: sanitizeClubWebsite(body.website),
    instagram_url: sanitizeSocialUrl(body.instagramUrl, "instagram"),
    facebook_url: sanitizeSocialUrl(body.facebookUrl, "facebook"),
    contact_phone: asText(body.contactPhone),
    contact_email: asText(body.contactEmail),
    youth_program: asBool(body.youth),
    middle_school_program: asBool(body.middleSchool),
    high_school_program: asBool(body.highSchool),
    boys_program: asBool(body.boys),
    girls_program: asBool(body.girls),
    freestyle_greco: asBool(body.freestyleGreco),
    updated_at: new Date().toISOString(),
  }

  let geocodeNote: string | null = null
  if (address || city || zipCode) {
    const hit = await geocodeClub({ address, city, state: "NC", zipCode })
    if (hit) {
      patch.latitude = hit.latitude
      patch.longitude = hit.longitude
      geocodeNote =
        hit.precision === "address"
          ? "Pin placed at your street address."
          : `No street match — pin placed at the centre of ${city ?? "your town"}. Add a street address for an exact pin.`
    } else {
      geocodeNote = "We could not find that address, so the pin was left where it was."
    }
  }

  const admin = createAdminClient()
  // Tolerant of columns whose migration has not run yet — otherwise one unknown column
  // rejects the whole UPDATE and the coach loses their edit.
  const { error } = await updateClubTolerantOfMissingColumns(admin, clubId, patch)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Once someone outside the admin team can change a listing, "who changed this" stops
  // being optional. Failures here must not block the save.
  try {
    await admin.from("club_edit_log").insert({
      club_id: clubId,
      user_id: user.id,
      user_email: user.email ?? null,
      actor_role: "claimant",
      changed_fields: patch,
    })
  } catch {
    /* audit log is best-effort */
  }

  return NextResponse.json({ ok: true, geocodeNote })
}
