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

export function defaultTocWeightForAthlete(weightclass: string | number | null | undefined): number {
  return parseAthleteWeightClass(weightclass) ?? TOC_WEIGHT_CLASSES[4]
}

export function athleteDisplayClub(row: Record<string, unknown>): string | null {
  const club = row.wrestling_club ?? row.wrestlingClub
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
