import { NextResponse } from "next/server"
import { geocodeClub } from "@/lib/clubs/geocode"

export const dynamic = "force-dynamic"

/**
 * ZIP → coordinates for the "clubs near me" search.
 *
 * Server-side on purpose. Doing this from the browser meant depending on the public Mapbox
 * token being present in the bundle, so the ZIP box failed silently anywhere it was not —
 * and it reuses the geocoder that already falls back to Nominatim and rejects anything
 * outside North Carolina.
 *
 * Deliberately narrow: five digits only. This is not a general geocoding proxy.
 */
export async function GET(request: Request) {
  const zip = (new URL(request.url).searchParams.get("zip") ?? "").trim()

  if (!/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: "Enter a 5-digit ZIP code." }, { status: 400 })
  }

  const hit = await geocodeClub({ zipCode: zip, state: "NC" })
  if (!hit) {
    return NextResponse.json({ error: "We couldn't find that ZIP code in North Carolina." }, { status: 404 })
  }

  return NextResponse.json({ latitude: hit.latitude, longitude: hit.longitude })
}
