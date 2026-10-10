/**
 * A program's standard checked against many wrestlers at once - the flag, rather than a filter.
 *
 * A filter hides the wrestlers who miss, and a coach never learns that the one he was looking for
 * missed on a GPA nobody has entered. A flag leaves everyone on the page and says who meets the
 * standard, who might, and why not (Matt, 10 October 2026).
 *
 * Three verdicts, because "not on file" is not a miss (lib/program-fit.ts):
 *   meets    - every need the program set is met
 *   possible - nothing missed, but something the program asks for is not on the profile
 *   misses   - at least one need is missed
 *
 * Only the facts a program actually asks for are loaded: a staff that set weights and a GPA floor
 * costs one read of the athletes table, not a sweep of every bout.
 */
import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { evaluateProgramFit, hasAnyCriteria, type FitCheck, type FitSubject, type ProgramFitCriteria } from "@/lib/program-fit"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"

export type FitVerdict = "meets" | "possible" | "misses"

export type FitFlag = {
  verdict: FitVerdict
  met: number
  total: number
  /** Labels of the needs missed, must-haves first: "Weight", "GPA". */
  misses: string[]
  /** Labels of the needs we could not check. */
  unknown: string[]
  /** One line a coach can read without opening anything. */
  summary: string
  checks: FitCheck[]
}

const list = (labels: string[]) => (labels.length <= 1 ? labels.join("") : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`)

export function flagFromChecks(checks: FitCheck[]): FitFlag | null {
  if (!checks.length) return null
  const missed = checks.filter((c) => c.status === "miss").sort((a, b) => Number(b.mustHave) - Number(a.mustHave))
  const unknown = checks.filter((c) => c.status === "unknown").map((c) => c.label)
  const met = checks.filter((c) => c.status === "fit").length
  const verdict: FitVerdict = missed.length ? "misses" : unknown.length ? "possible" : "meets"
  const summary =
    verdict === "meets"
      ? `Meets your standard (${met} of ${checks.length})`
      : verdict === "possible"
        ? `Meets ${met} of ${checks.length}; ${list(unknown)} not on file`
        : `Misses ${list(missed.map((c) => c.label))}`
  return { verdict, met, total: checks.length, misses: missed.map((c) => c.label), unknown, summary, checks }
}

const CHUNK = 150
const chunks = <T,>(items: T[]) => Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, i) => items.slice(i * CHUNK, (i + 1) * CHUNK))

/** Individual national events, by the names the bout import uses. Team duals are not counted. */
function isIndividualNationalEvent(eventName: string): boolean {
  const name = eventName.toLowerCase()
  if (/tournament of champions/.test(name)) return false
  if (/i-64/.test(name)) return true
  if (/dual/.test(name)) return false
  return /nhsca|super 32|fargo|journeymen/.test(name)
}

const ordinal = (n: number) => (n === 1 ? "Champion" : `${n}${n === 2 ? "nd" : n === 3 ? "rd" : "th"}`)

/**
 * The facts the standard needs, for each wrestler. `personal` is whether this viewer may be
 * checked against GPA, test scores and intended major at all (lib/scouting-report-access.ts).
 */
export async function loadFitSubjects(
  admin: SupabaseClient,
  athleteIds: string[],
  criteria: ProgramFitCriteria,
  options: { personal: boolean },
): Promise<Map<string, FitSubject & { female: boolean }>> {
  const out = new Map<string, FitSubject & { female: boolean }>()
  const ids = [...new Set(athleteIds)].filter(Boolean)
  if (!ids.length) return out

  type Row = Record<string, unknown> & { id: string }
  const athletes: Row[] = []
  for (const part of chunks(ids)) {
    const { data, error } = await admin
      .from("athletes")
      .select("id, graduationyear, weightclass, college_weight_class, academic_gpa, academic_sat, academic_act, academic_interest, prospect_ranking, gender")
      .in("id", part)
    if (error) throw new Error(error.message)
    athletes.push(...((data ?? []) as Row[]))
  }

  // Best NCHSAA finish, by the row's own athlete and by the matcher's links - what the profile reads.
  const bestState = new Map<string, { place: number; label: string }>()
  if (criteria.stateFinish !== "any") {
    type Res = { id: string; athlete_id: string | null; year: number; place: number | null; classification: string | null; weight_class?: string | null }
    const rows: Res[] = []
    for (const part of chunks(ids)) {
      const [{ data: direct }, { data: links }] = await Promise.all([
        admin.from("wrestling_nchsaa_results").select("id, athlete_id, year, place, classification").in("athlete_id", part),
        admin.from("result_athlete_links").select("source_id, athlete_id").eq("source_table", "wrestling_nchsaa_results").eq("status", "linked").in("athlete_id", part),
      ])
      rows.push(...((direct ?? []) as Res[]))
      const owner = new Map((links ?? []).map((l) => [String(l.source_id), String(l.athlete_id)]))
      const have = new Set(((direct ?? []) as Res[]).map((r) => r.id))
      const extra = [...owner.keys()].filter((sid) => !have.has(sid))
      for (const more of chunks(extra)) {
        const { data } = await admin.from("wrestling_nchsaa_results").select("id, athlete_id, year, place, classification").in("id", more)
        rows.push(...((data ?? []) as Res[]).map((r) => ({ ...r, athlete_id: owner.get(r.id) ?? r.athlete_id })))
      }
    }
    for (const r of rows) {
      const place = Number(r.place)
      if (!r.athlete_id || !(place > 0)) continue
      const cur = bestState.get(r.athlete_id)
      if (!cur || place < cur.place) {
        bestState.set(r.athlete_id, { place, label: `${ordinal(place)}, ${r.year}${r.classification ? ` ${r.classification}` : ""}` })
      }
    }
  }

  // Individual national events entered, from the imported brackets.
  const nationalEvents = new Map<string, Set<string>>()
  if (criteria.requireNational) {
    for (const part of chunks(ids)) {
      for (let from = 0; ; from += 1000) {
        const { data, error } = await admin
          .from("other_tournament_bouts")
          .select("athlete_id, event_name")
          .in("athlete_id", part)
          .range(from, from + 999)
        if (error || !data?.length) break
        for (const b of data as Array<{ athlete_id: string | null; event_name: string | null }>) {
          if (!b.athlete_id || !b.event_name || !isIndividualNationalEvent(b.event_name)) continue
          if (!nationalEvents.has(b.athlete_id)) nationalEvents.set(b.athlete_id, new Set())
          // "2026 Fargo 16U Freestyle" and "2026 Fargo 16U Greco-Roman" are one trip.
          nationalEvents.get(b.athlete_id)!.add(b.event_name.replace(/\s+(16u|junior|u15|14u)?\s*(freestyle|greco(-roman)?|folkstyle).*$/i, "").trim())
        }
        if (data.length < 1000) break
      }
    }
  }

  const text = (v: unknown) => {
    const s = String(v ?? "").trim()
    return s ? s : null
  }
  for (const a of athletes) {
    const classYear = a.graduationyear ? Number(a.graduationyear) : null
    const rank = Number(a.prospect_ranking)
    const ranked = rank >= 1 && isPublicRankingsYearPublished(classYear) && rank <= getPublicRankingsMax(classYear)
    const state = bestState.get(a.id)
    out.set(a.id, {
      graduationYear: classYear,
      collegeWeightClass: text(a.college_weight_class),
      // The listed weight. The comparison uses the last weight competed, which is worked out per
      // profile and too slow for a whole class; the two differ only when the listing is stale.
      currentWeight: text(a.weightclass),
      gpa: options.personal ? text(a.academic_gpa) : null,
      sat: options.personal ? text(a.academic_sat) : null,
      act: options.personal ? text(a.academic_act) : null,
      academicInterest: options.personal ? text(a.academic_interest) : null,
      nationalEvents: nationalEvents.get(a.id)?.size ?? 0,
      stateBestPlace: state?.place ?? null,
      stateBestLabel: state?.label ?? null,
      rankedLabel: ranked ? `#${rank} RecruitNC Class of ${classYear}` : null,
      female: /^(f|female|girl)/i.test(String(a.gender ?? "")),
    })
  }
  return out
}

/** The standard without the needs this viewer may not be checked against. */
export function criteriaFor(criteria: ProgramFitCriteria, options: { personal: boolean }): ProgramFitCriteria {
  return options.personal ? criteria : { ...criteria, minGpa: null, minSat: null, minAct: null, majors: [] }
}

/** A flag per wrestler; empty when the program has set no needs. */
export async function loadFitFlags(
  admin: SupabaseClient,
  athleteIds: string[],
  saved: ProgramFitCriteria | null | undefined,
  options: { personal: boolean },
): Promise<Map<string, FitFlag>> {
  const flags = new Map<string, FitFlag>()
  if (!saved) return flags
  const criteria = criteriaFor(saved, options)
  if (!hasAnyCriteria(criteria)) return flags
  const subjects = await loadFitSubjects(admin, athleteIds, criteria, options)
  for (const [id, subject] of subjects) {
    /*
     * The weights a program picks are the men's college weights. A girl's high school weight read
     * against them says "wrestles 107, so 125 in college", which is not a fact about anybody, so
     * her weight is left unchecked and said to be.
     */
    const checks = evaluateProgramFit(subject, criteria).map((c) =>
      c.key === "weight" && subject.female
        ? { ...c, status: "unknown" as const, detail: "Women's college weights differ; not checked" }
        : c,
    )
    const flag = flagFromChecks(checks)
    if (flag) flags.set(id, flag)
  }
  return flags
}
