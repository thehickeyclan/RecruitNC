import type { SupabaseClient } from "@supabase/supabase-js"
import { toE164 } from "@/lib/sms"
import {
  TOC_MAX_CONFIRMED_PER_WEIGHT,
  athleteContactEmail,
  athleteDisplayClub,
  type TocAthleteLookupRow,
} from "@/lib/toc/invitations"

export type TocAthleteWithInvitation = {
  athlete: {
    id: string
    name: string
    school: string | null
    graduationYear: number | null
    weightClass: string | number | null
    club: string | null
    photoUrl: string | null
  }
  invitation: {
    id: string
    status: string
    weightClass: number
    invitedAt: string | null
    confirmedAt: string | null
    paymentStatus: string | null
    paidAt: string | null
  } | null
}

/** Match confirm-page name search — full substring or all tokens (first + last). */
export function matchesAthleteNameSearch(athleteName: string, query: string): boolean {
  const name = athleteName.trim().toLowerCase()
  const q = query.trim().toLowerCase()
  if (q.length < 2 || !name) return false
  if (name.includes(q)) return true
  const tokens = q.split(/\s+/).filter(Boolean)
  return tokens.length > 0 && tokens.every((tok) => name.includes(tok))
}

export function mapAthleteRow(row: Record<string, unknown>): TocAthleteLookupRow {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    highschool: typeof row.highschool === "string" ? row.highschool : null,
    graduationyear: typeof row.graduationyear === "number" ? row.graduationyear : null,
    weightclass:
      typeof row.weightclass === "number" || typeof row.weightclass === "string" ? row.weightclass : null,
    wrestling_club: athleteDisplayClub(row),
    photourl: typeof row.photourl === "string" ? row.photourl : null,
  }
}

export function toAthleteWithInvitation(
  athleteRow: Record<string, unknown>,
  invitation: Record<string, unknown> | null,
): TocAthleteWithInvitation {
  const athlete = mapAthleteRow(athleteRow)
  return {
    athlete: {
      id: athlete.id,
      name: athlete.name,
      school: athlete.highschool,
      graduationYear: athlete.graduationyear,
      weightClass: athlete.weightclass,
      club: athlete.wrestling_club,
      photoUrl: athlete.photourl,
    },
    invitation: invitation
      ? {
          id: String(invitation.id),
          status: String(invitation.status),
          weightClass: Number(invitation.weight_class),
          invitedAt: typeof invitation.invited_at === "string" ? invitation.invited_at : null,
          confirmedAt: typeof invitation.confirmed_at === "string" ? invitation.confirmed_at : null,
          paymentStatus:
            typeof invitation.payment_status === "string" ? invitation.payment_status : null,
          paidAt: typeof invitation.paid_at === "string" ? invitation.paid_at : null,
        }
      : null,
  }
}

export async function countConfirmedAtWeight(
  admin: SupabaseClient,
  weightClass: number,
  excludeInvitationId?: string,
): Promise<number> {
  let query = admin
    .from("toc_invitations")
    .select("id", { count: "exact", head: true })
    .eq("weight_class", weightClass)
    .eq("status", "confirmed")

  if (excludeInvitationId) {
    query = query.neq("id", excludeInvitationId)
  }

  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function assertWeightClassHasCapacity(
  admin: SupabaseClient,
  weightClass: number,
  excludeInvitationId?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const count = await countConfirmedAtWeight(admin, weightClass, excludeInvitationId)
  if (count >= TOC_MAX_CONFIRMED_PER_WEIGHT) {
    return {
      ok: false,
      message: `The ${weightClass} lb bracket is full (${TOC_MAX_CONFIRMED_PER_WEIGHT} confirmed). Contact ${process.env.TOC_CONTACT_EMAIL ?? "info@ncwrestlingunited.com"}.`,
    }
  }
  return { ok: true }
}

export async function resolveAthleteNotificationEmails(
  admin: SupabaseClient,
  athleteId: string,
  athleteRow?: Record<string, unknown>,
): Promise<string[]> {
  const emails = new Set<string>()

  let row = athleteRow
  if (!row) {
    const { data } = await admin.from("athletes").select("*").eq("id", athleteId).maybeSingle()
    row = (data as Record<string, unknown> | null) ?? undefined
  }

  const athleteEmail = row ? athleteContactEmail(row) : null
  if (athleteEmail) emails.add(athleteEmail)

  const { data: links } = await admin.from("parent_athlete_links").select("user_id").eq("athlete_id", athleteId)

  const userIds = (links ?? []).map((l) => l.user_id).filter(Boolean)
  if (userIds.length > 0) {
    const { data: profiles } = await admin.from("user_profiles").select("email").in("user_id", userIds)
    for (const profile of profiles ?? []) {
      if (typeof profile.email === "string" && profile.email.trim()) {
        emails.add(profile.email.trim().toLowerCase())
      }
    }
  }

  return Array.from(emails)
}

export type TocAthleteNotificationPhone = {
  label: string
  e164: string
  display: string
}

/** Athlete cell/phone first, then linked parent cell phones on user_profiles. */
export async function resolveAthleteNotificationPhones(
  admin: SupabaseClient,
  athleteId: string,
  athleteRow?: Record<string, unknown>,
): Promise<TocAthleteNotificationPhone[]> {
  const phones: TocAthleteNotificationPhone[] = []
  const seen = new Set<string>()

  let row = athleteRow
  if (!row) {
    const { data } = await admin.from("athletes").select("*").eq("id", athleteId).maybeSingle()
    row = (data as Record<string, unknown> | null) ?? undefined
  }

  const addPhone = (label: string, raw: string | null | undefined) => {
    const e164 = toE164(raw)
    if (!e164 || seen.has(e164)) return
    seen.add(e164)
    phones.push({ label, e164, display: raw?.trim() ?? e164 })
  }

  if (row) {
    for (const key of ["cell", "cell_number", "phone"]) {
      const value = row[key]
      if (typeof value === "string" && value.trim()) {
        addPhone("Athlete", value)
        break
      }
    }
  }

  const { data: links } = await admin.from("parent_athlete_links").select("user_id").eq("athlete_id", athleteId)
  const userIds = (links ?? []).map((l) => l.user_id).filter(Boolean)
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("full_name, first_name, cell_phone")
      .in("user_id", userIds)
    for (const profile of profiles ?? []) {
      const name =
        (typeof profile.full_name === "string" && profile.full_name.trim()) ||
        (typeof profile.first_name === "string" && profile.first_name.trim()) ||
        "Parent"
      addPhone(name, typeof profile.cell_phone === "string" ? profile.cell_phone : null)
    }
  }

  return phones
}

export const TOC_EVENT_PAGE_URL = "https://app.ncwrestlingunited.com/tournament-of-champions"

export function eventPageUrl(): string {
  return TOC_EVENT_PAGE_URL
}

export function confirmPageUrl(athleteId?: string): string {
  const base = "https://app.ncwrestlingunited.com/tournament-of-champions/confirm"
  if (!athleteId?.trim()) return base
  return `${base}?athlete=${encodeURIComponent(athleteId.trim())}`
}

export function registrationPayPageUrl(athleteId?: string): string {
  const base = "https://app.ncwrestlingunited.com/tournament-of-champions/register/pay"
  if (!athleteId?.trim()) return base
  return `${base}?athlete=${encodeURIComponent(athleteId.trim())}`
}
