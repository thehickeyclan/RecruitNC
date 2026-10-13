import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { mostRecentGraduatedClassYear, seniorClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { buildSchoolIndex, matchSchool } from "@/lib/college-programs/match"
import { resultClauses } from "@/lib/college-programs/outreach-results"
import data from "@/lib/college-programs/programs-2026-27.json"
import { DIVISION_SHORT, primaryDivision, type CollegeDivision, type CollegeMapSchool } from "@/lib/college-programs/types"
import { readWentHereSnapshot, type SnapshotCommit, type WentHereSnapshot } from "@/lib/college-programs/went-here-snapshot"
import {
  asHeadline,
  gpaStats,
  groupSentence,
  parseGpa,
  standingOf,
  summariseStandings,
  type GpaStats,
} from "@/lib/college-programs/went-here-stats"
import { loadAthleteCredentials, loadAthleteCredentialsBatch } from "@/lib/credentials/athlete-credentials"

/**
 * "NC wrestlers who went here" for one school on the college map, and the level it wrestles at.
 *
 * Commitments and results are already public on the site, so recent commits are named. A GPA is
 * never one wrestler's: only an average with its low and high, across at least five (see
 * went-here-stats.ts). A school with too few of its own falls back to its level.
 *
 * Built by a cron for every school at once and saved (went-here-snapshot.ts) - the credential
 * engine is called for each committed wrestler, about half a minute, which is far too much to do
 * inside one card opening.
 */

const SCHOOLS = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS]
const SCHOOL_BY_ID = new Map(SCHOOLS.map((s) => [s.id, s]))
const SCHOOL_INDEX = buildSchoolIndex(SCHOOLS)

/** How many graduating classes back "recent" reaches, counting this year's seniors. */
const CLASSES_BACK = 3

// The credential engine matches unlinked results by name and school, so it needs these exactly.
const COLUMNS =
  'id, name, wrestling_name, "firstName", "lastName", highschool, graduationyear, gender, weightclass, college, college_id, academic_gpa, nhsca_results, super32_results'

export type WentHereWrestler = {
  athleteId: string
  name: string
  classYear: number | null
  highSchool: string | null
  /** Up to two finished lines: "Won the 2025 NCHSAA 4A state title". Empty when we hold no placing. */
  results: string[]
}

/** Run by the cron. Reads every recent commit, their credentials, and the GPA averages - never a GPA itself into the result. */
export async function buildWentHereSnapshot(admin: SupabaseClient): Promise<WentHereSnapshot> {
  const senior = seniorClassYear()
  const classes = Array.from({ length: CLASSES_BACK + 1 }, (_, i) => senior - i)

  const rows: Array<Record<string, unknown>> = []
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await admin.from("athletes").select(COLUMNS).in("graduationyear", classes).range(from, from + 999)
    if (error) throw new Error(`went-here: athletes read failed: ${error.message}`)
    rows.push(...((page ?? []) as unknown as Array<Record<string, unknown>>))
    if ((page ?? []).length < 1000) break
  }

  const { data: colleges, error: collegeError } = await admin.from("colleges").select("id, name")
  if (collegeError) throw new Error(`went-here: colleges read failed: ${collegeError.message}`)
  const collegeName = new Map((colleges ?? []).map((c) => [String(c.id), String(c.name)]))

  // A commitment counts only when it lands on a school on the map; "Undecided" and club teams do not.
  const committed = rows.flatMap((row) => {
    const name = (row.college_id ? collegeName.get(String(row.college_id)) : null) ?? (row.college ? String(row.college) : "")
    const schoolId = name ? matchSchool(SCHOOL_INDEX, name) : null
    const school = schoolId ? SCHOOL_BY_ID.get(schoolId) : null
    return school ? [{ row, school }] : []
  })

  const credentials = await loadAthleteCredentialsBatch(admin, committed.map((c) => c.row))
  const gpas: Array<{ schoolId: string; division: CollegeDivision; gpa: number | null }> = []
  const commits = committed.map(({ row, school }): SnapshotCommit => {
    const id = String(row.id)
    const creds = credentials.get(id) ?? { allAmerican: [], state: [], toc: [], national: [] }
    const full = `${String(row.firstName ?? "").trim()} ${String(row.lastName ?? "").trim()}`.trim()
    const division = primaryDivision(school)
    gpas.push({ schoolId: school.id, division, gpa: parseGpa(row.academic_gpa) })
    return {
      athleteId: id,
      name: full || String(row.name ?? "").trim(),
      classYear: Number(row.graduationyear) || null,
      highSchool: row.highschool && row.highschool !== "Not specified" ? String(row.highschool) : null,
      results: resultClauses(creds, 2).map(asHeadline),
      schoolId: school.id,
      division,
      standing: standingOf(creds),
    }
  })

  // Only groups of five or more leave this function as a number; everything smaller is dropped here.
  const gpaBySchool: Record<string, GpaStats> = {}
  for (const schoolId of new Set(gpas.map((g) => g.schoolId))) {
    const stats = gpaStats(gpas.filter((g) => g.schoolId === schoolId).map((g) => g.gpa))
    if (stats) gpaBySchool[schoolId] = stats
  }
  const gpaByDivision: Partial<Record<CollegeDivision, GpaStats>> = {}
  for (const division of new Set(gpas.map((g) => g.division))) {
    const stats = gpaStats(gpas.filter((g) => g.division === division).map((g) => g.gpa))
    if (stats) gpaByDivision[division] = stats
  }

  return { builtAt: new Date().toISOString(), commits, gpaBySchool, gpaByDivision }
}

export type WentHere = {
  /** Named recent commits to this school, newest class first. */
  wrestlers: WentHereWrestler[]
  /** What this school's own commits had done - only said when there are enough to say "typically". */
  schoolSentence: string | null
  level: { short: string; wrestlers: number; sentence: string | null }
  /** Average with low and high, for the school when it has five GPAs, otherwise its level; null when neither does. */
  gpa: (GpaStats & { scope: "school" | "level"; label: string }) | null
  /** The asking family's own wrestlers still in high school, beside it. */
  yours: Array<{ firstName: string; results: string[]; gpa: number | null }>
}

/** Enough of a school's own commits to describe them as a group rather than as examples. */
const MIN_SCHOOL_GROUP = 5

export async function loadWentHere(admin: SupabaseClient, schoolId: string, userId: string | null): Promise<WentHere | null> {
  const school = SCHOOL_BY_ID.get(schoolId)
  if (!school) return null
  const snapshot = await readWentHereSnapshot()
  // Before the first cron run there is nothing to show; the card leaves the section out.
  if (!snapshot) return null
  const division = primaryDivision(school)
  const { commits } = snapshot

  const here = commits.filter((c) => c.schoolId === schoolId).sort((a, b) => (b.classYear ?? 0) - (a.classYear ?? 0) || a.name.localeCompare(b.name))
  const atLevel = commits.filter((c) => c.division === division)

  const schoolGpa = snapshot.gpaBySchool[schoolId] ?? null
  const levelGpa = snapshot.gpaByDivision[division] ?? null
  const short = DIVISION_SHORT[division]
  const spoken = school.name.replace(/\s*\([^)]*\)\s*/g, " ").trim()

  let yours: WentHere["yours"] = []
  if (userId) {
    const ids = await familyAthleteIds(admin, userId)
    if (ids.length > 0) {
      const graduated = mostRecentGraduatedClassYear()
      const { data: rows } = await admin.from("athletes").select(COLUMNS).in("id", ids)
      const inSchool = ((rows ?? []) as unknown as Array<Record<string, unknown>>).filter(
        (a) => !a.graduationyear || Number(a.graduationyear) > graduated,
      )
      yours = await Promise.all(
        inSchool.map(async (row) => ({
          firstName: String(row.firstName ?? "").trim() || String(row.name ?? "").trim().split(" ")[0] || "Your wrestler",
          results: resultClauses(await loadAthleteCredentials(admin, row), 2).map(asHeadline),
          gpa: parseGpa(row.academic_gpa),
        })),
      )
    }
  }

  return {
    wrestlers: here.map(({ athleteId, name, classYear, highSchool, results }) => ({ athleteId, name, classYear, highSchool, results })),
    schoolSentence: here.length >= MIN_SCHOOL_GROUP ? groupSentence(summariseStandings(here.map((c) => c.standing))) : null,
    level: { short, wrestlers: atLevel.length, sentence: groupSentence(summariseStandings(atLevel.map((c) => c.standing))) },
    gpa: schoolGpa
      ? { ...schoolGpa, scope: "school", label: `NC wrestlers who went to ${spoken}` }
      : levelGpa
        ? { ...levelGpa, scope: "level", label: `NC wrestlers who went ${short}` }
        : null,
    yours,
  }
}
