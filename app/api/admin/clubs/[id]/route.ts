import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { geocodeClub, isInNorthCarolina } from "@/lib/clubs/geocode"

export const dynamic = "force-dynamic"

function asText(value: unknown): string | null {
  const text = String(value ?? "").trim()
  return text ? text : null
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on"
}

/**
 * Save a club and place it on the map.
 *
 * Geocoding happens here rather than being left to the admin, because entering latitude
 * and longitude by hand is why every club so far has had none. Pass `skipGeocode` to keep
 * coordinates that were set deliberately.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await context.params
  if (!id) return NextResponse.json({ error: "Missing club id." }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existing, error: fetchError } = await admin
    .from("wrestling_clubs")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!existing) return NextResponse.json({ error: "Club not found." }, { status: 404 })

  const address = asText(body.address)
  const city = asText(body.city)
  const state = asText(body.state) ?? "NC"
  const zipCode = asText(body.zipCode)

  const patch: Record<string, unknown> = {
    address,
    city,
    state,
    zip_code: zipCode,
    website: asText(body.website),
    contact_phone: asText(body.contactPhone),
    contact_email: asText(body.contactEmail),
    youth_program: asBool(body.youth),
    middle_school_program: asBool(body.middleSchool),
    high_school_program: asBool(body.highSchool),
    boys_program: asBool(body.boys),
    girls_program: asBool(body.girls),
    freestyle_greco: asBool(body.freestyleGreco),
    verified: asBool(body.verified),
    updated_at: new Date().toISOString(),
  }

  if (asText(body.name)) patch.name = asText(body.name)
  if (asText(body.logoUrl) !== null) patch.logo_url = asText(body.logoUrl)

  let geocodeNote: string | null = null

  // Explicit coordinates win — an admin who typed them meant them.
  const manualLat = Number(body.latitude)
  const manualLon = Number(body.longitude)
  const hasManual = Number.isFinite(manualLat) && Number.isFinite(manualLon) && (body.latitude ?? "") !== ""

  if (hasManual) {
    if (!isInNorthCarolina(manualLat, manualLon)) {
      return NextResponse.json({ error: "Those coordinates are outside North Carolina." }, { status: 400 })
    }
    patch.latitude = manualLat
    patch.longitude = manualLon
    geocodeNote = "Used the coordinates you entered."
  } else if (body.skipGeocode !== true && (address || city || zipCode)) {
    const hit = await geocodeClub({ address, city, state, zipCode })
    if (hit) {
      patch.latitude = hit.latitude
      patch.longitude = hit.longitude
      geocodeNote =
        hit.precision === "address"
          ? `Placed at the street address (${hit.provider}).`
          : `No street match — placed at the centre of ${city ?? "the town"}. Add a street address for an exact pin.`
    } else {
      geocodeNote = "Could not find that address, so the pin was left unset."
    }
  }

  const { error } = await admin.from("wrestling_clubs").update(patch).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    geocodeNote,
    latitude: patch.latitude ?? existing.latitude ?? null,
    longitude: patch.longitude ?? existing.longitude ?? null,
  })
}

/** Remove a club record. Its aliases go with it via the FK. */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()
  const { error } = await admin.from("wrestling_clubs").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
