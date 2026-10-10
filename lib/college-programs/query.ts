/**
 * Counting and listing college wrestling programs, for Data Dawg.
 *
 * Every number Data Dawg says about programs is computed here, not by the model: "how many D2
 * women's programs are in Pennsylvania" is arithmetic, and a model adding up a list gets it wrong.
 *
 * Two units, kept apart on purpose:
 * - a **school** is one campus (437);
 * - a **program** is one team, men's or women's (427 men's + 201 women's = 628).
 * Lock Haven and Edinboro wrestle men's D1 and women's D2, so they are one school with a program
 * in each division.
 */

import data from "@/lib/college-programs/programs-2026-27.json"
import { schoolsForCoach, staffForSchool, isHeadCoach } from "@/lib/college-programs/staff"
import { STATE_NAMES, stateCode } from "@/lib/college-programs/states"
import { COLLEGE_DIVISIONS, DIVISION_SHORT, type CollegeDivision, type CollegeMapSchool } from "@/lib/college-programs/types"

const SCHOOLS = data.schools as CollegeMapSchool[]
export const COLLEGE_MAP_PATH = "/recruiting/college-map"

export type CollegeProgramsQuery = {
  division?: string | null
  gender?: string | null
  state?: string | null
  query?: string | null
  /** A coach's full name: which schools they are on staff at. */
  coach?: string | null
  limit?: number | null
}

/** Staff is attached when the answer is about a handful of schools, not a national list. */
const STAFF_DETAIL_MAX_SCHOOLS = 5

export function normalizeDivision(input: string | null | undefined): CollegeDivision | null {
  const v = String(input ?? "").trim().toLowerCase().replace(/[\s.-]+/g, "")
  if (!v) return null
  if (["d1", "di", "division1", "divisioni", "ncaadivisioni", "ncaad1"].includes(v)) return "NCAA Division I"
  if (["d2", "dii", "division2", "divisionii", "ncaadivisionii", "ncaad2"].includes(v)) return "NCAA Division II"
  if (["d3", "diii", "division3", "divisioniii", "ncaadivisioniii", "ncaad3"].includes(v)) return "NCAA Division III"
  if (v === "naia") return "NAIA"
  if (["njcaa", "juco", "juniorcollege"].includes(v)) return "NJCAA"
  return null
}

export function normalizeGender(input: string | null | undefined): "mens" | "womens" | null {
  const v = String(input ?? "").trim().toLowerCase()
  if (!v) return null
  if (/^(w|women|womens|women's|female|girls?)$/.test(v)) return "womens"
  if (/^(m|men|mens|men's|male|boys?)$/.test(v)) return "mens"
  return null
}

type Tally = { schools: number; programs: number; mens: number; womens: number }
const emptyTally = (): Tally => ({ schools: 0, programs: 0, mens: 0, womens: 0 })

export function queryCollegePrograms(args: CollegeProgramsQuery) {
  const division = normalizeDivision(args.division)
  const gender = normalizeGender(args.gender)
  const state = stateCode(args.state)
  const q = String(args.query ?? "").trim().toLowerCase()
  const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 500)
  // "Where does X coach" answers for head coaches only, for the same reason as head_coaches below.
  const coachHits = args.coach ? schoolsForCoach(args.coach).filter((h) => isHeadCoach(h.member)) : null
  // "Who coaches at Campbell, and where does Zeke Jones coach?" arrives as one call with both. The
  // coach answer stands on its own (the `coach` block); it narrows the school list only when it is
  // the whole question, otherwise Campbell AND Zeke Jones matched nothing and both were "unknown".
  const coachOnly = Boolean(coachHits) && !args.query && !args.state && !args.division
  const coachSchoolIds = coachOnly ? new Set(coachHits!.map((h) => h.schoolId)) : null

  // Filters the caller asked for and we could not read are reported, never silently dropped.
  const unrecognised: string[] = []
  if (args.division && !division) unrecognised.push(`division "${args.division}"`)
  if (args.gender && !gender) unrecognised.push(`gender "${args.gender}"`)
  if (args.state && !state) unrecognised.push(`state "${args.state}"`)

  const total = emptyTally()
  const byDivision = new Map<CollegeDivision, Tally>(COLLEGE_DIVISIONS.map((d) => [d, emptyTally()]))
  const byState = new Map<string, Tally>()
  const matched: Array<{ school: CollegeMapSchool; programs: CollegeMapSchool["programs"] }> = []

  for (const school of SCHOOLS) {
    if (coachSchoolIds && !coachSchoolIds.has(school.id)) continue
    if (state && school.state !== state) continue
    if (q && !`${school.name} ${school.city} ${school.state} ${STATE_NAMES[school.state] ?? ""}`.toLowerCase().includes(q))
      continue

    // A program row holds a men's and/or a women's team; keep only the teams the filters allow.
    const programs = school.programs
      .filter((p) => !division || p.division === division)
      .map((p) => ({ ...p, mens: p.mens && gender !== "womens", womens: p.womens && gender !== "mens" }))
      .filter((p) => p.mens || p.womens)
    if (programs.length === 0) continue

    matched.push({ school, programs })
    const st = byState.get(school.state) ?? emptyTally()
    byState.set(school.state, st)
    total.schools += 1
    st.schools += 1
    const divisionsCounted = new Set<CollegeDivision>()
    for (const p of programs) {
      const dt = byDivision.get(p.division)!
      if (!divisionsCounted.has(p.division)) {
        dt.schools += 1
        divisionsCounted.add(p.division)
      }
      for (const t of [total, dt, st]) {
        if (p.mens) t.mens += 1
        if (p.womens) t.womens += 1
        t.programs += (p.mens ? 1 : 0) + (p.womens ? 1 : 0)
      }
    }
  }

  const sortedSchools = matched.sort(
    (a, b) => a.school.state.localeCompare(b.school.state) || a.school.name.localeCompare(b.school.name),
  )

  // The headline as a finished sentence: given "437" and "628" separately, the model called 437
  // schools "437 programs".
  const scope = [
    gender === "womens" ? "women's" : gender === "mens" ? "men's" : null,
    division ? DIVISION_SHORT[division] : null,
  ]
    .filter(Boolean)
    .join(" ")
  const where = state ? ` in ${STATE_NAMES[state] ?? state}` : ""
  const teamSplit = gender ? "" : ` (${total.mens} men's, ${total.womens} women's)`
  const summary =
    total.schools === 0
      ? `No ${scope ? `${scope} ` : ""}college wrestling programs${where} on the 2026-27 list.`
      : `${total.schools} ${total.schools === 1 ? "school" : "schools"}${where} ${total.schools === 1 ? "has" : "have"} ${scope ? `${scope} ` : ""}college wrestling in 2026-27, with ${total.programs} ${total.programs === 1 ? "program" : "programs"}${teamSplit}.`

  return {
    summary,
    season: "2026-27",
    source: "College wrestling program list compiled 9 Oct 2026; every program confirmed active for 2026-27.",
    units:
      "schools = campuses; programs = teams (a school with men's and women's wrestling is 1 school, 2 programs). Quote whichever the question asks for.",
    filters: {
      division,
      gender,
      state: state ? `${state} (${STATE_NAMES[state] ?? state})` : null,
      query: q || null,
      unrecognised,
    },
    totals: total,
    by_division: COLLEGE_DIVISIONS.map((d) => ({ division: d, short: DIVISION_SHORT[d], ...byDivision.get(d)! })).filter(
      (row) => row.schools > 0,
    ),
    by_state: [...byState.entries()]
      .map(([code, t]) => ({ state: code, state_name: STATE_NAMES[code] ?? code, ...t }))
      .sort((a, b) => b.programs - a.programs || a.state_name.localeCompare(b.state_name)),
    coach: args.coach
      ? {
          searched: args.coach,
          found: (coachHits ?? []).length > 0,
          roles: (coachHits ?? []).map((h) => {
            const school = SCHOOLS.find((s) => s.id === h.schoolId)
            return {
              school: school?.name ?? h.schoolId,
              city: school ? `${school.city}, ${school.state}` : null,
              division: DIVISION_SHORT[h.member.division],
              title: h.member.title,
              teams: h.member.teams,
            }
          }),
        }
      : null,
    staff_note:
      "Head coaches are from each school's athletics site, 9-10 Oct 2026. An empty head_coaches list means we could not confirm it, not that the school has no coach. Assistants and coach emails are not given here: the full staff is on the college program map for NC United Blue members.",
    schools: sortedSchools.slice(0, limit).map(({ school, programs }) => ({
      name: school.name,
      city: school.city,
      state: school.state,
      programs: programs.map((p) =>
        [DIVISION_SHORT[p.division], [p.mens ? "men's" : null, p.womens ? "women's" : null].filter(Boolean).join(" & "), p.conference]
          .filter(Boolean)
          .join(" · "),
      ),
      website: school.website,
      ...(sortedSchools.length <= STAFF_DETAIL_MAX_SCHOOLS
        ? {
            // Head coaches only. The full staff is a Blue benefit on the map, and Data Dawg
            // answers everyone without knowing who is asking.
            head_coaches: staffForSchool(school.id)
              .filter(isHeadCoach)
              .map((m) => ({ name: m.name, title: m.title, teams: m.teams, division: DIVISION_SHORT[m.division] })),
            other_staff_count: staffForSchool(school.id).filter((m) => !isHeadCoach(m)).length,
          }
        : {}),
    })),
    schools_listed: Math.min(limit, sortedSchools.length),
    schools_truncated: sortedSchools.length > limit,
    map_url: COLLEGE_MAP_PATH,
  }
}
