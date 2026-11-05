/**
 * Where each state stands, for the coverage map on the home page (Matt, 5 Nov 2026: "add a map to
 * home page on the states that are finalized a mintued.. we should turn green").
 *
 * Four stages, and the line between them is what a family or a coach would actually notice:
 *
 *   live     - open to the public. The state picker offers it and its profiles are reachable.
 *   ready    - every profile minted and the bout ledger two-sided, but not switched on yet.
 *              Nothing is missing that a visitor would see; it is waiting on a decision.
 *   building - results are in and profiles are being minted. Real but incomplete.
 *   planned  - nothing held yet.
 *
 * `ready` is deliberately not called "done". A state can pass every data gate and still be thin:
 * Tennessee passes all of them with 194 profiles against South Carolina's 784, because its
 * qualifier rows carry no class years. The map shows the count beside the colour so nobody reads
 * green as "as good as North Carolina".
 */
import { RECRUITING_BRAND } from "@/lib/recruiting/brand"

export type CoverageStage = "live" | "ready" | "building" | "planned"

export type StateCoverage = {
  code: string
  name: string
  stage: CoverageStage
  profiles: number
  lon: number
  lat: number
}

/*
 * "Ready to open" was the first wording and it was a claim we cannot back. It put 27 states in
 * that bucket, Tennessee among them - a state that passes every data gate with 194 profiles while
 * South Carolina has 784. The data being built is not the same as the state being worth opening,
 * and the home page is read by families and coaches who would take the stronger word literally.
 */
export const STAGE_LABEL: Record<CoverageStage, string> = {
  live: "Live",
  ready: "Data built",
  building: "In progress",
  planned: "Coming",
}

/** Tailwind-free so the same values serve the SVG and the legend. */
export const STAGE_COLOR: Record<CoverageStage, string> = {
  live: "#22c55e",
  ready: "#eab308",
  building: "#94a3b8",
  // Light enough to read against the dark map: at #334155 the states still to come vanished
  // entirely, which made the map look finished when a third of the country is not started.
  planned: "#64748b",
}

/** Roughly the middle of each state, for placing its marker. */
export const STATE_CENTER: Record<string, { lon: number; lat: number; name: string }> = {
  AL: { lon: -86.8, lat: 32.8, name: "Alabama" }, AK: { lon: -152.0, lat: 64.0, name: "Alaska" },
  AZ: { lon: -111.7, lat: 34.3, name: "Arizona" }, AR: { lon: -92.4, lat: 34.9, name: "Arkansas" },
  CA: { lon: -119.7, lat: 37.2, name: "California" }, CO: { lon: -105.5, lat: 39.0, name: "Colorado" },
  CT: { lon: -72.7, lat: 41.6, name: "Connecticut" }, DE: { lon: -75.5, lat: 39.0, name: "Delaware" },
  FL: { lon: -81.7, lat: 28.6, name: "Florida" }, GA: { lon: -83.4, lat: 32.6, name: "Georgia" },
  HI: { lon: -157.0, lat: 20.8, name: "Hawaii" }, ID: { lon: -114.6, lat: 44.4, name: "Idaho" },
  IL: { lon: -89.2, lat: 40.0, name: "Illinois" }, IN: { lon: -86.3, lat: 39.9, name: "Indiana" },
  IA: { lon: -93.5, lat: 42.0, name: "Iowa" }, KS: { lon: -98.4, lat: 38.5, name: "Kansas" },
  KY: { lon: -85.3, lat: 37.5, name: "Kentucky" }, LA: { lon: -92.0, lat: 31.1, name: "Louisiana" },
  ME: { lon: -69.2, lat: 45.3, name: "Maine" }, MD: { lon: -76.8, lat: 39.0, name: "Maryland" },
  MA: { lon: -71.8, lat: 42.3, name: "Massachusetts" }, MI: { lon: -85.0, lat: 44.3, name: "Michigan" },
  MN: { lon: -94.3, lat: 46.3, name: "Minnesota" }, MS: { lon: -89.7, lat: 32.7, name: "Mississippi" },
  MO: { lon: -92.5, lat: 38.4, name: "Missouri" }, MT: { lon: -109.6, lat: 47.0, name: "Montana" },
  NE: { lon: -99.8, lat: 41.5, name: "Nebraska" }, NV: { lon: -116.6, lat: 39.3, name: "Nevada" },
  NH: { lon: -71.6, lat: 43.7, name: "New Hampshire" }, NJ: { lon: -74.7, lat: 40.2, name: "New Jersey" },
  NM: { lon: -106.1, lat: 34.4, name: "New Mexico" }, NY: { lon: -75.5, lat: 42.9, name: "New York" },
  NC: { lon: -79.4, lat: 35.5, name: "North Carolina" }, ND: { lon: -100.5, lat: 47.4, name: "North Dakota" },
  OH: { lon: -82.8, lat: 40.3, name: "Ohio" }, OK: { lon: -97.5, lat: 35.6, name: "Oklahoma" },
  OR: { lon: -120.6, lat: 43.9, name: "Oregon" }, PA: { lon: -77.8, lat: 40.9, name: "Pennsylvania" },
  RI: { lon: -71.5, lat: 41.7, name: "Rhode Island" }, SC: { lon: -80.9, lat: 33.9, name: "South Carolina" },
  SD: { lon: -100.3, lat: 44.4, name: "South Dakota" }, TN: { lon: -86.4, lat: 35.8, name: "Tennessee" },
  TX: { lon: -99.3, lat: 31.4, name: "Texas" }, UT: { lon: -111.7, lat: 39.3, name: "Utah" },
  VT: { lon: -72.6, lat: 44.1, name: "Vermont" }, VA: { lon: -78.8, lat: 37.5, name: "Virginia" },
  WA: { lon: -120.5, lat: 47.4, name: "Washington" }, WV: { lon: -80.6, lat: 38.6, name: "West Virginia" },
  WI: { lon: -89.6, lat: 44.3, name: "Wisconsin" }, WY: { lon: -107.3, lat: 43.0, name: "Wyoming" },
}

/**
 * A state is `ready` when every wrestler it can mint has a profile. The gap report computes that
 * ceiling properly from placer rows; here it is approximated by "has profiles and is not live",
 * because the home page must not run a thirty-state scan to draw a picture. The profile count is
 * shown alongside, which is the number that actually tells you how substantial a state is.
 */
export function buildCoverage(profilesByState: Record<string, number>): StateCoverage[] {
  const registered = new Map(RECRUITING_BRAND.states.map((s: any) => [s.code, s]))
  return Object.entries(STATE_CENTER).map(([code, place]) => {
    const entry = registered.get(code) as { live?: boolean } | undefined
    const profiles = profilesByState[code] ?? 0
    const stage: CoverageStage = entry?.live ? "live" : !entry ? "planned" : profiles >= 50 ? "ready" : profiles > 0 ? "building" : "planned"
    return { code, name: place.name, stage, profiles, lon: place.lon, lat: place.lat }
  })
}

export function coverageSummary(rows: StateCoverage[]) {
  const by = (s: CoverageStage) => rows.filter((r) => r.stage === s)
  return {
    live: by("live").length,
    ready: by("ready").length,
    building: by("building").length,
    profiles: rows.reduce((n, r) => n + r.profiles, 0),
  }
}
