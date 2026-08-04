import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Driving time from one point to a set of clubs.
 *
 * "8 miles away" is straight-line, which reads as closer than it is — Charlotte to Nags
 * Head is 296 miles in a straight line and about 400 by road. A parent is choosing a room
 * they will drive to twice a week, so minutes are the number that matters.
 *
 * Mapbox's Matrix API is metered, so this is deliberately frugal: one request covers up to
 * 24 destinations, and the caller sends only the nearest handful (already ranked by the
 * free straight-line calculation) rather than all 51 clubs. Roughly 24 elements per
 * lookup against a 100,000/month allowance.
 *
 * Failure is never fatal — the caller keeps showing straight-line miles.
 */

const MAX_DESTINATIONS = 24

type Body = {
  origin?: { lat?: number; lon?: number }
  destinations?: Array<{ id?: string; lat?: number; lon?: number }>
}

export async function POST(request: Request) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
  if (!token) {
    return NextResponse.json({ durations: {}, unavailable: true })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const originLat = Number(body.origin?.lat)
  const originLon = Number(body.origin?.lon)
  if (!Number.isFinite(originLat) || !Number.isFinite(originLon)) {
    return NextResponse.json({ error: "Missing origin." }, { status: 400 })
  }

  const destinations = (body.destinations ?? [])
    .filter((d) => Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lon)) && d.id)
    .slice(0, MAX_DESTINATIONS)

  if (!destinations.length) return NextResponse.json({ durations: {} })

  // Matrix wants lon,lat pairs with the origin first, then asks for row 0 only.
  const coordinates = [
    `${originLon},${originLat}`,
    ...destinations.map((d) => `${Number(d.lon)},${Number(d.lat)}`),
  ].join(";")

  const url =
    `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordinates}` +
    `?sources=0&annotations=duration&access_token=${encodeURIComponent(token)}`

  try {
    const response = await fetch(url)
    if (!response.ok) return NextResponse.json({ durations: {}, unavailable: true })

    const payload = (await response.json()) as { durations?: number[][] }
    const row = payload.durations?.[0]
    if (!row) return NextResponse.json({ durations: {}, unavailable: true })

    // row[0] is the origin to itself; destinations start at index 1.
    const durations: Record<string, number> = {}
    destinations.forEach((destination, index) => {
      const seconds = row[index + 1]
      if (typeof seconds === "number" && Number.isFinite(seconds)) {
        durations[String(destination.id)] = Math.round(seconds / 60)
      }
    })

    return NextResponse.json({ durations })
  } catch {
    return NextResponse.json({ durations: {}, unavailable: true })
  }
}
