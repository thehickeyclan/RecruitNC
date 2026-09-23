import type { SupabaseClient } from "@supabase/supabase-js"
import { buildTournamentResultRow, type SubmittedResultForm } from "@/lib/tournament-result-submission"

/**
 * Write an athlete-submitted tournament result straight into the results table.
 *
 * Publishing without review is a deliberate trade. The thing that keeps a submission honest is
 * not our queue, it is the college coach who will pull the bracket — a wrestler caught inventing
 * a result has done far more damage to themselves than the result was worth. Meanwhile a true
 * result sitting in a queue is invisible during exactly the fortnight a coach was looking.
 *
 * Never fatal to the submission. If this write fails the edit request still exists, so the
 * result is recoverable by hand rather than lost.
 */
export async function publishSubmittedResult(
  admin: SupabaseClient,
  input: { athleteId: string; requestId: string; form: SubmittedResultForm },
): Promise<{ ok: boolean; error?: string }> {
  try {
    /*
     * `wrestlingClub`, not `club`.
     *
     * There is no `club` column on `athletes`, so this select errored, `data` came back null,
     * and the guard below reported "athlete not found" about a wrestler who plainly exists —
     * Adam Walker's first real submission vanished exactly this way. The error was discarded,
     * which is what made it silent, so it is read now.
     *
     * The same trap this file's neighbours already carry a comment about: the scouting report
     * once selected `gpa`, `contact_email` and `career_record`, none of which are columns, and
     * every report rendered blank without anything failing.
     */
    const { data: athlete, error: lookupError } = await admin
      .from("athletes")
      .select("id, name, highschool, wrestlingClub")
      .eq("id", input.athleteId)
      .maybeSingle()

    if (lookupError) return { ok: false, error: `athlete lookup failed: ${lookupError.message}` }
    if (!athlete) return { ok: false, error: "athlete not found" }

    const built = buildTournamentResultRow({
      form: input.form,
      athleteId: String(athlete.id),
      athleteName: String(athlete.name ?? ""),
      highSchool: (athlete.highschool as string | null) ?? null,
      club: (athlete.wrestlingClub as string | null) ?? null,
      requestId: input.requestId,
    })
    if (!built.ok) return { ok: false, error: built.error }

    const { error } = await admin.from("other_tournament_results").insert(built.row)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" }
  }
}
