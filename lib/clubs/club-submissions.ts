export const CLUB_SUBMISSION_STATUSES = ["pending", "approved", "declined", "needs_info"] as const

export type ClubSubmissionStatus = (typeof CLUB_SUBMISSION_STATUSES)[number]

export type ClubSubmissionRow = {
  id: string
  submitted_by_user_id: string | null
  submitted_by_email: string | null
  submitted_by_name: string | null
  club_name: string
  normalized_name: string | null
  address: string
  city: string | null
  state: string | null
  zip_code: string | null
  contact_phone: string | null
  contact_email: string | null
  website: string | null
  has_youth: boolean
  has_middle_school: boolean
  has_high_school: boolean
  has_mens: boolean
  has_womens: boolean
  has_freestyle_greco: boolean
  notes: string | null
  status: ClubSubmissionStatus
  admin_notes: string | null
  approved_club_id: number | null
  latitude: number | null
  longitude: number | null
  reviewed_by_user_id: string | null
  reviewed_at: string | null
  created_at: string | null
  updated_at: string | null
}

export function sanitizeClubWebsite(value: unknown): string | null {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const parsed = new URL(withScheme)
    if (!["http:", "https:"].includes(parsed.protocol)) return null
    return parsed.toString()
  } catch {
    return raw
  }
}

export function programSummary(row: Pick<
  ClubSubmissionRow,
  "has_youth" | "has_middle_school" | "has_high_school" | "has_mens" | "has_womens" | "has_freestyle_greco"
>): string {
  return [
    row.has_youth ? "Youth" : null,
    row.has_middle_school ? "Middle school" : null,
    row.has_high_school ? "High school" : null,
    row.has_mens ? "Men/boys" : null,
    row.has_womens ? "Women/girls" : null,
    row.has_freestyle_greco ? "Freestyle/Greco" : null,
  ]
    .filter(Boolean)
    .join(", ")
}
