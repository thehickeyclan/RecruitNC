/**
 * Coach-confirmed recruiting needs: reads and writes (rules in ./needs.ts).
 *
 * Three readers:
 * - the coach's needs page (loadProgramNeeds, loadNeedMatches),
 * - the family's "Programs recruiting your weight and class" (loadNeedsForAthlete), free,
 * - the family "what changed this week" feed, which calls loadNeedsForAthlete too, with `since`.
 *
 * A family sees a need only when it is live (confirmed in the last NEED_EXPIRE_DAYS) and was
 * posted by a coach staff have approved - the same bar as messaging. A sign-up claiming to be a
 * coach does not get to tell families a program is recruiting their son.
 */
import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { unstable_cache } from "next/cache"

import { familyAthleteIds, isApprovedCoach } from "@/lib/coach-messages"
import { isInternalAccount } from "@/lib/internal-accounts"
import { currentClassYears } from "@/lib/class-years"
import { loadAthleteCredentialsBatch, ALL_AMERICAN_PLACES, type AthleteCredentials } from "@/lib/credentials/athlete-credentials"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import programs from "@/lib/college-programs/programs-2026-27.json"
import { DIVISION_SHORT, type CollegeMapSchool } from "@/lib/college-programs/types"
import { bannerNationalRankingLabel, getCurrentNationalRankingsForAthlete, type NationalRanking } from "@/lib/national-rankings"
import { loadLastCompeted } from "@/lib/prospect-last-competed"
import { getPublicRankingsMax, isPublicRankingsYearPublished, rankingLabel } from "@/lib/public-rankings-cap"
import { liveStates } from "@/lib/recruiting/brand"
import { athleteStateCode, inState } from "@/lib/recruiting/states"
import {
  NEED_EXPIRE_DAYS,
  checkFilters,
  collegeWeightsFromCompeted,
  isLiveNeed,
  milesToState,
  passesFilters,
  type MatchCheck,
  type NeedInput,
  type RecruitingNeed,
  type ResultsLevel,
} from "@/lib/recruiting/needs"
import type { ViewGender } from "@/lib/recruiting/coach-program"
import { demoFamilyNeeds, demoProgramNeeds, isDemoNeeds } from "@/lib/recruiting/demo-needs"

const TABLE = "college_recruiting_needs"
const TABLE_MISSING = "42P01"
const COLUMNS = "id, school_id, program_name, map_school_id, posted_by, gender, weight, class_years, min_gpa, max_miles, results_level, confirmed_at, cleared_at, created_at"

const SCHOOLS = new Map([...(programs.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS].map((s) => [s.id, s]))

type Row = Record<string, unknown>

function toNeed(r: Row): RecruitingNeed {
  return {
    id: String(r.id),
    schoolId: (r.school_id as string | null) ?? null,
    programName: String(r.program_name ?? ""),
    mapSchoolId: (r.map_school_id as string | null) ?? null,
    postedBy: String(r.posted_by),
    gender: r.gender === "Female" ? "Female" : "Male",
    weight: Number(r.weight),
    classYears: ((r.class_years as number[] | null) ?? []).map(Number),
    minGpa: r.min_gpa == null ? null : Number(r.min_gpa),
    maxMiles: r.max_miles == null ? null : Number(r.max_miles),
    resultsLevel: (r.results_level as ResultsLevel) ?? "any",
    confirmedAt: String(r.confirmed_at),
    clearedAt: (r.cleared_at as string | null) ?? null,
    createdAt: String(r.created_at),
  }
}

/** The map school a need belongs to: division (for this gender's team) and campus. */
export function needSchool(need: Pick<RecruitingNeed, "mapSchoolId" | "gender">): {
  name: string
  division: string | null
  city: string | null
  state: string | null
  campus: [number, number] | null
} | null {
  const s = need.mapSchoolId ? SCHOOLS.get(need.mapSchoolId) : undefined
  if (!s) return null
  const program = s.programs.find((p) => (need.gender === "Female" ? p.womens : p.mens)) ?? s.programs[0]
  return {
    name: s.name.replace(/\s*\([^)]*\)\s*/g, " ").trim(),
    division: program ? DIVISION_SHORT[program.division] : null,
    city: s.city ?? null,
    state: s.state ?? null,
    campus: Number.isFinite(s.latitude) && Number.isFinite(s.longitude) ? [s.latitude, s.longitude] : null,
  }
}

// ---- the coach's own needs

export type ProgramKey = { schoolId: string | null; userId: string }

/** Every need this staff has open (cleared ones are left out), newest weight order. `available: false` before the SQL is run. */
export async function loadProgramNeeds(admin: SupabaseClient, key: ProgramKey & { programName?: string | null }): Promise<{ available: boolean; needs: RecruitingNeed[] }> {
  if (await isDemoNeeds()) return { available: true, needs: demoProgramNeeds(key.programName ?? "Campbell University") }
  let q = admin.from(TABLE).select(COLUMNS).is("cleared_at", null)
  q = key.schoolId ? q.eq("school_id", key.schoolId) : q.eq("posted_by", key.userId).is("school_id", null)
  const { data, error } = await q.order("gender").order("weight")
  if (error) {
    if (error.code === TABLE_MISSING) return { available: false, needs: [] }
    throw new Error(error.message)
  }
  return { available: true, needs: ((data ?? []) as Row[]).map(toNeed) }
}

/**
 * Post needs: one per weight. A weight this staff already has open is updated and re-confirmed,
 * not duplicated (the table's unique index holds the same rule).
 */
export async function saveNeeds(
  admin: SupabaseClient,
  coach: { userId: string; schoolId: string | null; programName: string; mapSchoolId: string | null; site: "rw" | "ncu" | "app" | null },
  input: NeedInput,
): Promise<RecruitingNeed[]> {
  if (await isDemoNeeds()) throw new Error("demo-needs cookie is set: nothing is saved")
  const { needs: open } = await loadProgramNeeds(admin, { schoolId: coach.schoolId, userId: coach.userId })
  const now = new Date().toISOString()
  const fields = {
    program_name: coach.programName,
    map_school_id: coach.mapSchoolId,
    class_years: input.classYears,
    min_gpa: input.minGpa,
    max_miles: input.maxMiles,
    results_level: input.resultsLevel,
    confirmed_at: now,
    updated_at: now,
  }
  const saved: RecruitingNeed[] = []
  for (const weight of input.weights) {
    const existing = open.find((n) => n.gender === input.gender && n.weight === weight)
    const { data, error } = existing
      ? await admin.from(TABLE).update(fields).eq("id", existing.id).select(COLUMNS).single()
      : await admin
          .from(TABLE)
          .insert({ ...fields, school_id: coach.schoolId, posted_by: coach.userId, gender: input.gender, weight, site: coach.site })
          .select(COLUMNS)
          .single()
    if (error) throw new Error(error.message)
    saved.push(toNeed(data as Row))
  }
  return saved
}

/** "Still recruiting" (confirm) or "Clear", on a need that belongs to this staff. */
export async function updateNeed(admin: SupabaseClient, key: ProgramKey, needId: string, action: "confirm" | "clear"): Promise<RecruitingNeed | null> {
  if (await isDemoNeeds()) throw new Error("demo-needs cookie is set: nothing is saved")
  const now = new Date().toISOString()
  let q = admin
    .from(TABLE)
    .update(action === "confirm" ? { confirmed_at: now, updated_at: now } : { cleared_at: now, updated_at: now })
    .eq("id", needId)
    .is("cleared_at", null)
  q = key.schoolId ? q.eq("school_id", key.schoolId) : q.eq("posted_by", key.userId)
  const { data, error } = await q.select(COLUMNS).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toNeed(data as Row) : null
}

// ---- matches for a coach

type PoolAthlete = {
  id: string
  name: string
  highSchool: string | null
  classYear: number
  gender: ViewGender
  state: string | null
  /** The weight last competed at; null when no result is on file (then he is never matched on weight). */
  competedWeight: string | null
  lastEvent: string | null
  gpa: number | null
  rank: number | null
}

/**
 * Uncommitted wrestlers in the current classes of the live states, with the weight each last
 * competed at. Cached for an hour: the weight sweep reads every result table.
 */
async function buildPool(onRecruitWrestlers: boolean): Promise<PoolAthlete[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const admin = createAdminClient()
  const years = currentClassYears()
  const rows: Row[] = []
  for (const { code } of liveStates(onRecruitWrestlers)) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await inState(
        admin.from("athletes").select("id, name, highschool, graduationyear, gender, state, is_nc_athlete, academic_gpa, prospect_ranking, college, recruiting_status"),
        code,
      )
        .gte("graduationyear", years[0]!)
        .lte("graduationyear", years[years.length - 1]!)
        .order("id")
        .range(from, from + 999)
      if (error) throw new Error(error.message)
      rows.push(...((data ?? []) as Row[]))
      if (!data || data.length < 1000) break
    }
  }
  const open = rows.filter((a) => {
    const college = String(a.college ?? "").trim()
    const status = String(a.recruiting_status ?? "").trim().toLowerCase()
    return (!college || college === "Not specified") && status !== "committed" && status !== "signed"
  })
  const last = await loadLastCompeted(
    admin,
    open.map((a) => String(a.id)),
    new Map(open.map((a) => [String(a.id), Number(a.graduationyear) || null])),
  )
  return open.map((a) => {
    const id = String(a.id)
    const classYear = Number(a.graduationyear)
    const gender: ViewGender = /^f/i.test(String(a.gender ?? "").trim()) ? "Female" : "Male"
    const rank = Number(a.prospect_ranking)
    const gpa = Number(String(a.academic_gpa ?? "").replace(/[^0-9.]/g, ""))
    const lc = last.get(id)
    return {
      id,
      name: String(a.name ?? ""),
      highSchool: (a.highschool as string | null) ?? null,
      classYear,
      gender,
      state: athleteStateCode(a as { state?: string | null; is_nc_athlete?: boolean | null }),
      competedWeight: lc?.weight ? String(lc.weight).replace(/\s*lbs?$/i, "") : null,
      lastEvent: lc ? `${lc.event} · ${lc.year}` : null,
      gpa: Number.isFinite(gpa) && gpa > 0 && gpa <= 5 ? gpa : null,
      // A published RecruitWrestlers rank only, inside the public cap (the board's own rule).
      rank: rank >= 1 && isPublicRankingsYearPublished(classYear, gender) && rank <= getPublicRankingsMax(classYear, gender) ? rank : null,
    }
  })
}

const loadPool = unstable_cache(buildPool, ["recruiting-needs-pool", "v1"], { revalidate: 3600, tags: ["coach-roster"] })

export type NeedMatch = {
  id: string
  name: string
  highSchool: string | null
  classYear: number
  state: string | null
  weight: string
  lastEvent: string | null
  /** "Ranked #6" or "Ranked Women's #1" in his class, published ranks only. */
  rankLabel: string | null
  /** "#12 SI (150)": a current national edition. */
  nationalLabel: string | null
  /** The best verified result: "State champion 2026", "NHSCA 3rd 2026". */
  credential: string | null
  checks: MatchCheck[]
  starred: boolean
}

const MATCH_LIMIT = 40

function bestCredential(c: AthleteCredentials | undefined): { label: string | null; statePlacer: boolean; nationalPlacer: boolean } {
  if (!c) return { label: null, statePlacer: false, nationalPlacer: false }
  const placed = c.state.filter((s) => s.place != null).sort((a, b) => a.place! - b.place! || b.year - a.year)
  const national = c.national.filter((n) => n.place != null && n.place <= ALL_AMERICAN_PLACES).sort((a, b) => a.place! - b.place! || b.year - a.year)
  const ord = (n: number) => (n === 1 ? "champion" : `${n}${n === 2 ? "nd" : n === 3 ? "rd" : "th"}`)
  const label = national[0]
    ? `${national[0].event} ${ord(national[0].place!)} ${national[0].year}`
    : placed[0]
      ? `State ${ord(placed[0].place!)} ${placed[0].year}`
      : null
  return { label, statePlacer: placed.length > 0, nationalPlacer: national.length > 0 || c.allAmerican.length > 0 }
}

/**
 * The wrestlers who fit one need: gender, class year, and a college weight projected from the
 * weight last competed at; then the need's filters, where a fact not on file never removes anyone.
 * Ranked first, then by credential, then by name.
 */
export async function loadNeedMatches(
  admin: SupabaseClient,
  need: RecruitingNeed,
  options: { onRecruitWrestlers: boolean; starred: Set<string> },
): Promise<{ matches: NeedMatch[]; total: number }> {
  const pool = await loadPool(options.onRecruitWrestlers)
  const campus = needSchool(need)?.campus ?? null
  const fits = pool.filter(
    (a) => a.gender === need.gender && need.classYears.includes(a.classYear) && collegeWeightsFromCompeted(a.competedWeight, a.gender).includes(need.weight),
  )
  // Cheap filters first, so the credential reads run on the few who are left.
  const prelim = fits
    .map((a) => ({ a, miles: milesToState(campus, a.state) }))
    .filter(({ a, miles }) => passesFilters(checkFilters({ ...need, resultsLevel: "any" }, { gpa: a.gpa, miles, statePlacer: false, nationalPlacer: false, nationallyRanked: false })))
    .sort((x, y) => (x.a.rank ?? 9999) - (y.a.rank ?? 9999) || x.a.name.localeCompare(y.a.name))
  const considered = prelim.slice(0, need.resultsLevel === "any" ? MATCH_LIMIT : 150)
  const [creds, national] = await Promise.all([
    // The credential reader reconciles names against the whole row, so it is handed the whole row.
    (async () => {
      const { data } = await admin.from("athletes").select("*").in("id", considered.map(({ a }) => a.id))
      return loadAthleteCredentialsBatch(admin, (data ?? []) as Row[])
    })().catch(() => new Map<string, AthleteCredentials>()),
    Promise.all(
      considered.map(({ a }) =>
        getCurrentNationalRankingsForAthlete(admin, a.id).then(
          (r) => [a.id, r] as [string, NationalRanking[]],
          () => [a.id, []] as [string, NationalRanking[]],
        ),
      ),
    ).then((x) => new Map(x)),
  ])
  const scored = considered
    .map(({ a, miles }) => {
      const best = bestCredential(creds.get(a.id))
      const ranks = national.get(a.id) ?? []
      const checks = checkFilters(need, { gpa: a.gpa, miles, statePlacer: best.statePlacer, nationalPlacer: best.nationalPlacer, nationallyRanked: ranks.length > 0 })
      return {
        pass: passesFilters(checks),
        order: (a.rank ?? 9999) - (ranks.length ? 5000 : 0) - (best.nationalPlacer ? 2000 : best.statePlacer ? 1000 : 0),
        match: {
          id: a.id,
          name: a.name,
          highSchool: a.highSchool,
          classYear: a.classYear,
          state: a.state,
          weight: a.competedWeight!,
          lastEvent: a.lastEvent,
          // No brand in the label: the same list shows on NC United and RecruitWrestlers.
          rankLabel: a.rank ? `Ranked ${rankingLabel(a.rank, a.gender, "")}` : null,
          nationalLabel: bannerNationalRankingLabel(ranks),
          credential: best.label,
          checks,
          starred: options.starred.has(a.id),
        } satisfies NeedMatch,
      }
    })
    .filter((s) => s.pass)
    .sort((x, y) => x.order - y.order || x.match.name.localeCompare(y.match.name))
  const total = need.resultsLevel === "any" ? prelim.length : scored.length
  return { matches: scored.slice(0, MATCH_LIMIT).map((s) => s.match), total }
}

// ---- families: the read function the profile, Command Center and the weekly feed share

export type FamilyNeed = {
  needId: string
  /** Always true: posted by a college staff, never inferred from a roster. */
  coachConfirmed: true
  program: string
  mapSchoolId: string | null
  division: string | null
  place: string | null
  gender: ViewGender
  weight: number
  classYears: number[]
  /** "State placers", "3.0+ GPA": what the staff said it is looking for. */
  lookingFor: string[]
  confirmedAt: string
  /** First posted. With `since`, the feed tells new needs from re-confirmed ones. */
  postedAt: string
}

/**
 * Live, coach-confirmed needs that fit one wrestler: same gender, his class year, and a college
 * weight projected from the weight he last competed at. Free for the family to see.
 *
 * `since` (ISO): only needs posted or re-confirmed after it - for "what changed this week".
 * Never throws: no table, or any failure, is an empty list.
 */
export async function loadNeedsForAthlete(admin: SupabaseClient, athleteId: string, options: { since?: string } = {}): Promise<FamilyNeed[]> {
  try {
    const { data: a } = await admin.from("athletes").select("id, gender, graduationyear").eq("id", athleteId).maybeSingle()
    if (!a?.graduationyear) return []
    const gender: ViewGender = /^f/i.test(String(a.gender ?? "").trim()) ? "Female" : "Male"
    const classYear = Number(a.graduationyear)
    const last = await loadLastCompeted(admin, [athleteId], new Map([[athleteId, classYear]]))
    const weights = collegeWeightsFromCompeted(last.get(athleteId)?.weight ?? null, gender)
    if (!weights.length) return []
    return await liveNeedsFor(admin, { gender, classYear, weights, since: options.since })
  } catch {
    return []
  }
}

/** Every live need for a gender, class and set of college weights, approved coaches only. */
export async function liveNeedsFor(
  admin: SupabaseClient,
  q: { gender: ViewGender; classYear: number; weights: number[]; since?: string },
): Promise<FamilyNeed[]> {
  const floor = new Date(Date.now() - NEED_EXPIRE_DAYS * 86_400_000).toISOString()
  const since = q.since && q.since > floor ? q.since : floor
  if (await isDemoNeeds()) {
    const demo = demoFamilyNeeds().filter((n) => n.gender === q.gender && q.weights.includes(n.weight) && n.classYears.includes(q.classYear) && n.confirmedAt >= since)
    return toFamilyNeeds(demo, new Set(["demo"]))
  }
  const { data, error } = await admin
    .from(TABLE)
    .select(COLUMNS)
    .is("cleared_at", null)
    .eq("gender", q.gender)
    .in("weight", q.weights)
    .contains("class_years", [q.classYear])
    .gte("confirmed_at", since)
    .order("confirmed_at", { ascending: false })
    .limit(100)
  if (error) return []
  const needs = ((data ?? []) as Row[]).map(toNeed).filter((n) => isLiveNeed(n))
  if (!needs.length) return []
  const posters = [...new Set(needs.map((n) => n.postedBy))]
  const { data: profiles } = await admin.from("user_profiles").select("user_id, email, role, verified_coach, verification_status").in("user_id", posters)
  // Staff-approved coaches only: not a fresh sign-up, and not an admin posting for a program.
  // Internal logins (Apple review, the staff test coach) never reach a family either.
  const approved = new Set((profiles ?? []).filter((p) => isApprovedCoach(p as never) && !isInternalAccount(p.email as string)).map((p) => String(p.user_id)))
  return toFamilyNeeds(needs, approved)
}

function toFamilyNeeds(needs: RecruitingNeed[], approved: Set<string>): FamilyNeed[] {
  // One card per program and weight, even when two of its coaches posted it.
  const seen = new Set<string>()
  const out: FamilyNeed[] = []
  for (const n of needs) {
    if (!approved.has(n.postedBy)) continue
    const key = `${n.schoolId ?? n.programName}|${n.weight}`
    if (seen.has(key)) continue
    seen.add(key)
    const school = needSchool(n)
    out.push({
      needId: n.id,
      coachConfirmed: true,
      program: school?.name ?? n.programName,
      mapSchoolId: n.mapSchoolId,
      division: school?.division ?? null,
      place: school?.city && school.state ? `${school.city}, ${school.state}` : null,
      gender: n.gender,
      weight: n.weight,
      classYears: n.classYears,
      lookingFor: [
        n.resultsLevel === "state_placer" ? "State placers" : n.resultsLevel === "national_placer" ? "National placers" : n.resultsLevel === "nationally_ranked" ? "Nationally ranked" : null,
        n.minGpa != null ? `${n.minGpa.toFixed(1)}+ GPA` : null,
      ].filter((x): x is string => Boolean(x)),
      confirmedAt: n.confirmedAt,
      postedAt: n.createdAt,
    })
  }
  return out
}

/** Every wrestler on a family's account, each with the needs that fit. */
export async function loadNeedsForFamily(admin: SupabaseClient, userId: string, options: { since?: string } = {}): Promise<Map<string, FamilyNeed[]>> {
  const ids = await familyAthleteIds(admin, userId).catch(() => [] as string[])
  const out = new Map<string, FamilyNeed[]>()
  for (const id of ids) out.set(id, await loadNeedsForAthlete(admin, id, options))
  return out
}

// ---- who is posting

export type NeedsCoach = {
  userId: string
  isAdmin: boolean
  /** May post: a college coach with Coach Home access. Admins read only. */
  canPost: boolean
  schoolId: string | null
  programName: string | null
  mapSchoolId: string | null
  genders: ViewGender[]
}

/**
 * The coach a needs request is for, or null when this user may not use the page. Same door as
 * Coach Home: a verified college coach (instant on sign-up) or an admin. What a coach posts reaches
 * families only once staff have approved him (liveNeedsFor).
 */
export async function resolveNeedsCoach(admin: SupabaseClient, userId: string, viewing: ViewGender): Promise<NeedsCoach | null> {
  const [{ classifyViewer }, { coachProgramOf }, { gendersFor }, { mapSchoolIdFor }] = await Promise.all([
    import("@/lib/viewer-role"),
    import("@/lib/recruiting/coach-program"),
    import("@/lib/recruiting/needs"),
    import("@/lib/college-programs/load"),
  ])
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, is_admin, school_id, institution")
    .eq("user_id", userId)
    .maybeSingle()
  const who = classifyViewer(profile ?? null)
  const isAdmin = who.kind === "admin" || profile?.is_admin === true
  const isCoach = who.isCollegeCoach && who.verifiedCoach
  if (!isAdmin && !isCoach) return null
  const schoolId = (profile?.school_id as string | null) ?? null
  const school = schoolId ? (await admin.from("schools").select("name").eq("id", schoolId).maybeSingle()).data : null
  const programName = String(school?.name ?? profile?.institution ?? "").trim() || null
  const program = await admin.auth.admin.getUserById(userId).then((r) => coachProgramOf(r.data?.user), () => null)
  return {
    userId,
    isAdmin,
    canPost: isCoach && Boolean(programName),
    schoolId,
    programName,
    mapSchoolId: programName ? mapSchoolIdFor(programName) : null,
    genders: gendersFor(program, viewing),
  }
}
