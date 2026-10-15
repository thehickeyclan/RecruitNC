import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { mostRecentGraduatedClassYear, seniorClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { coachSurname, eventDates, gradeLabel, resultClauses, spokenSchoolName } from "@/lib/college-programs/outreach-results"
import type { OutreachEvent, OutreachFacts } from "@/lib/college-programs/outreach-templates"
import data from "@/lib/college-programs/programs-2026-27.json"
import { questionnairesForSchool } from "@/lib/college-programs/questionnaires"
import { isHeadCoach, staffForSchool } from "@/lib/college-programs/staff"
import type { CollegeMapSchool } from "@/lib/college-programs/types"
import { loadAthleteCredentials } from "@/lib/credentials/athlete-credentials"
import { getAthleteProfileUrl } from "@/lib/athlete-profile-links"
import { loadLastCompeted } from "@/lib/prospect-last-competed"

/**
 * Everything an "Email the coach" draft needs, gathered for one wrestler and one school.
 *
 * The wrestler must belong to the account asking (claimed by it, or linked as a parent) - the
 * draft carries his phone and email, which nobody else may read. Results come from the credential
 * engine, the weight from his last competition; nothing here is typed by the family or written by
 * a model.
 */

const SCHOOLS = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS]

// The credential engine matches unlinked results by name and school, so it needs these exactly.
const ATHLETE_COLUMNS =
  'id, name, wrestling_name, "firstName", "lastName", highschool, graduationyear, gender, weightclass, location, academic_gpa, academic_interest, "contactEmail", phone, nhsca_results, super32_results'

/** A calendar event with its real dates, so picking it can be saved to the wrestler's schedule. */
export type SuggestedEvent = OutreachEvent & { startDate: string; endDate: string | null }

export type OutreachContext = {
  /** Every wrestler on this account, for the picker. Empty when the account has none. */
  athletes: Array<{ id: string; name: string }>
  facts: OutreachFacts | null
  coach: { name: string; title: string; email: string | null } | null
  /** The rest of that team's staff with an address, to copy: a family rarely knows who runs recruiting. */
  cc: Array<{ name: string; email: string }>
  hasQuestionnaire: boolean
  /** Upcoming events from the RecruitNC calendar, to pick from rather than type. */
  suggestedEvents: SuggestedEvent[]
}

function athleteName(row: Record<string, unknown>): string {
  const full = `${String(row.firstName ?? "").trim()} ${String(row.lastName ?? "").trim()}`.trim()
  return full || String(row.name ?? "").trim()
}

async function upcomingEvents(admin: SupabaseClient): Promise<SuggestedEvent[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data: rows, error } = await admin
    .from("events")
    .select("title, start_date, end_date, location, category")
    .gte("start_date", today)
    .in("category", ["national-tournament", "ncu-dual-tournament", "college-open"])
    .order("start_date", { ascending: true })
    .limit(20)
  // The schedule can always be typed; a calendar that will not load is not a reason to fail the draft.
  if (error) return []
  return (rows ?? []).map((row) => ({
    // Calendar titles carry staff markup ("**ELITE**") that has no business in an email to a coach.
    title: String(row.title ?? "").replace(/\*+[^*]*\*+/g, "").replace(/\s+/g, " ").trim(),
    dates: eventDates(String(row.start_date), row.end_date ? String(row.end_date) : null),
    startDate: String(row.start_date),
    endDate: row.end_date ? String(row.end_date) : null,
    location: row.location ? String(row.location) : null,
  }))
}

export async function loadOutreachContext(
  admin: SupabaseClient,
  userId: string,
  schoolId: string,
  requestedAthleteId: string | null,
): Promise<OutreachContext | { error: string; status: 400 | 404 }> {
  const school = SCHOOLS.find((s) => s.id === schoolId)
  if (!school) return { error: "Unknown school.", status: 404 }

  const ids = await familyAthleteIds(admin, userId)
  const suggestedEvents = await upcomingEvents(admin)
  const hasQuestionnaire = questionnairesForSchool(schoolId).length > 0
  if (ids.length === 0) return { athletes: [], facts: null, coach: null, cc: [], hasQuestionnaire, suggestedEvents }

  const { data: rows, error } = await admin.from("athletes").select(ATHLETE_COLUMNS).in("id", ids)
  if (error) throw new Error(`outreach: athlete lookup failed: ${error.message}`)
  // A graduate is not being recruited; he is not offered as the wrestler writing to a coach.
  const graduated = mostRecentGraduatedClassYear()
  const athletes = ((rows ?? []) as unknown as Array<Record<string, unknown>>).filter(
    (a) => !a.graduationyear || Number(a.graduationyear) > graduated,
  )
  const picker = athletes.map((a) => ({ id: String(a.id), name: athleteName(a) })).sort((a, b) => a.name.localeCompare(b.name))

  // Only a wrestler on this account; an id from anywhere else is ignored, not honoured.
  const athlete = athletes.find((a) => String(a.id) === requestedAthleteId) ?? athletes.find((a) => String(a.id) === picker[0]?.id)
  if (!athlete) return { athletes: picker, facts: null, coach: null, cc: [], hasQuestionnaire, suggestedEvents }

  const athleteId = String(athlete.id)
  const graduationYear = Number(athlete.graduationyear) || null
  const [credentials, lastCompeted] = await Promise.all([
    loadAthleteCredentials(admin, athlete),
    loadLastCompeted(admin, [athleteId], new Map([[athleteId, graduationYear]])),
  ])

  // The staff of the team he would wrestle for: the women's coach for a girl, where there is one.
  const team = String(athlete.gender ?? "").toLowerCase().startsWith("f") ? "womens" : "mens"
  const heads = staffForSchool(schoolId).filter(isHeadCoach)
  const head = heads.find((m) => m.teams.includes(team)) ?? heads[0] ?? null

  const gpa = athlete.academic_gpa == null || athlete.academic_gpa === "" ? null : String(athlete.academic_gpa)
  const facts: OutreachFacts = {
    athleteId,
    firstName: String(athlete.firstName ?? "").trim() || athleteName(athlete).split(" ")[0] || "",
    lastName: String(athlete.lastName ?? "").trim() || athleteName(athlete).split(" ").slice(1).join(" "),
    graduationYear,
    grade: gradeLabel(graduationYear, seniorClassYear()),
    highSchool: athlete.highschool ? String(athlete.highschool).trim() : null,
    hometown: athlete.location ? String(athlete.location).trim() : null,
    // Last competed, not the listed weight, which goes stale; listed only when he has no result yet.
    weight: lastCompeted.get(athleteId)?.weight ?? (athlete.weightclass ? String(athlete.weightclass) : null),
    results: resultClauses(credentials),
    gpa,
    intendedMajor: athlete.academic_interest ? String(athlete.academic_interest).trim() : null,
    profileUrl: getAthleteProfileUrl(athleteId),
    phone: athlete.phone ? String(athlete.phone).trim() : null,
    email: athlete.contactEmail ? String(athlete.contactEmail).trim() : null,
    schoolName: spokenSchoolName(school.name),
    coachLastName: head ? coachSurname(head.name) : null,
  }

  return {
    athletes: picker,
    facts,
    coach: head ? { name: head.name, title: head.title, email: head.email } : null,
    cc: staffForSchool(schoolId)
      .filter((m) => m !== head && m.teams.includes(team) && m.email && m.email !== head?.email)
      .map((m) => ({ name: m.name, email: m.email! })),
    hasQuestionnaire,
    suggestedEvents,
  }
}
