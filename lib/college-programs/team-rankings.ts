/**
 * National team rankings for the college pages (Matt, 13 Oct 2026): when a family opens a school
 * they see where its team is ranked.
 *
 * **The source is the NWCA coaches polls**, read from the National Wrestling Coaches
 * Association's own site. They are the rankings ncaa.com shows; ncaa.com itself refuses automated
 * readers, and the NWCA is where the poll is published first. A weekly job
 * (/api/cron/college-team-rankings) reads the newest poll stories and saves the result.
 *
 * What this will and will not do:
 *
 * - **Only polls published as a table are read.** Division I men, Division III men, NAIA men,
 *   junior college men and the NCAA women's poll are. The Division II men's poll is published as
 *   a picture, and a ranking is never read off a picture - a misread digit is a wrong ranking
 *   with our name on it. A level with no readable poll shows nothing.
 * - **A team is matched to a college exactly or not at all.** Polls write "Penn State" and
 *   "Life (Ga.)"; the map writes formal names. A poll name reaches a school through its own
 *   name, or through POLL_NAMES below, among the colleges that wrestle at that level only. A name
 *   that reaches nothing is left out and reported by the job, never guessed.
 * - **Which poll a story holds is worked out from the teams in it**, not from its headline -
 *   headlines are written for fans ("Wartburg rolls into 2026...") and name no level.
 * - **Every ranking carries its poll's date.** Out of season the newest poll is last season's
 *   final one, and it is shown as that.
 *
 * Pure: no network, no storage. The job and the snapshot live beside this file.
 */
import { buildSchoolIndex, nameKey } from "@/lib/college-programs/match"
import type { CollegeDivision } from "@/lib/college-programs/types"

export type PollRow = { rank: number; team: string; record: string | null; points: number | null; previous: string | null }
export type PollTable = { headers: string[]; rows: PollRow[]; kind: "poll" | "dual" }

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;|&#8217;/g, "'")
    .replace(/[­​]/g, "")
    .replace(/\s+/g, " ")
    .trim()

const cellsOf = (row: string) => [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => text(m[1]))

/** Every ranking table in a poll story. A table with no rank and team column is not one. */
export function parsePollTables(html: string): PollTable[] {
  const tables: PollTable[] = []
  for (const table of html.match(/<table[\s\S]*?<\/table>/gi) ?? []) {
    const rows = (table.match(/<tr[\s\S]*?<\/tr>/gi) ?? []).map(cellsOf).filter((r) => r.length > 0)
    if (rows.length < 6) continue
    const headers = rows[0]
    const col = (re: RegExp) => headers.findIndex((h) => re.test(h))
    const rankCol = col(/^rank$/i)
    const teamCol = col(/^(team|institution)/i)
    if (rankCol < 0 || teamCol < 0) continue
    // The mid-major poll ranks a subset of Division I; it would overwrite the national ranking.
    if (headers.some((h) => /all-sports/i.test(h))) continue
    const recordCol = col(/record/i)
    const pointsCol = col(/points|pts/i)
    const previousCol = col(/prev|prv|last time|final rank/i)
    const parsed: PollRow[] = []
    for (const r of rows.slice(1)) {
      const rank = Number(String(r[rankCol] ?? "").replace(/[^0-9]/g, ""))
      // "Penn State (16)": the bracket is first-place votes. "Life (Ga.)" keeps its state.
      const team = String(r[teamCol] ?? "").replace(/\s*\(\d+\)\s*$/, "").trim()
      if (!rank || !team) continue
      const points = pointsCol >= 0 ? Number(String(r[pointsCol]).replace(/[^0-9.]/g, "")) : NaN
      parsed.push({
        rank,
        team,
        record: recordCol >= 0 && r[recordCol] ? r[recordCol].replace(/[()]/g, "").trim() || null : null,
        points: Number.isFinite(points) && String(r[pointsCol] ?? "").trim() !== "" ? points : null,
        previous: previousCol >= 0 && r[previousCol] ? r[previousCol] : null,
      })
    }
    if (parsed.length >= 5) tables.push({ headers, rows: parsed, kind: pointsCol < 0 && recordCol >= 0 ? "dual" : "poll" })
  }
  return tables
}

export type PollGender = "mens" | "womens"

/** Women's polls say so in the headline; the rest are men's. Soft hyphens are stripped first. */
export function pollGender(title: string): PollGender {
  return /wom[ae]n/i.test(title.replace(/[­​]/g, "")) ? "womens" : "mens"
}

export const DIVISIONS: CollegeDivision[] = ["NCAA Division I", "NCAA Division II", "NCAA Division III", "NAIA", "NJCAA"]

export type PollSchool = School
type School = { id: string; name: string; state: string; programs: Array<{ division: CollegeDivision; mens: boolean; womens: boolean }> }

/**
 * Poll spelling -> map school id, for the names a poll writes that no key of the school's formal
 * name reaches. Each was checked against the college's level, state and conference in the poll.
 * Keyed by the exact poll spelling, lower-cased.
 */
export const POLL_NAMES: Record<string, string> = {
  // NCAA Division III
  tcnj: "the-college-of-new-jersey",
  nyu: "new-york-university",
  rit: "rochester-institute-of-technology",
  jwu: "johnson-wales-university-ri",
  stevens: "stevens-institute-of-technology",
  york: "york-college-of-pennsylvania",
  uscga: "u-s-coast-guard-academy",
  "coast guard": "u-s-coast-guard-academy",
  milikin: "millikin-university", // the poll's own misspelling, 20 Feb 2026
  "uw la crosse": "university-of-wisconsin-la-crosse",
  "uw eau claire": "university-of-wisconsin-eau-claire",
  "uw whitewater": "university-of-wisconsin-whitewater",
  "uw oshkosh": "university-of-wisconsin-oshkosh",
  "uw platteville": "university-of-wisconsin-platteville",
  "uw stevens point": "university-of-wisconsin-stevens-point",
  // NAIA
  "indiana tech": "indiana-institute-of-technology",
  "embry riddle (ariz.)": "embry-riddle-aeronautical-university-prescott",
  "concordia (neb.)": "concordia-university-nebraska",
  // NCAA women
  "emmanuel (ga)": "emmanuel-university",
  "emmanuel (ga.)": "emmanuel-university",
}

/** Poll names are looked up without regard to case or to a hyphen against a space ("UW-La Crosse"). */
const aliasKey = (team: string) =>
  team
    .trim()
    .toLowerCase()
    .replace(/[-\u2013\u2014]/g, " ")
    .replace(/\s+/g, " ")

export type PollMatcher = (team: string) => string | null

/**
 * What a poll covers. The men's polls are one per level. The NCAA women's poll is one poll for
 * every NCAA division - women's wrestling has a single national championship - so its pool is
 * all three.
 */
export type PollScope = CollegeDivision | "NCAA women"

const NCAA: CollegeDivision[] = ["NCAA Division I", "NCAA Division II", "NCAA Division III"]
const divisionsIn = (scope: PollScope): CollegeDivision[] => (scope === "NCAA women" ? NCAA : [scope])

export const scopesFor = (gender: PollGender): PollScope[] => (gender === "womens" ? ["NCAA women", "NAIA", "NJCAA"] : DIVISIONS)

/** A matcher over the colleges a poll covers, for one of men's or women's. */
export function pollMatcher(schools: School[], scope: PollScope, gender: PollGender, names = POLL_NAMES): PollMatcher {
  const divisions = divisionsIn(scope)
  const pool = schools.filter((s) => s.programs.some((p) => divisions.includes(p.division) && p[gender]))
  const ids = new Set(pool.map((s) => s.id))
  const index = buildSchoolIndex(pool)
  return (team) => {
    const alias = names[aliasKey(team)]
    if (alias) return ids.has(alias) ? alias : null
    return index.get(nameKey(team)) ?? index.get(nameKey(team.replace(/\([^)]*\)/g, ""))) ?? null
  }
}

/**
 * Which level a table ranks: the one whose colleges most of its teams match. Under half matched
 * means we do not know what the table is, and it is dropped.
 */
export function classifyPoll(schools: School[], table: PollTable, gender: PollGender): { scope: PollScope; matched: number } | null {
  let best: { scope: PollScope; matched: number } | null = null
  for (const scope of scopesFor(gender)) {
    const match = pollMatcher(schools, scope, gender)
    const matched = table.rows.filter((r) => match(r.team)).length
    if (!best || matched > best.matched) best = { scope, matched }
  }
  return best && best.matched * 2 >= table.rows.length ? best : null
}

export type TeamRanking = {
  schoolId: string
  scope: PollScope
  gender: PollGender
  rank: number
  /** How many teams the poll ranks: "No. 4 of 25". */
  of: number
  record: string | null
  pollName: string
  /** The day the poll story was published, YYYY-MM-DD. */
  pollDate: string
  sourceUrl: string
}

export const POLL_LABEL: Record<CollegeDivision, string> = {
  "NCAA Division I": "NWCA Division I coaches poll",
  "NCAA Division II": "NWCA Division II coaches poll",
  "NCAA Division III": "NWCA Division III coaches poll",
  NAIA: "NAIA coaches poll",
  NJCAA: "NJCAA coaches poll",
}

export const pollName = (scope: PollScope, gender: PollGender) =>
  scope === "NCAA women" ? "NWCA NCAA women's coaches poll" : `${POLL_LABEL[scope]}${gender === "womens" ? ", women" : ""}`

/** "No. 4 of 25 in the NWCA Division I coaches poll, February 24, 2026 (15-1)". */
export function rankingSentence(r: TeamRanking): string {
  const date = new Date(`${r.pollDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
  return `No. ${r.rank} of ${r.of} in the ${r.pollName}, ${date}${r.record ? ` (${r.record})` : ""}`
}
