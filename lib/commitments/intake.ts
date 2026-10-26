/**
 * A commitment report, from whoever has the news (Matt, 26 October 2026).
 *
 * A college coach wrote that they had "been trying to report it within the database but have been
 * having a tough time with that" - the old form saved nothing at all (its insert ran as an
 * anonymous browser and the table refuses those), and it only let the wrestler report their own.
 * Now the wrestler, a parent, a college coach or a high school or club coach can report one.
 *
 * What we already hold is never asked again: pointing at a profile brings the class, school, club
 * and gender with it. What only the reporter knows is asked: the college, the day it was made
 * public, and the link to the post. A wrestler with no profile yet can still be reported - with the
 * few facts we would need to find or make one.
 */
export const SUBMITTER_ROLES = ["athlete", "parent", "college-coach", "hs-coach", "other"] as const
export type SubmitterRole = (typeof SUBMITTER_ROLES)[number]

export const SUBMITTER_ROLE_LABEL: Record<SubmitterRole, string> = {
  athlete: "The wrestler",
  parent: "Parent or family",
  "college-coach": "College coach",
  "hs-coach": "High school or club coach",
  other: "Someone else",
}

/** The classes a profile is made for: never a graduate (Sarissa Tucker). */
export const PROFILE_CLASS_YEARS = [2027, 2028, 2029, 2030] as const

/** The NCAA weights. College starts at 125. */
export const COLLEGE_WEIGHTS = ["125", "133", "141", "149", "157", "165", "174", "184", "197", "285"] as const

export type IntakeInput = {
  athleteId: string | null
  /** Only when there is no profile to point at. */
  athleteName: string | null
  highSchool: string | null
  graduationYear: number | null
  gender: "Male" | "Female" | null
  collegeId: string | null
  /** As typed, when the college is not in our list. */
  collegeName: string | null
  commitmentDate: string | null
  announcementUrl: string | null
  collegeWeightClass: string | null
  intendedMajor: string | null
  photoUrl: string | null
  submitterName: string
  submitterRole: SubmitterRole
  submitterContact: string
}

const text = (v: unknown, max = 200): string | null => {
  const s = String(v ?? "").trim().replace(/\s+/g, " ")
  return s ? s.slice(0, max) : null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const httpUrl = (v: unknown): string | null => {
  const s = text(v, 500)
  if (!s) return null
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    const u = new URL(withScheme)
    return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.toString() : null
  } catch {
    return null
  }
}

/** An email or a phone number with at least ten digits. */
export function contactKind(contact: string): "email" | "phone" | null {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return "email"
  return contact.replace(/\D/g, "").length >= 10 ? "phone" : null
}

/** Today in North Carolina, as YYYY-MM-DD. */
export function todayInNc(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" })
}

export type IntakeResult = { ok: true; value: IntakeInput } | { ok: false; error: string }

export function parseIntake(body: Record<string, unknown>, now: Date = new Date()): IntakeResult {
  const athleteId = text(body.athleteId, 64)
  if (athleteId && !UUID.test(athleteId)) return { ok: false, error: "That profile could not be found. Search for the wrestler again." }
  const athleteName = athleteId ? null : text(body.athleteName, 120)
  if (!athleteId && (!athleteName || athleteName.split(" ").length < 2)) {
    return { ok: false, error: "Choose the wrestler, or type their first and last name." }
  }
  const year = Number(body.graduationYear)
  const graduationYear = Number.isInteger(year) && year >= 2020 && year <= 2035 ? year : null
  if (!athleteId && !(graduationYear && (PROFILE_CLASS_YEARS as readonly number[]).includes(graduationYear))) {
    return { ok: false, error: `Add the wrestler's class year (${PROFILE_CLASS_YEARS[0]} to ${PROFILE_CLASS_YEARS[PROFILE_CLASS_YEARS.length - 1]}).` }
  }
  const gender = body.gender === "Female" ? "Female" : body.gender === "Male" ? "Male" : null

  const collegeId = text(body.collegeId, 64)
  if (collegeId && !UUID.test(collegeId)) return { ok: false, error: "Choose the college again." }
  const collegeName = collegeId ? null : text(body.collegeName, 120)
  if (!collegeId && !collegeName) return { ok: false, error: "Which college did they commit to?" }

  const rawDate = text(body.commitmentDate, 10)
  const commitmentDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null
  if (commitmentDate && commitmentDate > todayInNc(now)) return { ok: false, error: "The commitment date can't be in the future." }

  const weight = text(body.collegeWeightClass, 4)
  const role = SUBMITTER_ROLES.includes(body.submitterRole as SubmitterRole) ? (body.submitterRole as SubmitterRole) : null
  if (!role) return { ok: false, error: "Tell us who you are." }
  const submitterName = text(body.submitterName, 120)
  if (!submitterName) return { ok: false, error: "Add your name, so we can follow up if anything is unclear." }
  const submitterContact = text(body.submitterContact, 160)
  if (!submitterContact || !contactKind(submitterContact)) return { ok: false, error: "Add an email or a cell number, so we can tell you when it's live." }

  return {
    ok: true,
    value: {
      athleteId,
      athleteName,
      highSchool: athleteId ? null : text(body.highSchool, 120),
      graduationYear,
      gender,
      collegeId,
      collegeName,
      commitmentDate: commitmentDate ?? todayInNc(now),
      announcementUrl: httpUrl(body.announcementUrl),
      collegeWeightClass: weight && (COLLEGE_WEIGHTS as readonly string[]).includes(weight) ? weight : null,
      intendedMajor: text(body.intendedMajor, 120),
      photoUrl: httpUrl(body.photoUrl),
      submitterName,
      submitterRole: role,
      submitterContact,
    },
  }
}

/** The text Matt gets. Short: it is read on a lock screen. */
export function staffTextFor(input: {
  athleteName: string
  athleteDetail: string | null
  college: string
  role: SubmitterRole
  submitterName: string
  hasProfile: boolean
  url: string
}): string {
  return [
    `New commitment: ${input.athleteName}${input.athleteDetail ? ` (${input.athleteDetail})` : ""} to ${input.college}.`,
    `From ${input.submitterName}, ${SUBMITTER_ROLE_LABEL[input.role].toLowerCase()}.`,
    input.hasProfile ? null : "No profile matched yet.",
    `Approve: ${input.url}`,
  ]
    .filter(Boolean)
    .join(" ")
}
