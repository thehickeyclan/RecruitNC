/**
 * Which not-yet-live states a single account may look at.
 *
 * The launch checklist wants a real in-state college coach and a real family to use a state
 * before it opens, and finds that the only account able to see a state that is not live is an
 * admin — so the check that is supposed to happen before launch could only happen after it, or
 * by making a college coach an admin. This is the smaller permission: one account, named states,
 * nothing else about them changed.
 *
 * Read in a query of its own, deliberately. PostgREST refuses an ENTIRE select when one column
 * is unknown, so asking for `preview_states` inside the queries that already load a profile
 * would take those queries down everywhere the column has not been added yet. Isolated, a
 * missing column costs this one read, which answers "no preview states" — exactly what every
 * account had before.
 *
 *   ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preview_states text[] DEFAULT '{}';
 */
import type { SupabaseClient } from "@supabase/supabase-js"

export async function previewStatesForUser(
  client: SupabaseClient,
  userId: string | null | undefined,
): Promise<string[]> {
  const id = String(userId ?? "").trim()
  if (!id) return []
  try {
    const { data, error } = await client
      .from("user_profiles")
      .select("preview_states")
      .eq("user_id", id)
      .maybeSingle()
    if (error || !data) return []
    const raw = (data as { preview_states?: unknown }).preview_states
    if (!Array.isArray(raw)) return []
    return raw.map((c) => String(c).trim().toUpperCase()).filter(Boolean)
  } catch {
    return []
  }
}
