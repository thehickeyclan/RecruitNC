/**
 * Address → coordinates for club records.
 *
 * Clubs are useless on the map without a position, and nothing in the app geocoded
 * anything, so every approved club landed with null coordinates and drew no pin.
 *
 * Mapbox is preferred (it is already paid for and handles partial US addresses well);
 * Nominatim is the fallback so this still works if the token is absent. Both are queried
 * server-side only — never expose a geocode endpoint to the public, it is billable.
 */

export type GeocodeResult = {
  latitude: number
  longitude: number
  /** How precise the match is. City-level pins should not be presented as the real gym. */
  precision: "address" | "city" | "unknown"
  label: string
  provider: "mapbox" | "nominatim"
}

/** North Carolina, generously bounded. A result outside this is a bad match, not a club. */
const NC_BOUNDS = { minLat: 33.7, maxLat: 36.7, minLon: -84.4, maxLon: -75.4 }

export function isInNorthCarolina(lat: number, lon: number): boolean {
  return lat >= NC_BOUNDS.minLat && lat <= NC_BOUNDS.maxLat && lon >= NC_BOUNDS.minLon && lon <= NC_BOUNDS.maxLon
}

/**
 * Submitted addresses often already contain the city/state/zip, so appending them again
 * produces "6109 Maddry Oaks Ct Raleigh, NC 27616, Raleigh, NC, 27616", which geocoders
 * reject outright. Only add a part that is not already present.
 */
export function buildGeocodeQuery(parts: {
  address?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
}): string {
  const address = String(parts.address ?? "").replace(/\s+/g, " ").trim()
  const pieces = [address]
  const lower = address.toLowerCase()

  for (const extra of [parts.city, parts.state ?? "NC", parts.zipCode]) {
    const value = String(extra ?? "").trim()
    if (!value) continue
    if (lower.includes(value.toLowerCase())) continue
    pieces.push(value)
  }

  return pieces.filter(Boolean).join(", ")
}

async function geocodeWithMapbox(query: string, token: string): Promise<GeocodeResult | null> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${encodeURIComponent(token)}&country=us&limit=1&types=address,place,postcode,poi`
  const response = await fetch(url)
  if (!response.ok) return null

  const body = (await response.json()) as { features?: Array<{ center?: [number, number]; place_name?: string; place_type?: string[] }> }
  const feature = body.features?.[0]
  if (!feature?.center) return null

  const [longitude, latitude] = feature.center
  const type = feature.place_type?.[0]
  return {
    latitude,
    longitude,
    precision: type === "address" || type === "poi" ? "address" : type === "place" || type === "postcode" ? "city" : "unknown",
    label: feature.place_name ?? query,
    provider: "mapbox",
  }
}

async function geocodeWithNominatim(query: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&addressdetails=1&q=${encodeURIComponent(query)}`
  const response = await fetch(url, { headers: { "User-Agent": "RecruitNC-club-geocode/1.0 (support@ncunited.org)" } })
  if (!response.ok) return null

  const body = (await response.json()) as Array<{ lat: string; lon: string; display_name: string; addresstype?: string }>
  const hit = body[0]
  if (!hit) return null

  return {
    latitude: Number(hit.lat),
    longitude: Number(hit.lon),
    precision: hit.addresstype === "building" || hit.addresstype === "road" ? "address" : "city",
    label: hit.display_name,
    provider: "nominatim",
  }
}

/**
 * Geocode a club. Falls back from the full address to city+state, so a club that only
 * knows its town still gets a usable pin instead of none at all.
 */
export async function geocodeClub(parts: {
  address?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
}): Promise<GeocodeResult | null> {
  const hasAddress = Boolean(String(parts.address ?? "").trim())

  // With nothing but the state, the query degrades to "NC" and resolves to the centre of
  // North Carolina — a confident-looking pin in a field. Refuse rather than invent one.
  if (!hasAddress && !String(parts.city ?? "").trim() && !String(parts.zipCode ?? "").trim()) {
    return null
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
  const attempts = [buildGeocodeQuery(parts)]

  // Only fall back to the town when we actually know one. Falling back to the state alone
  // resolves to the centre of North Carolina, which would drop a pin in a field for every
  // club whose address we could not read — worse than returning nothing.
  const city = String(parts.city ?? "").trim()
  const zip = String(parts.zipCode ?? "").trim()
  if (city || zip) {
    const cityOnly = [city, parts.state ?? "NC", zip].filter(Boolean).join(", ")
    if (!attempts.includes(cityOnly)) attempts.push(cityOnly)
  }

  for (const query of attempts) {
    if (!query) continue
    let result: GeocodeResult | null = null
    try {
      result = token ? await geocodeWithMapbox(query, token) : null
      if (!result) result = await geocodeWithNominatim(query)
    } catch {
      result = null
    }
    if (!result) continue
    if (!Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) continue
    // A match outside North Carolina means the geocoder latched onto the wrong place.
    if (!isInNorthCarolina(result.latitude, result.longitude)) continue
    // Only a first-attempt match on a real street address counts as address-precise;
    // the town fallback never does, whatever the provider reports.
    const addressPrecise = query === attempts[0] && hasAddress && result.precision === "address"
    return { ...result, precision: addressPrecise ? "address" : "city" }
  }

  return null
}

/**
 * Clubs sharing a city centroid land on the exact same point, where clustering can never
 * separate them — click to expand and they stay one dot forever. Nudge each onto a small
 * ring so every club is selectable. Derived from the id so a pin never moves between loads.
 */
export function jitterForSharedLocation(seed: string, index: number, total: number): { dLat: number; dLon: number } {
  if (total <= 1) return { dLat: 0, dLon: 0 }
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  const angle = ((index / total) * Math.PI * 2) + (Math.abs(hash) % 360) * (Math.PI / 180)
  const radius = 0.012 // roughly 1.3km — separates pins by zoom 12 without moving the town
  return { dLat: radius * Math.sin(angle), dLon: radius * Math.cos(angle) }
}
