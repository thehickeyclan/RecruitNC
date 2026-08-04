import type { SupabaseClient } from "@supabase/supabase-js"
import {
  buildEightManDeDraw,
  validateBracketParticipants,
  validatePartialBracketPublish,
} from "@/lib/toc/eight-man-de-bracket"
import type { TocBracketDraw, TocBracketDrawSummary, TocBracketParticipant } from "@/lib/toc/bracket-types"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
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
    .map((row) => mapInvitationToBracketParticipant(row as unknown as InvitationRow))
    .filter((p): p is TocBracketParticipant => p != null)
    .sort((a, b) => a.seed - b.seed)

  return { participants }
}

export async function loadAllConfirmedParticipantsForWeight(
  admin: SupabaseClient,
  weightClass: number,
): Promise<{ participants: TocBracketParticipant[]; error?: string }> {
  const { data, error } = await admin
    .from("toc_invitations")
    .select("id, athlete_id, weight_class, status, seed, athletes(id, name, highschool, graduationyear, photourl)")
    .eq("weight_class", weightClass)
    .eq("status", "confirmed")

  if (error) return { participants: [], error: error.message }

  const rows = (data ?? []) as unknown as InvitationRow[]
  const participants = rows
    .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99) || (a.athletes?.name ?? "").localeCompare(b.athletes?.name ?? ""))
    .slice(0, TOC_MAX_CONFIRMED_PER_WEIGHT)
    .map((row, index) => ({
      athleteId: row.athlete_id,
      invitationId: row.id,
      seed: index + 1,
      name: row.athletes?.name ?? "Athlete",
      school: row.athletes?.highschool ?? null,
      photoUrl: row.athletes?.photourl ?? null,
      graduationYear: row.athletes?.graduationyear ?? null,
    }))

  return { participants }
}

export function buildLiveDrawFromField(
  weightClass: number,
  participants: TocBracketParticipant[],
): TocBracketDraw | null {
  if (validatePartialBracketPublish(participants) != null) return null
  return buildEightManDeDraw(weightClass, participants, new Date().toISOString())
}

export async function getPublicBracketDraw(
  admin: SupabaseClient,
  weightClass: number,
): Promise<{ draw: TocBracketDraw; source: "locked" | "live" } | null> {
  const locked = await getLockedDraw(admin, weightClass)
  if (locked) {
    return { draw: normalizeDraw(locked), source: "locked" }
  }

  const { participants } = await loadParticipantsForWeight(admin, weightClass)
  const live = buildLiveDrawFromField(weightClass, participants)
  if (!live) return null
  return { draw: live, source: "live" }
}

function normalizeDraw(draw: TocBracketDraw): TocBracketDraw {
  const realCount = draw.participants.filter((p) => !p.isPlaceholder && !p.athleteId.startsWith("__toc_open_")).length
  return {
    ...draw,
    confirmedCount: draw.confirmedCount ?? realCount,
    openSpots: draw.openSpots ?? Math.max(0, TOC_MAX_CONFIRMED_PER_WEIGHT - realCount),
    isComplete: draw.isComplete ?? validateBracketParticipants(draw.participants) == null,
  }
}

export async function lockBracketDraw(
  admin: SupabaseClient,
  weightClass: number,
): Promise<{ draw: TocBracketDraw } | { error: string }> {
  const { participants, error: loadError } = await loadParticipantsForWeight(admin, weightClass)
  if (loadError) return { error: loadError }

  const validationError = validatePartialBracketPublish(participants)
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
  return normalizeDraw(data.draw as TocBracketDraw)
}

export async function listPublicBracketSummaries(admin: SupabaseClient): Promise<TocBracketDrawSummary[]> {
  const summaries: TocBracketDrawSummary[] = []

  for (const weightClass of TOC_WEIGHT_CLASSES) {
    const locked = await getLockedDraw(admin, weightClass)
    if (locked) {
      summaries.push({
        weightClass,
        lockedAt: locked.lockedAt,
        participantCount: TOC_MAX_CONFIRMED_PER_WEIGHT,
        confirmedCount: locked.confirmedCount,
        isComplete: locked.isComplete,
        source: "locked",
      })
      continue
    }

    const { participants } = await loadParticipantsForWeight(admin, weightClass)
    const live = buildLiveDrawFromField(weightClass, participants)
    if (!live) continue

    summaries.push({
      weightClass,
      lockedAt: live.lockedAt,
      participantCount: TOC_MAX_CONFIRMED_PER_WEIGHT,
      confirmedCount: live.confirmedCount,
      isComplete: live.isComplete,
      source: "live",
    })
  }

  return summaries
}

export async function getBracketLockStatus(
  admin: SupabaseClient,
  weightClass: number,
): Promise<{
  locked: boolean
  lockedAt: string | null
  readyToLock: boolean
  lockError: string | null
  canViewLive: boolean
  confirmedCount: number
  isComplete: boolean
}> {
  const [draw, { participants }] = await Promise.all([
    getLockedDraw(admin, weightClass),
    loadParticipantsForWeight(admin, weightClass),
  ])

  const partialError = validatePartialBracketPublish(participants)
  const liveDraw = buildLiveDrawFromField(weightClass, participants)

  return {
    locked: draw != null,
    lockedAt: draw?.lockedAt ?? null,
    readyToLock: partialError == null,
    lockError: partialError,
    canViewLive: liveDraw != null,
    confirmedCount: participants.length,
    isComplete: validateBracketParticipants(participants) == null,
  }
}
