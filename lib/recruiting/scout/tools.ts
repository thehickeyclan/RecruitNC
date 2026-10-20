import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { COLLEGE_LIST_STATUS_LABEL, isCollegeListStatus, type CollegeListStatus } from "@/lib/college-programs/list"
import data from "@/lib/college-programs/programs-2026-27.json"
import { questionnairesForSchool } from "@/lib/college-programs/questionnaires"
import { seniorClassYear } from "@/lib/class-years"
import { depthFor, nearestCollegeWeights } from "@/lib/college-programs/roster-depth"
import { d1TierOf, type D1Tiers } from "@/lib/college-programs/d1-tiers"
import { readGuide, type Guide } from "@/lib/recruiting/scout/guides"
import { athleticAdmissionFacts, inStateLine } from "@/lib/recruiting/scout/projected-level"
import { needSentence, roomByWeight, roomFor, weightsPublished } from "@/lib/college-programs/roster-room"
import { isHeadCoach, staffForSchool } from "@/lib/college-programs/staff"
import { yearlyCostFor } from "@/lib/college-programs/tuition"
import { DIVISION_SHORT, type CollegeDivision, type CollegeMapSchool } from "@/lib/college-programs/types"
import { loadWentHere } from "@/lib/college-programs/went-here"
import { collegeFitFor, type FamilyFitContext } from "@/lib/recruiting/college-fit"
import { collegeKey } from "@/lib/recruiting/roadmap-adapt"
import { fitForSchool, satTotalRange } from "@/lib/college-programs/fit"
import { STATE_NAMES } from "@/lib/college-programs/states"
import { NICHE_CATEGORIES, gradePoints, nicheFor } from "@/lib/college-programs/niche"

/**
 * Scout's college tools (17 Oct 2026, Matt: "understands all the colleges, the line ups, the NC
 * alumni, college commits, coaches"). Every program in the country, read from the same data the
 * map and the college pages use. Each answer is facts only, already worked out; the model words it.
 */

const SCHOOLS: CollegeMapSchool[] = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS]
const BY_ID = new Map(SCHOOLS.map((s) => [s.id, s]))
const spoken = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, " ").trim()
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`
const DIVISION_BY_SHORT: Record<string, CollegeDivision> = { D1: "NCAA Division I", D2: "NCAA Division II", D3: "NCAA Division III", NAIA: "NAIA", NJCAA: "NJCAA" }

/** What Scout knows about the family while it looks colleges up. */
export type ScoutSession = {
  admin: SupabaseClient
  userId: string
  team: "mens" | "womens" | null
  /** The wrestler's high school, to find alumni from the same school. */
  highSchool: string | null
  fit: FamilyFitContext | null
  /** The family's college list: school id to stage. */
  list: Map<string, CollegeListStatus>
  /** Names of programs that viewed the wrestler, reduced for matching. */
  viewed: Set<string>
  /** The rules library by the piece (guides.ts), for read_guide. */
  guides?: Guide[]
  /** The family's state ("NC"), for in-state programs. */
  homeState?: string
  /** Division I Tier 1 from the latest poll. */
  tiers?: D1Tiers
  /** The college the wrestler is committed to in our records, resolved to a map id when we can. */
  commitment?: { name: string; schoolId: string | null } | null
  /** The wrestler's star, for the in-state line (never said to the family). */
  stars?: number | null
  /** Links Scout may offer; tools add the colleges they return. */
  links: Record<string, { label: string; href: string; kind: "rule" | "timeline" | "college" | "tool" | "source" }>
}

/**
 * What a wrestler needs academically to compete at each level, from the rules library
 * (content.ts: Division I and II "Minimum core-course GPA", the NAIA rule, Division III and NJCAA
 * having none). Said with every college so "what GPA does X need" never gets "it sets its own".
 */
export const ELIGIBILITY_MINIMUM: Record<CollegeDivision, string> = {
  "NCAA Division I": "To compete as a freshman in Division I: a 2.3 GPA in 16 NCAA core courses, certified by the NCAA Eligibility Center [link: learn:division-1]",
  "NCAA Division II": "To compete as a freshman in Division II: a 2.2 GPA in 16 NCAA core courses, certified by the NCAA Eligibility Center [link: learn:division-2]",
  "NCAA Division III": "Division III has no NCAA GPA minimum: getting admitted to the college is the requirement [link: learn:division-3]",
  NAIA: "To compete in the NAIA: graduate high school with a 2.3 GPA or better, or meet two of three (18 ACT or 970 SAT in one sitting; a 2.0 GPA; top half of the class) [link: learn:naia]",
  NJCAA: "Junior college: a high school diploma or equivalent; no minimum high school GPA or test score [link: learn:njcaa]",
}

export const SCOUT_TOOLS = [
  {
    type: "function",
    function: {
      name: "read_guide",
      description:
        "Read one guide from the rules library in full (key from the library index in the facts, e.g. learn:nil, learn:division-2, guide:other-classes). Use when the question needs a rule or guide whose sections were not given with it.",
      parameters: { type: "object", properties: { key: { type: "string" } }, required: ["key"] },
    },
  },
  {
    type: "function",
    function: {
      name: "find_colleges",
      description:
        "Search every college wrestling program in the US (NCAA D1/D2/D3, NAIA, NJCAA, 2026-27). Use for a college by name ('NC State', 'Campbell'), or a search ('D2 colleges in Virginia', 'D3 under $40,000 with room at his weight'). Returns short facts per college; call college_details for one college's coaches, lineup, alumni and fit.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Part of a college's name or nickname." },
          division: { type: "string", enum: ["D1", "D2", "D3", "NAIA", "NJCAA"] },
          state: { type: "string", description: "Two-letter state, e.g. NC." },
          conference: { type: "string" },
          max_cost: { type: "number", description: "Most the full published yearly cost may be, in dollars." },
          room_at_weight: { type: "boolean", description: "Only colleges where two or fewer wrestlers will still be at the wrestler's college weight the fall he would arrive." },
          grade_category: { type: "string", enum: NICHE_CATEGORIES.map((c) => c.key), description: "A Niche campus-life grade to filter on, with min_grade." },
          min_grade: { type: "string", description: "Lowest Niche grade to accept in grade_category, e.g. 'B+'." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "college_details",
      description:
        "Everything about one college for this family: programs, conference, full cost and net price, coaching staff (names, titles, published emails), recruiting questionnaire, the lineup at the wrestler's weight, the NC wrestlers who went there and their results, how the wrestler fits (athletic, academic, cost), whether it is on the family's list and whether its coaches viewed the profile.",
      parameters: { type: "object", properties: { school_id: { type: "string" } }, required: ["school_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "college_commits",
      description: "Wrestlers from the family's state who committed to college, from our records. Filter by college, level or class year.",
      parameters: {
        type: "object",
        properties: { school_id: { type: "string" }, division: { type: "string", enum: ["D1", "D2", "D3", "NAIA", "NJCAA"] }, class_year: { type: "number" } },
      },
    },
  },
] as const

function lineup(s: ScoutSession, schoolId: string): string | null {
  const team = s.team ?? (BY_ID.get(schoolId)?.programs.some((p) => p.mens) ? "mens" : "womens")
  const depth = depthFor(schoolId, team)
  if (!depth) return null
  const room = roomFor(schoolId, team)
  const weights = s.fit?.weight ? nearestCollegeWeights(s.fit.weight, team) : []
  const arrival = s.fit?.classYear ?? seniorClassYear()
  const atText =
    room && weights.length && weightsPublished(room)
      ? `. At the wrestler's college weights, for the fall ${arrival} the wrestler would arrive: ${needSentence(roomByWeight(room, team, arrival), weights, arrival)}. A direction, never an open spot: redshirts, transfers and new signings change it`
      : room && weights.length
        ? ". The roster lists too few weights to say who is at the wrestler's weight"
        : ""
  return `${depth.season ?? "Current"} roster (for the family's planning; never put it in an email): ${depth.size} wrestlers${atText}`
}

/** "Room at his weight": the nearest college weight is a likely need or has some room in the arrival fall. */
function roomAtWeight(s: ScoutSession, schoolId: string): boolean {
  const team = s.team ?? "mens"
  const room = roomFor(schoolId, team)
  if (!room || !s.fit?.weight || !weightsPublished(room)) return false
  const w = nearestCollegeWeights(s.fit.weight, team)[0]
  const row = roomByWeight(room, team, s.fit.classYear ?? seniorClassYear()).find((r) => r.weight === w)
  return Boolean(row && row.need !== "crowded")
}

function short(s: ScoutSession, school: CollegeMapSchool): string {
  s.links[`school:${school.id}`] = { label: spoken(school.name), href: `/recruiting/schools/${school.id}`, kind: "college" }
  const programs = school.programs
    .filter((p) => !s.team || p[s.team])
    .map((p) => `${DIVISION_SHORT[p.division]}${p.conference ? ` ${p.conference}` : ""} (${[p.mens ? "men" : null, p.womens ? "women" : null].filter(Boolean).join(" and ")})`)
  const cost = yearlyCostFor(school.id, school.state)
  const stage = s.list.get(school.id)
  return [
    `${spoken(school.name)} [id ${school.id}] [link: school:${school.id}]: ${programs.join("; ") || "no program for this team"}, ${school.city}, ${school.state}`,
    school.firstSeason ? `first season ${school.firstSeason}` : null,
    cost ? `full yearly cost ${money(cost.amount)}` : null,
    lineup(s, school.id),
    nicheFor(school.id)?.grades.overall ? `Niche overall grade ${nicheFor(school.id)!.grades.overall}` : null,
    stage ? `on the family's list (${COLLEGE_LIST_STATUS_LABEL[stage]})` : null,
    s.viewed.has(collegeKey(school.name)) ? "its coaches viewed the profile" : null,
  ]
    .filter(Boolean)
    .join(". ")
}

function findColleges(s: ScoutSession, a: Record<string, unknown>): string {
  const name = typeof a.name === "string" ? a.name.toLowerCase().trim() : ""
  const division = typeof a.division === "string" ? DIVISION_BY_SHORT[a.division] : undefined
  const state = typeof a.state === "string" ? a.state.toUpperCase().trim() : ""
  const conference = typeof a.conference === "string" ? a.conference.toLowerCase() : ""
  const maxCost = typeof a.max_cost === "number" ? a.max_cost : null
  const nameKey = name ? collegeKey(name) : ""
  let hits = SCHOOLS.filter((school) => {
    if (name && !school.name.toLowerCase().includes(name) && !(nameKey && collegeKey(school.name).includes(nameKey)) && !school.id.includes(name.replace(/\s+/g, "-"))) return false
    const programs = school.programs.filter((p) => (!s.team || p[s.team]) && (!division || p.division === division))
    if (!programs.length) return false
    if (state && school.state !== state) return false
    if (conference && !programs.some((p) => (p.conference ?? "").toLowerCase().includes(conference))) return false
    if (maxCost != null && (yearlyCostFor(school.id, school.state)?.amount ?? Infinity) > maxCost) return false
    if (a.room_at_weight === true && !roomAtWeight(s, school.id)) return false
    if (typeof a.grade_category === "string" && typeof a.min_grade === "string") {
      const have = gradePoints(nicheFor(school.id)?.grades[a.grade_category as keyof NonNullable<ReturnType<typeof nicheFor>>["grades"]])
      const need = gradePoints(a.min_grade.trim().toUpperCase())
      if (have == null || need == null || have < need) return false
    }
    return true
  })
  const total = hits.length
  hits = hits.slice(0, 20)
  if (!total) return "No college matches that search for this wrestler's team."
  return `${total} college${total === 1 ? "" : "s"} match${total > 20 ? "; the first 20" : ""}:\n${hits.map((h) => `- ${short(s, h)}`).join("\n")}`
}

async function collegeDetails(s: ScoutSession, a: Record<string, unknown>): Promise<string> {
  const school = BY_ID.get(String(a.school_id ?? ""))
  if (!school) return "Unknown school_id: call find_colleges first."
  const lines = [short(s, school)]
  // Academics: the level's minimum to compete, then the college's own admission figures.
  const division = (s.team ? school.programs.find((p) => p[s.team!])?.division : null) ?? school.programs[0]?.division
  if (division) lines.push(`Academic minimum: ${ELIGIBILITY_MINIMUM[division]}.`)
  const facts = fitForSchool(school.id)
  if (facts) {
    const [satLow, satHigh] = satTotalRange(facts)
    lines.push(
      `Admission figures (US Department of Education College Scorecard; colleges do not publish a minimum GPA there): ${[
        facts.admitRate != null ? `admits ${facts.admitRate}% of applicants` : null,
        satLow != null && satHigh != null ? `middle half of admitted students' SAT ${satLow} to ${satHigh}` : null,
        facts.act[0] != null && facts.act[1] != null ? `ACT ${facts.act[0]} to ${facts.act[1]}` : null,
        facts.gradRate != null ? `${facts.gradRate}% graduate` : null,
        facts.undergrads != null ? `${facts.undergrads.toLocaleString("en-US")} undergraduates` : null,
      ]
        .filter(Boolean)
        .join("; ") || "none published"}.${facts.admissionsUrl ? ` Admissions: ${facts.admissionsUrl}` : ""}`,
    )
  }
  // Division I tier, and the in-state point (Matt, 20 Oct 2026).
  if (division === "NCAA Division I" && s.tiers && s.team !== "womens") {
    const t = d1TierOf(s.tiers, school.id)
    lines.push(`Division I tier: ${t.tier === 1 ? `Tier 1 (No. ${t.rank} in the NWCA Division I coaches poll)` : "Tier 2 (outside the top 10 of the NWCA Division I coaches poll)"}.`)
  }
  if (s.homeState && school.state === s.homeState) {
    const t = division === "NCAA Division I" && s.tiers && s.team !== "womens" ? d1TierOf(s.tiers, school.id) : null
    lines.push(
      t?.tier === 1
        ? inStateLine([spoken(school.name)], STATE_NAMES[s.homeState] ?? s.homeState, s.stars ?? null)
        : "In-state program for this family: programs often recruit wrestlers from their own state a level below their usual recruit.",
    )
  }
  // Athletic admission: what the published figures mean for a recruited wrestler.
  lines.push(athleticAdmissionFacts(school.id, spoken(school.name)))
  // Campus life: Niche's report-card grades, as published on the college's Niche profile.
  const niche = nicheFor(school.id)
  if (niche && Object.keys(niche.grades).length) {
    if (niche.url) s.links[`niche:${school.id}`] = { label: `Niche: ${spoken(school.name)}`, href: niche.url, kind: "source" }
    lines.push(
      `Campus life grades from Niche (niche.com report card, from student reviews and public data; Niche's grades, not ours): ${NICHE_CATEGORIES.filter((c) => niche.grades[c.key])
        .map((c) => `${c.label} ${niche.grades[c.key]}`)
        .join(", ")}. Categories not listed are not graded by Niche for this college.${niche.url ? ` [link: niche:${school.id}]` : ""}`,
    )
  } else lines.push("Campus life grades: Niche publishes none for this college.")
  const fit = s.fit ? collegeFitFor(s.fit, school, null) : null
  if (fit) {
    if (fit.net?.amount != null) lines.push(`Net price: ${money(fit.net.amount)}, the average paid after aid by all aided students (not this family's income)`)
    lines.push(`Fit: athletic: ${fit.lines.athletic.text} Academic: ${fit.lines.academic.text} Cost: ${fit.lines.cost.text}`)
  }
  const staff = staffForSchool(school.id).filter((m) => !s.team || m.teams.includes(s.team))
  lines.push(
    staff.length
      ? `Coaching staff (from the school's site):\n${staff.map((m) => `- ${m.name}, ${m.title}${isHeadCoach(m) ? " (head coach)" : ""}${m.email ? `, ${m.email}` : ""}`).join("\n")}`
      : "Coaching staff: not on file yet; the athletics website lists it.",
  )
  const q = questionnairesForSchool(school.id)
  const qUrl = q.map((x) => (s.team === "womens" ? x.womens : s.team === "mens" ? x.mens : x.mens ?? x.womens)).find(Boolean)
  lines.push(qUrl ? `Recruiting questionnaire: ${qUrl}` : "Recruiting questionnaire: none on file; check the athletics website.")
  // Whether the family has done it, from their own list: an email may only claim it when this says so.
  const stage = s.list.get(school.id)
  const done = stage != null && ["questionnaire", "contacted", "talking", "visited", "offer"].includes(stage)
  lines.push(done ? "The family's list records the questionnaire as done." : "The family has NOT recorded the questionnaire as done: an email must not say it is; suggest filling it out first.")
  const went = await loadWentHere(s.admin, school.id, s.userId, s.team).catch(() => null)
  if (went) {
    lines.push(
      went.wrestlers.length
        ? `Wrestlers from the family's state who went here (newest first):\n${went.wrestlers
            .slice(0, 12)
            .map((w) => `- ${w.name}${w.classYear ? `, Class of ${w.classYear}` : ""}${w.highSchool ? `, ${w.highSchool}` : ""}${w.results.length ? `: ${w.results.join("; ")}` : ""}`)
            .join("\n")}${went.schoolSentence ? `\n${went.schoolSentence}` : ""}`
        : `No wrestler from the family's state has committed here in our records. At the ${went.level.short} level: ${went.level.wrestlers} have${went.level.sentence ? `; ${went.level.sentence}` : ""}.`,
    )
    // True things a wrestler can say about why this college, for an email.
    const mySchool = collegeKey(s.highSchool ?? "")
    const sameSchool = mySchool ? went.wrestlers.filter((w) => collegeKey(w.highSchool ?? "") === mySchool).map((w) => w.name) : []
    const hooks = [
      sameSchool.length ? `${sameSchool.join(" and ")} from the wrestler's own high school went here` : null,
      went.wrestlers.length ? `${went.wrestlers.length} wrestler${went.wrestlers.length === 1 ? "" : "s"} from the family's state went here` : null,
      school.programs[0]?.conference ? `it wrestles in the ${school.programs[0].conference}` : null,
      `it is in ${school.city}, ${school.state}`,
    ].filter(Boolean)
    lines.push(`Facts a wrestler can give for why this college, in an email: ${hooks.join("; ")}.`)
    // Our wrestlers' GPA, never the college's: Scout once called this "UNC's admitted students' GPA".
    if (went.gpa) lines.push(`GPA of ${went.gpa.label}: average ${went.gpa.average.toFixed(2)} (${went.gpa.count} wrestlers, from our profiles). This is our wrestlers' GPA, not the college's admitted students' GPA: the college publishes none; say whose average it is.`)
  }
  return lines.join("\n")
}

function collegeCommits(s: ScoutSession, a: Record<string, unknown>): string {
  const all = s.fit?.snapshot?.commits ?? []
  const division = typeof a.division === "string" ? DIVISION_BY_SHORT[a.division] : undefined
  const rows = all.filter(
    (c) =>
      (!a.school_id || c.schoolId === a.school_id) &&
      (!division || c.division === division) &&
      (typeof a.class_year !== "number" || c.classYear === a.class_year) &&
      (!s.team || !c.gender || c.gender === s.team),
  )
  if (!rows.length) return "No commitments in our records match."
  const sorted = [...rows].sort((x, y) => (y.classYear ?? 0) - (x.classYear ?? 0))
  return `${rows.length} commitment${rows.length === 1 ? "" : "s"}${rows.length > 40 ? "; the newest 40" : ""}:\n${sorted
    .slice(0, 40)
    .map((c) => {
      const school = BY_ID.get(c.schoolId)
      if (school) s.links[`school:${school.id}`] = { label: spoken(school.name), href: `/recruiting/schools/${school.id}`, kind: "college" }
      return `- ${c.name}${c.classYear ? ` (${c.classYear})` : ""}${c.highSchool ? `, ${c.highSchool}` : ""} to ${school ? spoken(school.name) : c.schoolId} (${DIVISION_SHORT[c.division]})${c.results.length ? `: ${c.results.slice(0, 2).join("; ")}` : ""}`
    })
    .join("\n")}`
}

/**
 * The colleges a question names, found in code so Scout looks them up before answering (it
 * answered "what GPA does Mount Olive require?" from nothing rather than calling a tool).
 * Longest names first, so "Mount Olive" is not also "Olive"; at most two.
 */
/** What families call colleges, beyond their names: "UNC", "App State". Exact words only. */
const STATE_WORDS = new Set(Object.values(STATE_NAMES).map((n) => n.toLowerCase()))
const SHORT_NAMES: Record<string, string> = {
  unc: "university-of-north-carolina-at-chapel-hill-north-carolina",
  "unc chapel hill": "university-of-north-carolina-at-chapel-hill-north-carolina",
  "chapel hill": "university-of-north-carolina-at-chapel-hill-north-carolina",
  uncp: "university-of-north-carolina-at-pembroke",
  "unc pembroke": "university-of-north-carolina-at-pembroke",
  pembroke: "university-of-north-carolina-at-pembroke",
  "app state": "appalachian-state-university",
  appalachian: "appalachian-state-university",
}

export function collegesNamedIn(question: string): string[] {
  const q = ` ${question.toLowerCase().replace(/[^a-z0-9& ]+/g, " ")} `
  const found: Array<{ id: string; at: number; len: number }> = []
  for (const [short, id] of Object.entries(SHORT_NAMES)) {
    const at = q.indexOf(` ${short} `)
    if (at >= 0 && BY_ID.has(id)) found.push({ id, at, len: short.length + 100 })
  }
  for (const school of SCHOOLS) {
    const nick = school.name.match(/\(([^)]+)\)/)?.[1]?.toLowerCase()
    // A nickname that is a state ("(North Carolina)" on UNC) names the state, not the college.
    const keys = [collegeKey(school.name), spoken(school.name).toLowerCase(), nick].filter((k): k is string => Boolean(k) && k!.length >= 5 && !STATE_WORDS.has(k!))
    for (const key of keys) {
      const at = q.indexOf(` ${key.replace(/[^a-z0-9& ]+/g, " ")} `)
      if (at >= 0) found.push({ id: school.id, at, len: key.length })
    }
  }
  const out: string[] = []
  for (const f of found.sort((a, b) => b.len - a.len)) {
    if (out.includes(f.id)) continue
    // A shorter name inside a longer one already found is the same mention.
    if (found.some((g) => out.includes(g.id) && g.len > f.len && f.at >= g.at && f.at < g.at + g.len + 1)) continue
    out.push(f.id)
    if (out.length === 2) break
  }
  return out
}

/**
 * Niche grades for two colleges, compared in code category by category ("Dorms: Campbell B, App
 * State C+: Campbell is higher"). The model once read B against C+ and called C+ better.
 */
export function compareNiche(ids: string[]): string | null {
  if (ids.length < 2) return null
  const [a, b] = ids.map((id) => ({ id, name: spoken(BY_ID.get(id)?.name ?? id), g: nicheFor(id)?.grades ?? {} }))
  const lines: string[] = []
  for (const c of NICHE_CATEGORIES) {
    const ga = a.g[c.key], gb = b.g[c.key]
    if (!ga || !gb) continue
    const pa = gradePoints(ga)!, pb = gradePoints(gb)!
    const verdict = pa === pb ? "the same" : `${pa > pb ? a.name : b.name} is higher`
    lines.push(`- ${c.label}: ${a.name} ${ga}, ${b.name} ${gb}: ${verdict}`)
  }
  return lines.length ? `Niche grades compared (computed; use these verdicts exactly):\n${lines.join("\n")}` : null
}

export async function runScoutTool(s: ScoutSession, name: string, args: Record<string, unknown>): Promise<string> {
  if (name === "read_guide") return readGuide(s.guides ?? [], String(args.key ?? ""))
  if (name === "find_colleges") return findColleges(s, args)
  if (name === "college_details") return collegeDetails(s, args)
  if (name === "college_commits") return collegeCommits(s, args)
  return `Unknown tool ${name}.`
}

export const listStage = (status: unknown): CollegeListStatus => (isCollegeListStatus(status) ? status : "interested")
