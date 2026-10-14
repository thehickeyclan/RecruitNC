/**
 * The picture of the college map on the Command Center (Matt, 13 Oct 2026): a still of the real
 * map, with the real dots, that opens the map when tapped.
 *
 * It is drawn from the program list, not a screenshot. A screenshot goes stale the day a program
 * is added, and it shows every family the same dots; this one shows the family's own - women's
 * programs for a daughter, and the colleges they have saved ringed in gold.
 *
 * The backdrop is a Mapbox still of the continental United States. The dots are placed with the
 * same projection Mapbox uses (Web Mercator, 512-pixel tiles), so they sit where the live map puts
 * them. Alaska, Hawaii, Canada and Puerto Rico fall outside the frame and are counted, not drawn.
 */
import { COLLEGE_DIVISIONS, DIVISION_COLOR, primaryDivision, type CollegeDivision, type CollegeMapSchool } from "@/lib/college-programs/types"

export const PREVIEW = { width: 720, height: 400, centerLon: -95.7, centerLat: 38.6, zoom: 3 } as const

const worldSize = (zoom: number) => 512 * 2 ** zoom
const mercatorX = (lon: number, zoom: number) => ((lon + 180) / 360) * worldSize(zoom)
const mercatorY = (lat: number, zoom: number) => {
  const rad = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * worldSize(zoom)
}

/** Where a place falls in the picture, in pixels from its top-left corner. */
export function projectToPreview(longitude: number, latitude: number, view: typeof PREVIEW = PREVIEW): { x: number; y: number } {
  return {
    x: mercatorX(longitude, view.zoom) - mercatorX(view.centerLon, view.zoom) + view.width / 2,
    y: mercatorY(latitude, view.zoom) - mercatorY(view.centerLat, view.zoom) + view.height / 2,
  }
}

export type PreviewDot = { id: string; x: number; y: number; color: string; saved: boolean }

export type MapPreview = {
  dots: PreviewDot[]
  /** Colleges counted, including the few outside the frame. */
  total: number
  byDivision: Array<{ division: CollegeDivision; count: number; color: string }>
  backdropUrl: string | null
}

export function buildMapPreview(
  schools: CollegeMapSchool[],
  options: { team?: "mens" | "womens" | null; savedIds?: Iterable<string>; accessToken?: string | null } = {},
): MapPreview {
  const { team = null } = options
  const saved = new Set(options.savedIds ?? [])
  // A daughter's family sees the colleges with a women's team; a saved college always shows.
  const shown = schools.filter((s) => saved.has(s.id) || !team || s.programs.some((p) => p[team]))
  const divisionOf = (s: CollegeMapSchool) => (team ? s.programs.find((p) => p[team])?.division : null) ?? primaryDivision(s)

  const dots = shown
    .map((s) => ({ id: s.id, ...projectToPreview(s.longitude, s.latitude), color: DIVISION_COLOR[divisionOf(s)], saved: saved.has(s.id) }))
    .filter((d) => d.x >= 0 && d.x <= PREVIEW.width && d.y >= 0 && d.y <= PREVIEW.height)
    // Saved colleges are drawn last so their ring is never under another dot.
    .sort((a, b) => Number(a.saved) - Number(b.saved))

  const token = options.accessToken?.trim()
  return {
    dots,
    total: shown.length,
    byDivision: COLLEGE_DIVISIONS.map((division) => ({ division, count: shown.filter((s) => divisionOf(s) === division).length, color: DIVISION_COLOR[division] })).filter((d) => d.count > 0),
    backdropUrl: token
      ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${PREVIEW.centerLon},${PREVIEW.centerLat},${PREVIEW.zoom},0/${PREVIEW.width}x${PREVIEW.height}@2x?access_token=${encodeURIComponent(token)}`
      : null,
  }
}
