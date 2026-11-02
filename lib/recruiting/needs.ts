/**
 * Coach-confirmed recruiting needs (2 Nov 2026): the weights and class years a college staff says
 * it is recruiting, posted in a few taps.
 *
 * What a coach says is a fact. What we infer from a roster is a guess: a graduating senior at 149
 * does not mean an open spot at 149. So a need is only ever what a staff posted, labelled
 * "Coach-confirmed", and kept apart from the roster-room guesses (lib/college-programs/roster-depth).
 * A need is never a scholarship and never a roster spot, and nothing here says it is.
 *
 * A need goes stale. One posted in August and never touched again is not something to show a family
 * in March, so each is dated by when a coach last confirmed it, and after NEED_EXPIRE_DAYS no
 * family sees it. The coach is asked to confirm from NEED_CONFIRM_DAYS.
 *
 * The pure rules live here, so they can be tested; reads and writes are in ./needs-server.ts.
 */
import { COLLEGE_WEIGHTS, WOMENS_COLLEGE_WEIGHTS, projectedCollegeWeights } from "@/lib/program-fit"
import type { CoachProgram, ViewGender } from "@/lib/recruiting/coach-program"

export const NEED_EXPIRE_DAYS = 90
export const NEED_CONFIRM_DAYS = 60

export type ResultsLevel = "any" | "state_placer" | "national_placer" | "nationally_ranked"

export const RESULTS_LEVELS: ReadonlyArray<{ value: ResultsLevel; label: string; short: string }> = [
  { value: "any", label: "Any results", short: "" },
  { value: "state_placer", label: "State placer", short: "State placers" },
  { value: "national_placer", label: "National placer", short: "National placers" },
  { value: "nationally_ranked", label: "Nationally ranked", short: "Nationally ranked" },
]

/** Miles from campus, measured to the centre of the wrestler's home state (no home address is held). */
export const MILES_OPTIONS = [250, 500, 1000] as const

export const GPA_OPTIONS = [2.5, 3.0, 3.5] as const

export type RecruitingNeed = {
  id: string
  schoolId: string | null
  programName: string
  mapSchoolId: string | null
  postedBy: string
  gender: ViewGender
  weight: number
  classYears: number[]
  minGpa: number | null
  maxMiles: number | null
  resultsLevel: ResultsLevel
  confirmedAt: string
  clearedAt: string | null
  createdAt: string
}

export type NeedStatus = "active" | "confirm" | "expired" | "cleared"

const DAY_MS = 86_400_000

export function daysSince(at: string, now: Date = new Date()): number {
  const t = Date.parse(at)
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.floor((now.getTime() - t) / DAY_MS))
}

/** active: shown to families. confirm: still shown, the coach is asked. expired: nobody but the coach sees it. */
export function needStatus(need: Pick<RecruitingNeed, "confirmedAt" | "clearedAt">, now: Date = new Date()): NeedStatus {
  if (need.clearedAt) return "cleared"
  const age = daysSince(need.confirmedAt, now)
  if (age >= NEED_EXPIRE_DAYS) return "expired"
  if (age >= NEED_CONFIRM_DAYS) return "confirm"
  return "active"
}

/** Families see a need only while it is open and confirmed within NEED_EXPIRE_DAYS. */
export function isLiveNeed(need: Pick<RecruitingNeed, "confirmedAt" | "clearedAt">, now: Date = new Date()): boolean {
  const s = needStatus(need, now)
  return s === "active" || s === "confirm"
}

/** "Confirmed today", "Confirmed 12 days ago". */
export function confirmedLabel(confirmedAt: string, now: Date = new Date()): string {
  const d = daysSince(confirmedAt, now)
  if (d === 0) return "Confirmed today"
  if (d === 1) return "Confirmed yesterday"
  return `Confirmed ${d} days ago`
}

export function weightsFor(gender: ViewGender): readonly number[] {
  return gender === "Female" ? WOMENS_COLLEGE_WEIGHTS : COLLEGE_WEIGHTS
}

/** Which programs' needs a coach may post: his program setting; never asked means the list he is viewing. */
export function gendersFor(program: CoachProgram | null, viewing: ViewGender): ViewGender[] {
  if (program === "both") return ["Male", "Female"]
  if (program === "womens") return ["Female"]
  if (program === "mens") return ["Male"]
  return [viewing]
}

export type NeedInput = {
  gender: ViewGender
  weights: number[]
  classYears: number[]
  minGpa: number | null
  maxMiles: number | null
  resultsLevel: ResultsLevel
}

/** What the browser sent, cleaned. Anything not understood is dropped; an error a coach can act on otherwise. */
export function cleanNeedInput(
  raw: unknown,
  allowed: { genders: ViewGender[]; classYears: number[] },
): { ok: true; input: NeedInput } | { ok: false; error: string } {
  const r = (raw ?? {}) as Record<string, unknown>
  const gender = r.gender === "Female" ? "Female" : r.gender === "Male" ? "Male" : null
  if (!gender || !allowed.genders.includes(gender)) return { ok: false, error: "Pick men's or women's." }
  const valid = new Set(weightsFor(gender))
  const weights = [...new Set((Array.isArray(r.weights) ? r.weights : []).map(Number).filter((w) => valid.has(w)))].sort((a, b) => a - b)
  if (!weights.length) return { ok: false, error: "Pick at least one weight." }
  const years = new Set(allowed.classYears)
  const classYears = [...new Set((Array.isArray(r.classYears) ? r.classYears : []).map(Number).filter((y) => years.has(y)))].sort((a, b) => a - b)
  if (!classYears.length) return { ok: false, error: "Pick at least one class year." }
  const gpa = Number(r.minGpa)
  const miles = Number(r.maxMiles)
  const level = RESULTS_LEVELS.find((l) => l.value === r.resultsLevel)?.value ?? "any"
  return {
    ok: true,
    input: {
      gender,
      weights,
      classYears,
      minGpa: Number.isFinite(gpa) && gpa > 0 && gpa <= 5 ? Math.round(gpa * 100) / 100 : null,
      maxMiles: Number.isFinite(miles) && miles >= 50 && miles <= 5000 ? Math.round(miles) : null,
      resultsLevel: level,
    },
  }
}

/**
 * The college weights a wrestler is a candidate for, from the weight he last competed at only -
 * never the weight typed on the profile, which goes stale. No result on file: no weight, no match.
 */
export function collegeWeightsFromCompeted(competedWeight: string | number | null | undefined, gender: ViewGender): number[] {
  if (competedWeight == null || String(competedWeight).trim() === "") return []
  return projectedCollegeWeights({ collegeWeightClass: null, currentWeight: String(competedWeight), gender })?.weights ?? []
}

/** Weight, class and gender: what a family's match is decided on. */
export function needFitsWrestler(
  need: Pick<RecruitingNeed, "gender" | "weight" | "classYears">,
  wrestler: { gender: ViewGender; classYear: number | null; competedWeight: string | number | null },
): boolean {
  if (need.gender !== wrestler.gender) return false
  if (!wrestler.classYear || !need.classYears.includes(wrestler.classYear)) return false
  return collegeWeightsFromCompeted(wrestler.competedWeight, wrestler.gender).includes(need.weight)
}

export type MatchFacts = {
  gpa: number | null
  /** Null when the wrestler's state is unknown. */
  miles: number | null
  statePlacer: boolean
  nationalPlacer: boolean
  nationallyRanked: boolean
}

export type MatchCheck = { key: "gpa" | "miles" | "results"; status: "fit" | "unknown" | "miss"; label: string }

/**
 * The need's optional filters against one wrestler. A fact not on file is "unknown", never a miss:
 * a coach who asked for a 3.0 is not told a wrestler missed it because nobody entered a GPA.
 */
export function checkFilters(need: Pick<RecruitingNeed, "minGpa" | "maxMiles" | "resultsLevel">, f: MatchFacts): MatchCheck[] {
  const out: MatchCheck[] = []
  if (need.minGpa != null) {
    out.push(
      f.gpa == null
        ? { key: "gpa", status: "unknown", label: "GPA not on file" }
        : { key: "gpa", status: f.gpa >= need.minGpa ? "fit" : "miss", label: `GPA ${f.gpa.toFixed(2)}` },
    )
  }
  if (need.maxMiles != null) {
    out.push(
      f.miles == null
        ? { key: "miles", status: "unknown", label: "Home state not on file" }
        : { key: "miles", status: f.miles <= need.maxMiles ? "fit" : "miss", label: `~${f.miles.toLocaleString()} mi` },
    )
  }
  if (need.resultsLevel !== "any") {
    const met =
      need.resultsLevel === "state_placer"
        ? f.statePlacer || f.nationalPlacer || f.nationallyRanked
        : need.resultsLevel === "national_placer"
          ? f.nationalPlacer || f.nationallyRanked
          : f.nationallyRanked
    const label = RESULTS_LEVELS.find((l) => l.value === need.resultsLevel)!.label
    out.push({ key: "results", status: met ? "fit" : "miss", label: met ? label : `Not yet a ${label.toLowerCase()}` })
  }
  return out
}

/** A wrestler stays on a coach's match list unless a filter is missed. */
export const passesFilters = (checks: MatchCheck[]) => !checks.some((c) => c.status === "miss")

/** "149 · Class of 2027 and 2028", for a card. */
export function needHeadline(need: Pick<RecruitingNeed, "weight" | "classYears">): string {
  const ys = [...need.classYears].sort((a, b) => a - b)
  const years = ys.length === 1 ? `Class of ${ys[0]}` : `Classes of ${ys.slice(0, -1).join(", ")} and ${ys[ys.length - 1]}`
  return `${need.weight} · ${years}`
}

/** The filters in short labels: "3.0+ GPA", "Within 500 mi", "State placers". */
export function filterLabels(need: Pick<RecruitingNeed, "minGpa" | "maxMiles" | "resultsLevel">): string[] {
  return [
    need.minGpa != null ? `${need.minGpa.toFixed(1)}+ GPA` : null,
    need.maxMiles != null ? `Within ${need.maxMiles.toLocaleString()} mi` : null,
    RESULTS_LEVELS.find((l) => l.value === need.resultsLevel)?.short || null,
  ].filter((x): x is string => Boolean(x))
}

/** Approximate centre of each state (lat, lng), for "within N miles" when no home address is held. */
export const STATE_CENTRES: Record<string, [number, number]> = {
  AL: [32.8, -86.8], AK: [64.7, -152.0], AZ: [34.3, -111.7], AR: [34.9, -92.4], CA: [37.2, -119.5],
  CO: [39.0, -105.5], CT: [41.6, -72.7], DE: [39.0, -75.5], FL: [28.6, -82.4], GA: [32.7, -83.4],
  HI: [20.8, -156.3], ID: [44.4, -114.6], IL: [40.0, -89.2], IN: [39.9, -86.3], IA: [42.1, -93.5],
  KS: [38.5, -98.4], KY: [37.5, -85.3], LA: [31.1, -92.0], ME: [45.4, -69.2], MD: [39.0, -76.8],
  MA: [42.3, -71.8], MI: [44.3, -85.4], MN: [46.3, -94.3], MS: [32.7, -89.7], MO: [38.4, -92.5],
  MT: [47.0, -109.6], NE: [41.5, -99.8], NV: [39.3, -116.6], NH: [43.7, -71.6], NJ: [40.2, -74.7],
  NM: [34.4, -106.1], NY: [42.9, -75.5], NC: [35.6, -79.4], ND: [47.5, -100.5], OH: [40.3, -82.8],
  OK: [35.6, -97.5], OR: [43.9, -120.6], PA: [40.9, -77.8], RI: [41.7, -71.5], SC: [33.9, -80.9],
  SD: [44.4, -100.2], TN: [35.9, -86.4], TX: [31.5, -99.3], UT: [39.3, -111.7], VT: [44.1, -72.7],
  VA: [37.5, -78.9], WA: [47.4, -120.5], WV: [38.6, -80.6], WI: [44.6, -89.9], WY: [43.0, -107.6],
  DC: [38.9, -77.0],
}

/** Great-circle miles from campus to the centre of a state; null when either end is unknown. */
export function milesToState(campus: [number, number] | null, state: string | null): number | null {
  const centre = state ? STATE_CENTRES[state] : undefined
  if (!campus || !centre) return null
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(centre[0] - campus[0])
  const dLon = rad(centre[1] - campus[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(campus[0])) * Math.cos(rad(centre[0])) * Math.sin(dLon / 2) ** 2
  return Math.round(3958.8 * 2 * Math.asin(Math.sqrt(h)))
}
