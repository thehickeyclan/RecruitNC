import type { SupabaseClient } from "@supabase/supabase-js"
import {
  AAU_SCHOLASTIC_DUALS_2026_ROSTER,
  type AauScholasticRosterRow,
} from "@/lib/aau-scholastic-duals-2026-roster"

export function normalizePersonName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase()
}

function athleteRowFullName(row: Record<string, unknown>): string {
  const name = (row.name as string)?.trim()
  if (name) return name
  const first = (row.firstname ?? row.firstName ?? row.first_name) as string | undefined
  const last = (row.lastname ?? row.lastName ?? row.last_name) as string | undefined
  return [first, last].filter(Boolean).join(" ").trim()
}

/** AAU roster weight label → checkout weight class (e.g. "106+5" → "106", "HWT" → "285"). */
export function aauWeightClassFromRosterLabel(weightLabel: string): string {
  const u = weightLabel.trim().toUpperCase()
  if (u === "HWT") return "285"
  const plusFive = /^(\d+)\+5$/.exec(weightLabel.trim())
  if (plusFive) return plusFive[1]
  const digits = weightLabel.replace(/\D/g, "")
  return digits || "285"
}

export function findAauRosterRowByWrestlerName(firstName: string, lastName: string): AauScholasticRosterRow | null {
  const want = normalizePersonName(`${firstName} ${lastName}`)
  if (!want) return null
  for (const row of AAU_SCHOLASTIC_DUALS_2026_ROSTER) {
    if (row.openSlot || !row.wrestler.trim()) continue
    if (normalizePersonName(row.wrestler) === want) return row
  }
  return null
}

async function findAthleteRowByFullName(
  admin: SupabaseClient,
  fullName: string,
): Promise<Record<string, unknown> | null> {
  const want = normalizePersonName(fullName)
  if (!want) return null
  const parts = want.split(" ")
  const last = parts[parts.length - 1] ?? ""
  if (!last) return null

  const { data: rows, error } = await admin
    .from("athletes")
    .select(
      "id, name, firstname, lastname, firstName, lastName, contact_email, phone, highschool, graduationyear, weightclass, wrestling_club, wrestlingclub, dob, date_of_birth",
    )
    .or(`name.ilike.%${last}%,lastname.ilike.%${last}%`)
    .limit(40)

  if (error || !rows?.length) return null

  for (const row of rows as Record<string, unknown>[]) {
    if (normalizePersonName(athleteRowFullName(row)) === want) return row
  }
  return null
}

function pickString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim()
    if (typeof v === "number" && Number.isFinite(v)) return String(v)
  }
  return ""
}

export type AauResolvedRegistrationAthlete = {
  athleteEmail: string
  athletePhone: string | null
  athleteDob: string | null
  highSchool: string
  graduationYear: string
  primaryWeight: string
  clubTeam: string | null
  athleteId: string | null
}

/** Fill registration fields from AAU roster + RecruitNC athlete profile when possible. */
export async function resolveAauScholasticRegistrationAthlete(
  admin: SupabaseClient,
  input: { firstName: string; lastName: string; parentEmail: string },
): Promise<AauResolvedRegistrationAthlete> {
  const fullName = `${input.firstName} ${input.lastName}`.trim()
  const roster = findAauRosterRowByWrestlerName(input.firstName, input.lastName)
  const profile = await findAthleteRowByFullName(admin, fullName)

  const athleteEmail =
    pickString(profile?.contact_email) || input.parentEmail.trim()
  const athletePhone = pickString(roster?.cell, profile?.phone) || null
  const athleteDob = pickString(roster?.dob, profile?.dob, profile?.date_of_birth) || null
  const highSchool = pickString(profile?.highschool) || "NC United"
  const graduationYear = pickString(profile?.graduationyear) || "2028"
  const primaryWeight =
    pickString(
      roster ? aauWeightClassFromRosterLabel(roster.weightLabel) : "",
      profile?.weightclass,
    ) || "TBD"
  const clubTeam = pickString(profile?.wrestling_club, profile?.wrestlingclub) || null
  const athleteId = typeof profile?.id === "string" ? profile.id : null

  return {
    athleteEmail,
    athletePhone,
    athleteDob,
    highSchool,
    graduationYear,
    primaryWeight,
    clubTeam,
    athleteId,
  }
}
