import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * The staff's record of who changed what on the shared board (Matt, 12 October 2026: "if multiple
 * coaches are working on the same space, what has changed and who did it").
 *
 * Contact is already recorded where it happens - a logged call is a recruiting_actions row, a
 * message is a coach_messages row, a star carries who added it. What was recorded nowhere is a
 * change: a stage move, applied ticked, a wrestler taken off the board (the star row is deleted).
 * Those go here. lib/recruiting/staff-activity.ts reads all of it back as one list.
 *
 * Writing a line never fails the change it describes.
 */
export type BoardEventKind = "added" | "removed" | "stage" | "applied"

export const BOARD_EVENTS_TABLE = "recruiting_board_events"

export async function logBoardEvent(
  admin: SupabaseClient,
  event: { actor: string; athleteId: string; kind: BoardEventKind; detail?: string | null },
) {
  try {
    const { data: me } = await admin.from("user_profiles").select("school_id").eq("user_id", event.actor).maybeSingle()
    const { error } = await admin.from(BOARD_EVENTS_TABLE).insert({
      school_id: me?.school_id ?? null,
      actor_user_id: event.actor,
      athlete_id: event.athleteId,
      kind: event.kind,
      detail: event.detail ?? null,
    })
    if (error) console.error("[board-events] not recorded:", error.message)
  } catch (e) {
    console.error("[board-events] not recorded:", e)
  }
}
