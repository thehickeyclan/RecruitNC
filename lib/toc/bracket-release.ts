import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Whether the tournament's brackets are released to the app.
 *
 * A row in the database rather than an environment variable, because releasing is something staff
 * do on a Friday morning from the admin page — not a deploy. It is also one decision with one
 * switch: the environment flag used to gate both the official brackets and the build-your-own
 * toy, so turning the tournament on would have turned the toy back on with it.
 *
 * Release is all-or-nothing on purpose. Which weights appear is already decided per weight by
 * whether their draw is locked, so a second per-weight control here would be a second place to
 * say the same thing.
 */

export type BracketRelease = {
  released: boolean
  releasedAt: string | null
}

const CONFIG_ID = 1

export async function readBracketRelease(admin: SupabaseClient): Promise<BracketRelease> {
  const { data, error } = await admin
    .from("toc_event_config")
    .select("brackets_released_at")
    .eq("id", CONFIG_ID)
    .maybeSingle()

  // Unreleased is the safe answer to every failure here: a missing column or a dropped connection
  // must never be the reason a tournament's brackets appear early.
  if (error) return { released: false, releasedAt: null }
  const releasedAt = (data as { brackets_released_at?: string | null } | null)?.brackets_released_at ?? null
  return { released: Boolean(releasedAt), releasedAt }
}

export async function setBracketRelease(
  admin: SupabaseClient,
  released: boolean,
  userId: string,
): Promise<{ ok: true; releasedAt: string | null } | { ok: false; error: string }> {
  const releasedAt = released ? new Date().toISOString() : null
  const { error } = await admin
    .from("toc_event_config")
    .update({
      brackets_released_at: releasedAt,
      brackets_released_by: released ? userId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", CONFIG_ID)

  if (error) return { ok: false, error: error.message }
  return { ok: true, releasedAt }
}
