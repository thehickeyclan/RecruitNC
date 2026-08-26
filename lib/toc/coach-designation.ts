/**
 * Corner coach designations — the rules, kept out of the route so they can be tested.
 *
 * A designation is one athlete naming one coach. The same coach named by twelve families is
 * twelve rows and one lanyard, and both readings matter: the check-in desk needs the coach, the
 * mat needs the athlete.
 */

/** Two per athlete. A cap on who is credentialed, not on who may stand up during a match. */
export const MAX_COACHES_PER_ATHLETE = 2

export type CoachDesignationInput = {
  coachName?: unknown
  coachEmail?: unknown
  coachPhone?: unknown
  relationship?: unknown
}

export type CoachDesignation = {
  coachName: string
  coachEmail: string | null
  coachPhone: string | null
  relationship: string | null
  /** Email where we have one, otherwise the digits of the phone. See {@link coachKeyFor}. */
  coachKey: string
  phoneKey: string | null
}

/** Digits only, so "(919) 555-0100" and "919-555-0100" are one number. */
export function phoneKeyFor(phone: string): string | null {
  const digits = phone.replace(/\D/g, "")
  // Ten digits, or eleven starting with a US country code.
  if (digits.length === 10) return digits
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1)
  return null
}

/**
 * The dedupe key: what collapses one coach named by twelve families into one lanyard.
 *
 * Email when we have it, the phone otherwise. Families may give either, which means a coach given
 * by email on one form and by phone on another arrives as two people — the admin review flags
 * same-name coaches so that can be merged by hand. Better than refusing a designation from a
 * parent who only has their coach's number.
 */
export function coachKeyFor(email: string | null, phone: string | null): string | null {
  const cleanEmail = (email ?? "").trim().toLowerCase()
  if (cleanEmail) return cleanEmail
  const digits = phoneKeyFor(phone ?? "")
  return digits ? `tel:${digits}` : null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateCoachDesignation(
  input: CoachDesignationInput,
): { ok: true; value: CoachDesignation } | { ok: false; error: string } {
  const coachName = String(input.coachName ?? "").trim()
  const rawEmail = String(input.coachEmail ?? "").trim()
  const rawPhone = String(input.coachPhone ?? "").trim()

  if (coachName.length < 2) return { ok: false, error: "Enter the coach's full name." }
  if (rawEmail && !EMAIL.test(rawEmail)) return { ok: false, error: "That coach email does not look right." }
  if (rawPhone && !phoneKeyFor(rawPhone)) return { ok: false, error: "That coach phone number does not look right." }

  // One way to reach them is the minimum: without it they cannot be told they are credentialed,
  // and there is nothing to dedupe them by.
  if (!rawEmail && !rawPhone) {
    return { ok: false, error: "Give the coach's email or mobile number so we can reach them." }
  }

  const coachKey = coachKeyFor(rawEmail || null, rawPhone || null)
  if (!coachKey) return { ok: false, error: "Give the coach's email or mobile number so we can reach them." }

  const relationship = String(input.relationship ?? "").trim()
  return {
    ok: true,
    value: {
      coachName,
      coachEmail: rawEmail || null,
      coachPhone: rawPhone || null,
      relationship: relationship || null,
      coachKey,
      phoneKey: phoneKeyFor(rawPhone),
    },
  }
}

/**
 * Whether this submission fits alongside what the athlete already has.
 *
 * Re-naming a coach already on file is an edit, not a third coach — otherwise a family fixing a
 * typo in a phone number would be told they are over the limit.
 */
export function fitsWithinCap(
  existingKeys: string[],
  incoming: CoachDesignation[],
): { ok: true } | { ok: false; error: string } {
  const keys = new Set(existingKeys)
  for (const coach of incoming) keys.add(coach.coachKey)
  if (keys.size > MAX_COACHES_PER_ATHLETE) {
    return {
      ok: false,
      error: `Each wrestler may designate up to ${MAX_COACHES_PER_ATHLETE} corner coaches. Contact us to change who is already on file.`,
    }
  }
  return { ok: true }
}

/** Two coaches with the same email are one coach, whatever the form says. */
export function dedupeIncoming(coaches: CoachDesignation[]): CoachDesignation[] {
  const seen = new Map<string, CoachDesignation>()
  for (const coach of coaches) if (!seen.has(coach.coachKey)) seen.set(coach.coachKey, coach)
  return [...seen.values()]
}

export type CheckInCoach = {
  coachKey: string
  coachName: string
  coachEmail: string
  coachPhone: string | null
  status: string
  athletes: { athleteName: string; weightClass: number | null; relationship: string | null }[]
}

/**
 * The check-in list: one row per coach, with everyone they corner.
 *
 * Rows arrive one per athlete-coach pair. The desk hands out one lanyard per person, so this is
 * the shape that governs the door — and the athlete list is what settles an argument about
 * whether somebody belongs on the floor.
 */
export function toCheckInList(
  rows: {
    coach_key: string
    coach_name: string
    coach_email: string
    coach_phone: string | null
    status: string
    athlete_name: string
    weight_class: number | null
    relationship: string | null
  }[],
): CheckInCoach[] {
  const byCoach = new Map<string, CheckInCoach>()
  for (const row of rows) {
    const existing = byCoach.get(row.coach_key)
    const athlete = {
      athleteName: row.athlete_name,
      weightClass: row.weight_class,
      relationship: row.relationship,
    }
    if (existing) {
      existing.athletes.push(athlete)
      // A coach approved for one wrestler is an approved coach; the lanyard is per person.
      if (row.status === "approved") existing.status = "approved"
      continue
    }
    byCoach.set(row.coach_key, {
      coachKey: row.coach_key,
      coachName: row.coach_name,
      coachEmail: row.coach_email,
      coachPhone: row.coach_phone,
      status: row.status,
      athletes: [athlete],
    })
  }

  for (const coach of byCoach.values()) {
    coach.athletes.sort((a, b) => (a.weightClass ?? 0) - (b.weightClass ?? 0))
  }
  return [...byCoach.values()].sort(
    (a, b) => b.athletes.length - a.athletes.length || a.coachName.localeCompare(b.coachName),
  )
}
