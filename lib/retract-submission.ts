import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Take down a submission that is already live.
 *
 * Wins and results publish on submission, so by the time an admin looks at one it is on the
 * profile. "Reject" therefore has to mean *remove*, not "decline to publish" — otherwise the
 * button reports an outcome it did not produce, which is the failure mode this codebase keeps
 * running into from the other direction.
 *
 * Both rows carry the id of the request that created them, so the takedown is exact: a result
 * in `source_file` as `edit_request:<id>`, a win in `edit_request_id`.
 */
export async function retractPublishedSubmission(
  admin: SupabaseClient,
  input: { requestId: string; editType: string },
): Promise<{ removed: number; error?: string }> {
  const requestId = String(input.requestId ?? "").trim()
  if (!requestId) return { removed: 0 }

  try {
    if (input.editType === "tournament_result") {
      const { data, error } = await admin
        .from("other_tournament_results")
        .delete()
        .eq("source_file", `edit_request:${requestId}`)
        .select("id")
      if (error) return { removed: 0, error: error.message }
      return { removed: data?.length ?? 0 }
    }

    if (input.editType === "significant_win") {
      const { data, error } = await admin
        .from("athlete_submitted_wins")
        .delete()
        .eq("edit_request_id", requestId)
        .select("id")
      if (error) return { removed: 0, error: error.message }
      return { removed: data?.length ?? 0 }
    }

    return { removed: 0 }
  } catch (e) {
    return { removed: 0, error: e instanceof Error ? e.message : "unknown" }
  }
}

/** Whether this kind of submission is already public the moment it is made. */
export function publishesImmediately(editType: string | null | undefined): boolean {
  return editType === "tournament_result" || editType === "significant_win"
}
