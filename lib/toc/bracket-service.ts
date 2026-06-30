import type { SupabaseClient } from "@supabase/supabase-js"
import { buildEightManDeDraw, validateBracketParticipants } from "@/lib/toc/eight-man-de-bracket"
import type { TocBracketDraw, TocBracketDrawSummary, TocBracketParticipant } from "@/lib/toc/bracket-types"
import { TOC_MAX_CONFIRMED_PER_WEIGHT } from "@/lib/toc/invitations"

type InvitationRow = {
  id: string
  athlete_id: string
  weight_class: number
  status: string
  seed: number | null
  athletes: {
    id: string
    name: string
    highschool: string | null
    graduationyear: number | null
    photourl: string | null
  } | null
}

export function mapInvitationToBracketParticipant(row: InvitationRow): TocBracketParticipant | null {
  if (row.status !== "confirmed" || row.seed == null) return null
  return {
    athleteId: row.athlete_id,
    invitationId: row.id,
    seed: row.seed,
    name: row.athletes?.name ?? "Athlete",
    school: row.athletes?.highschool ?? null,
    photoUrl: row.athletes?.photourl ?? null,
    graduationYear: row.athletes?.graduationyear ?? null,
  }
}

export async function loadParticipantsForWeight(
  admin: SupabaseClient,
  weightClass: number,
): Promise<{ participants: TocBracketParticipant[]; error?: string }> {
  const { data, error } = await admin
    .from("toc_invitations")
    .select("id, athlete_id, weight_class, status, seed, athletes(id, name, highschool, graduationyear, photourl)")
    .eq("weight_class", weightClass)
    .eq("status", "confirmed")

  if (error) {
    if (error.code === "42P01") return { participants: [], error: "Invitations table missing." }
    return { participants: [], error: error.message }
  }

  const participants = (data ?? [])
    .map((row) => mapInvitationToBracketParticipant(row as InvitationRow))
    .filter((p): p is TocBracketParticipant => p != null)
    .sort((a, b) => a.seed - b.seed)

  return { participants }
}

export async function lockBracketDraw(
  admin: SupabaseClient,
  weightClass: number,
): Promise<{ draw: TocBracketDraw } | { error: string }> {
  const { participants, error: loadError } = await loadParticipantsForWeight(admin, weightClass)
  if (loadError) return { error: loadError }

  const validationError = validateBracketParticipants(participants)
  if (validationError) return { error: validationError }

  const lockedAt = new Date().toISOString()
  const draw = buildEightManDeDraw(weightClass, participants, lockedAt)

  const { error: upsertError } = await admin.from("toc_bracket_draws").upsert(
    {
      weight_class: weightClass,
      locked_at: lockedAt,
      draw,
      updated_at: lockedAt,
    },
    { onConflict: "weight_class" },
  )

  if (upsertError) {
    if (upsertError.code === "42P01") {
      return { error: "Run docs/sql/toc-brackets-phase-1.sql.txt in Supabase first." }
    }
    return { error: upsertError.message }
  }

  return { draw }
}

export async function unlockBracketDraw(
  admin: SupabaseClient,
  weightClass: number,
): Promise<{ ok: true } | { error: string }> {
  const { error } = await admin.from("toc_bracket_draws").delete().eq("weight_class", weightClass)
  if (error) {
    if (error.code === "42P01") return { error: "Bracket table missing." }
    return { error: error.message }
  }
  return { ok: true }
}

export async function getLockedDraw(
  admin: SupabaseClient,
  weightClass: number,
): Promise<TocBracketDraw | null> {
  const { data, error } = await admin
    .from("toc_bracket_draws")
    .select("draw")
    .eq("weight_class", weightClass)
    .maybeSingle()

  if (error || !data?.draw) return null
  return data.draw as TocBracketDraw
}

export async function listLockedDrawSummaries(admin: SupabaseClient): Promise<TocBracketDrawSummary[]> {
  const { data, error } = await admin
    .from("toc_bracket_draws")
    .select("weight_class, locked_at, draw")
    .order("weight_class")

  if (error || !data) return []

  return data.map((row) => {
    const draw = row.draw as TocBracketDraw
    return {
      weightClass: row.weight_class as number,
      lockedAt: String(row.locked_at ?? draw.lockedAt),
      participantCount: draw.participants?.length ?? TOC_MAX_CONFIRMED_PER_WEIGHT,
    }
  })
}

export async function getBracketLockStatus(
  admin: SupabaseClient,
  weightClass: number,
): Promise<{ locked: boolean; lockedAt: string | null; readyToLock: boolean; lockError: string | null }> {
  const [draw, { participants }] = await Promise.all([
    getLockedDraw(admin, weightClass),
    loadParticipantsForWeight(admin, weightClass),
  ])

  return {
    locked: draw != null,
    lockedAt: draw?.lockedAt ?? null,
    readyToLock: validateBracketParticipants(participants) == null,
    lockError: participants.length > 0 ? validateBracketParticipants(participants) : null,
  }
}
