/**
 * Turning an approved edit request into an actual profile change.
 *
 * Approving used to set a status and email the family to say it was done, while the profile kept
 * the old value — 61 requests were approved that way. This module is the missing step.
 *
 * A word on the shape: `request_data.currentData` holds the values the submitter is *asking for*,
 * despite the name. It is the "Requested Value" column in the admin UI.
 *
 * Only unambiguous scalar fields are applied. Free text — the `other` boxes and the achievements
 * paragraph — is deliberately left alone: "Fargo 2026 weight is wrong, it should be 144" names a
 * row in another table entirely, and no mapper can act on that safely. Those come back as
 * `manual`, so the caller can tell the difference between "applied" and "still needs a human".
 */

export type EditRequestData = {
  editType?: string | null
  currentData?: {
    bio?: {
      club?: string | null
      other?: string | null
      weight?: string | null
      cellNumber?: string | null
      highSchool?: string | null
      highlightVideo?: string | null
    } | null
    other?: string | null
    academics?: { act?: string | number | null; gpa?: string | number | null; sat?: string | number | null } | null
    achievements?: string | null
  } | null
  description?: string | null
} | null

export type EditRequestPlan = {
  /** Column → value, ready to pass straight to an `athletes` update. Empty when there is nothing to do. */
  updates: Record<string, string | number>
  /** Human-readable notes for anything a person still has to handle. */
  manual: string[]
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) ? n : null
}

/**
 * Match the "(336) 555-1234" convention already in the column.
 *
 * Returns null for anything that is not a phone number. One request asked to set the phone field
 * to the word "Email"; writing that verbatim is worse than leaving the field empty.
 */
function phone(value: unknown): string | null {
  const raw = text(value)
  if (!raw) return null
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  return null
}

export function buildAthleteUpdateFromRequest(data: EditRequestData): EditRequestPlan {
  const updates: Record<string, string | number> = {}
  const manual: string[] = []

  const cd = data?.currentData
  if (!cd) return { updates, manual }

  const bio = cd.bio ?? {}
  const academics = cd.academics ?? {}

  const highSchool = text(bio.highSchool)
  if (highSchool) updates.highschool = highSchool

  const club = text(bio.club)
  if (club) updates.wrestlingClub = club

  const weight = text(bio.weight)
  if (weight) updates.weightclass = weight

  const cell = phone(bio.cellNumber)
  if (cell) updates.phone = cell
  else if (text(bio.cellNumber)) manual.push(`Contact number, not a phone number: ${text(bio.cellNumber)}`)

  const video = text(bio.highlightVideo)
  if (video) updates.highlight_video_url = video

  const gpa = num(academics.gpa)
  if (gpa !== null) updates.academic_gpa = gpa

  const sat = num(academics.sat)
  if (sat !== null) updates.academic_sat = sat

  const act = num(academics.act)
  if (act !== null) updates.academic_act = act

  /**
   * Free text. `achievements` is a text[] on the athlete and this is a paragraph, and the `other`
   * boxes are whatever the family wanted to say — both need a person.
   */
  const achievements = text(cd.achievements)
  if (achievements) manual.push(`Achievements: ${achievements}`)

  const bioOther = text(bio.other)
  if (bioOther) manual.push(`Bio note: ${bioOther}`)

  const other = text(cd.other)
  if (other) manual.push(`Other: ${other}`)

  return { updates, manual }
}
