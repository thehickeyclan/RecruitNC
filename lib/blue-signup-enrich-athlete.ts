/**
 * Map Blue signup form data to athlete profile fields so we enrich the athlete
 * with cell, email, GPA, club, highest achievement, etc. when they sign up for Blue.
 */

export type BlueSignupRow = {
  athlete_first_name?: string | null
  athlete_last_name?: string | null
  athlete_graduation_year?: number | null
  athlete_high_school?: string | null
  athlete_wrestling_club?: string | null
  athlete_weight_class?: string | null
  athlete_cell_phone?: string | null
  athlete_email?: string | null
  athlete_gpa?: string | null
  interest_wrestling_college?: boolean | null
  highest_achievement?: string | null
}

/**
 * Build a partial athlete payload from a Blue signup row for insert or update.
 * Only includes fields that have values. Use with filterPayloadToSchema before insert/update.
 */
export function athleteEnrichmentFromSignup(signup: BlueSignupRow): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const email = (signup.athlete_email ?? "").toString().trim()
  if (email) out.contact_email = email
  const cell = (signup.athlete_cell_phone ?? "").toString().trim()
  if (cell) out.phone = cell
  const gpaRaw = signup.athlete_gpa
  if (gpaRaw != null && gpaRaw !== "") {
    const gpa = typeof gpaRaw === "string" ? parseFloat(gpaRaw) : Number(gpaRaw)
    if (!Number.isNaN(gpa)) out.gpa = gpa
  }
  const club = (signup.athlete_wrestling_club ?? "").toString().trim()
  if (club) out.wrestling_club = club
  const weight = (signup.athlete_weight_class ?? "").toString().trim()
  if (weight) out.weightclass = weight
  const achievement = (signup.highest_achievement ?? "").toString().trim()
  if (achievement) out.additional_achievements = `Highest achievement (Blue signup): ${achievement}`
  return out
}

/** Fields to select from blue_signups when we need to enrich an athlete. */
export const BLUE_SIGNUP_ATHLETE_SELECT =
  "athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_wrestling_club, athlete_weight_class, athlete_cell_phone, athlete_email, athlete_gpa, interest_wrestling_college, highest_achievement"
