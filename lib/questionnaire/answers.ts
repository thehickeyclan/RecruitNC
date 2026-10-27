import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { shareableProfileUrl } from "@/lib/athlete-profile-links"
import { resultClauses } from "@/lib/college-programs/outreach-results"
import { loadAthleteCredentials } from "@/lib/credentials/athlete-credentials"
import { loadLastCompeted } from "@/lib/prospect-last-competed"
import { ANSWER_FIELDS, cleanAnswers, type Answers } from "./fields"

/**
 * One wrestler's questionnaire answers: what the profile already says, under what the family
 * typed. Stored answers live in questionnaire_answers (scripts/add-questionnaire-answers.sql),
 * a table only the server reads; a profile value is never copied into it, so a GPA updated on
 * the profile reaches the forms unless the family chose to answer differently.
 */

/** Postgres "relation does not exist": the SQL has not been run yet. */
const TABLE_MISSING = "42P01"

const PROFILE_COLUMNS =
  'id, name, wrestling_name, "firstName", "lastName", highschool, graduationyear, gender, weightclass, location, nhsca_results, super32_results, academic_gpa, academic_sat, academic_act, academic_interest, "contactEmail", phone, birthdate, highlight_video_url, "wrestlingClub", "careerRecord", state, is_nc_athlete'

export type LoadedAnswers = {
  available: boolean
  /** What the forms get: the family's answer, else the profile's. */
  values: Answers
  /** The profile's own value for each profile field, to show "from the profile". */
  profile: Answers
  /** Keys the family answered themselves. */
  own: string[]
  updatedAt: string | null
}

export async function profileAnswers(admin: SupabaseClient, athleteId: string): Promise<Answers> {
  const { data } = await admin.from("athletes").select(PROFILE_COLUMNS).eq("id", athleteId).maybeSingle()
  if (!data) return {}
  const row = data as unknown as Record<string, unknown>
  const text = (v: unknown) => (v == null ? "" : String(v).trim())
  const year = Number(row.graduationyear) || null
  const [creds, last] = await Promise.all([
    loadAthleteCredentials(admin, row).catch(() => null),
    loadLastCompeted(admin, [athleteId], new Map([[athleteId, year]])).catch(() => new Map()),
  ])
  // Weight is where he or she last competed, never the profile's stored class alone.
  const weight = (last.get(athleteId) as { weight?: string | number } | undefined)?.weight ?? null
  const results = creds ? resultClauses(creds, 6).map((c) => c.replace(/^I /, "").replace(/^\w/, (x) => x.toUpperCase())) : []
  const nameParts = text(row.name).split(/\s+/)
  const out: Answers = {
    firstName: text(row.firstName) || nameParts[0] || "",
    lastName: text(row.lastName) || nameParts.slice(1).join(" "),
    email: text(row.contactEmail),
    cell: text(row.phone),
    dob: /^\d{4}-\d{2}-\d{2}/.test(text(row.birthdate)) ? text(row.birthdate).slice(0, 10) : "",
    highSchool: text(row.highschool) === "Not specified" ? "" : text(row.highschool),
    gradYear: year ? String(year) : "",
    gpa: text(row.academic_gpa),
    sat: text(row.academic_sat),
    act: text(row.academic_act),
    major: text(row.academic_interest),
    weight: weight ? String(weight).replace(/\s*lbs?$/i, "") : "",
    club: text(row.wrestlingClub),
    record: text(row.careerRecord),
    accolades: results.join("; "),
    video: /^https?:\/\//i.test(text(row.highlight_video_url)) ? text(row.highlight_video_url) : "",
    profileUrl: await shareableProfileUrl(athleteId, row as { state?: string | null; is_nc_athlete?: boolean | null }),
  }
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v)) as Answers
}

export async function loadAnswers(admin: SupabaseClient, athleteId: string): Promise<LoadedAnswers> {
  const [profile, stored] = await Promise.all([
    profileAnswers(admin, athleteId),
    admin.from("questionnaire_answers").select("answers, updated_at").eq("athlete_id", athleteId).maybeSingle(),
  ])
  if (stored.error && stored.error.code !== TABLE_MISSING) console.error("[questionnaire] read failed", stored.error)
  const own = cleanAnswers(stored.data?.answers ?? {})
  return {
    available: !stored.error,
    values: { ...profile, ...own },
    profile,
    own: Object.keys(own),
    updatedAt: stored.data?.updated_at ? String(stored.data.updated_at) : null,
  }
}

/**
 * Save the whole form. A box left equal to the profile's value is not stored, so it keeps
 * following the profile; a cleared box drops the family's answer.
 */
export async function saveAnswers(admin: SupabaseClient, athleteId: string, input: unknown, userId: string): Promise<LoadedAnswers | { error: string }> {
  const profile = await profileAnswers(admin, athleteId)
  const clean = cleanAnswers(input)
  const own = Object.fromEntries(Object.entries(clean).filter(([k, v]) => v !== profile[k]))
  // Only keys this form knows; anything else in an old row is dropped on save.
  const known = new Set(ANSWER_FIELDS.map((f) => f.key))
  for (const k of Object.keys(own)) if (!known.has(k)) delete own[k]
  const { error } = await admin
    .from("questionnaire_answers")
    .upsert({ athlete_id: athleteId, answers: own, updated_at: new Date().toISOString(), updated_by: userId }, { onConflict: "athlete_id" })
  if (error) {
    console.error("[questionnaire] save failed", error)
    return { error: error.code === TABLE_MISSING ? "Saving opens shortly." : "Could not save. Try again." }
  }
  return loadAnswers(admin, athleteId)
}
