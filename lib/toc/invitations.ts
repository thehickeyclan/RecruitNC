import { z } from "zod"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

export const TOC_MAX_CONFIRMED_PER_WEIGHT = 8 as const

export const TOC_JACKET_SIZES = ["AS", "AM", "AL", "AXL", "A2XL", "A3XL"] as const

export type TocInvitationStatus = "nominated" | "invited" | "confirmed" | "declined" | "withdrew"

export type TocInvitationRow = {
  id: string
  athlete_id: string
  weight_class: number
  seed: number | null
  status: TocInvitationStatus
  invited_at: string | null
  confirmed_at: string | null
  jacket_size: string | null
  medical_notes: string | null
  photo_release_accepted: boolean | null
  weight_acknowledgment: boolean | null
  usaw_acknowledgment: boolean | null
  attendance_acknowledgment: boolean | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type TocAthleteLookupRow = {
  id: string
  name: string
  highschool: string | null
  graduationyear: number | null
  weightclass: string | number | null
  wrestling_club: string | null
  photourl: string | null
}

export const tocAthleteConfirmSchema = z.object({
  athleteId: z.string().uuid(),
  weightClass: z.coerce
    .number()
    .refine((n) => TOC_WEIGHT_CLASSES.includes(n as (typeof TOC_WEIGHT_CLASSES)[number]), "Invalid weight class"),
  jacketSize: z.enum(TOC_JACKET_SIZES),
  medicalNotes: z.string().max(2000).optional().nullable(),
  attendanceAcknowledgment: z.literal(true),
  weightAcknowledgment: z.literal(true),
  usawAcknowledgment: z.literal(true),
  photoReleaseAccepted: z.literal(true),
  registrationFeeAcknowledgment: z.literal(true),
})

export type TocAthleteConfirmInput = z.infer<typeof tocAthleteConfirmSchema>

export const tocAdminInviteSchema = z.object({
  athleteId: z.string().uuid(),
  weightClass: z.coerce
    .number()
    .refine((n) => TOC_WEIGHT_CLASSES.includes(n as (typeof TOC_WEIGHT_CLASSES)[number]), "Invalid weight class"),
  notes: z.string().max(2000).optional().nullable(),
  sendEmail: z.boolean().optional().default(true),
})

export function parseAthleteWeightClass(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null
  const n = typeof value === "number" ? value : parseInt(String(value).replace(/[^\d]/g, ""), 10)
  if (!Number.isFinite(n)) return null
  return TOC_WEIGHT_CLASSES.includes(n as (typeof TOC_WEIGHT_CLASSES)[number]) ? n : null
}

/** Nearest TOC bracket when profile weight is missing or not an exact college class. */
export function suggestTocInviteWeight(weightclass: string | number | null | undefined): number {
  const exact = parseAthleteWeightClass(weightclass)
  if (exact != null) return exact

  const n =
    typeof weightclass === "number"
      ? weightclass
      : parseInt(String(weightclass ?? "").replace(/[^\d]/g, ""), 10)
  if (!Number.isFinite(n)) return TOC_WEIGHT_CLASSES[4]

  return TOC_WEIGHT_CLASSES.reduce((best, w) => (Math.abs(w - n) < Math.abs(best - n) ? w : best))
}

export function tocWeightProfileHint(
  weightclass: string | number | null | undefined,
  invitedWeight: number,
): string {
  const profileNum = parseInt(String(weightclass ?? "").replace(/[^\d]/g, ""), 10)
  if (!Number.isFinite(profileNum)) {
    return "No weight on their RecruitNC profile — you pick the TOC bracket for this invite."
  }
  const exact = parseAthleteWeightClass(weightclass)
  if (exact != null) {
    return `RecruitNC profile: ${exact} lbs (exact TOC class).`
  }
  const suggested = suggestTocInviteWeight(weightclass)
  if (invitedWeight === suggested) {
    return `RecruitNC profile: ${profileNum} lbs — not a TOC class; defaulting to nearest bracket (${suggested} lbs). Change if needed.`
  }
  return `RecruitNC profile: ${profileNum} lbs — you chose ${invitedWeight} lbs for this invite.`
}

export function defaultTocWeightForAthlete(weightclass: string | number | null | undefined): number {
  return suggestTocInviteWeight(weightclass)
}

export function athleteDisplayClub(row: Record<string, unknown>): string | null {
  const club = row.wrestling_club ?? row.wrestlingClub ?? row.wrestlingclub ?? row.club
  return typeof club === "string" && club.trim() ? club.trim() : null
}

export function athleteContactEmail(row: Record<string, unknown>): string | null {
  for (const key of ["contact_email", "contactEmail", "email"]) {
    const v = row[key]
    if (typeof v === "string" && v.trim()) return v.trim().toLowerCase()
  }
  return null
}

export function firstNameFromAthleteName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

const TOC_ATHLETE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** RecruitNC athlete ids are UUIDs — reject doc placeholders like `{athlete-uuid}`. */
export function isTocAthleteId(id: string | null | undefined): id is string {
  return typeof id === "string" && TOC_ATHLETE_UUID_RE.test(id.trim())
}

export const TOC_INVALID_ATHLETE_LINK_MESSAGE =
  "That link isn’t valid. Search for your name below, or use the confirm link from your invitation email."

/** Display grad year as class year ('27), not full 2027. */
export function formatTocGradYear(year: number | null | undefined): string | null {
  if (year == null || !Number.isFinite(year)) return null
  return `'${String(Math.round(year)).slice(-2)}`
}
