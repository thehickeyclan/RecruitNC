/**
 * Whether a state tournament was a sanctioned championship, as data rather than a guess at its name.
 *
 * West Virginia's girls wrestled a state INVITATIONAL in 2024, 2025 and 2026 — the WVSSAC does not
 * sanction girls' wrestling until 2026-27 — so a title there is not a state championship, and
 * saying it is would credit a girl with something her state did not award. That was first handled
 * by matching the word "invitational" in the division's name, which is a label, not a fact: a
 * state could rename the division tomorrow, and a sanctioned event could be called anything.
 *
 * It belongs to the EVENT, so it lives on `state_tournament_divisions` — the table that already
 * describes one (season, state, association, gender, classification). Everything is sanctioned
 * unless a row says otherwise, which is true of every state tournament we hold but these three.
 *
 * Read in a query of its own: PostgREST refuses an entire select when one column is unknown, so
 * asking for `sanctioned` inside a shared query would break every profile until the column exists.
 * Isolated, a missing column costs this one read and answers "everything is sanctioned", which is
 * what the product said before.
 *
 *   ALTER TABLE state_tournament_divisions
 *     ADD COLUMN IF NOT EXISTS sanctioned boolean NOT NULL DEFAULT true;
 */
import type { SupabaseClient } from "@supabase/supabase-js"

/** (season, association, gender, classification) -> false where the event was not sanctioned. */
export type Sanctioning = ReadonlyMap<string, boolean>

export function sanctioningKey(
  season: number | string | null | undefined,
  association: string | null | undefined,
  gender: string | null | undefined,
  classification: string | null | undefined,
): string {
  const part = (v: unknown) => String(v ?? "").trim().toLowerCase()
  return [part(season), part(association), part(gender), part(classification)].join("|")
}

export async function loadStateSanctioning(client: SupabaseClient, state: string): Promise<Sanctioning> {
  const out = new Map<string, boolean>()
  const code = String(state ?? "").trim().toUpperCase()
  if (!code) return out
  try {
    const { data, error } = await client
      .from("state_tournament_divisions")
      .select("season, association, gender, classification, sanctioned")
      .eq("state", code)
    if (error || !data) return out
    for (const row of data as Array<Record<string, unknown>>) {
      /* Only the exceptions are worth carrying; absence means sanctioned. */
      if (row.sanctioned === false) {
        out.set(sanctioningKey(row.season as number, row.association as string, row.gender as string, row.classification as string), false)
      }
    }
    return out
  } catch {
    return out
  }
}

/** Sanctioned unless this exact event is recorded as not. */
export function isSanctioned(
  sanctioning: Sanctioning | null | undefined,
  season: number | string | null | undefined,
  association: string | null | undefined,
  gender: string | null | undefined,
  classification: string | null | undefined,
): boolean {
  if (!sanctioning || sanctioning.size === 0) return true
  return sanctioning.get(sanctioningKey(season, association, gender, classification)) !== false
}
