import type { SupabaseClient } from "@supabase/supabase-js"
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
  } | null
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

export function confirmPageUrl(athleteId?: string): string {
  const base = "https://app.ncwrestlingunited.com/tournament-of-champions/confirm"
  if (!athleteId) return base
  return `${base}?athlete=${encodeURIComponent(athleteId)}`
}
