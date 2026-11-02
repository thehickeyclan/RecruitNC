/**
 * Where a commitment on a profile came from, and when we learned it.
 *
 * `athletes.college` is a bare string: it says Cornell and nothing about who said so. That was
 * fine while every commitment was typed in by somebody who knew, and it is not fine now that a
 * job reads them off a published list - a coach looking at "Committed to Cornell" is entitled to
 * know whether a parent told us in March or FloWrestling printed it this morning.
 *
 * The National Letter of Intent was abolished in 2024, so there is no signing to report: what
 * exists is a reported commitment. Nothing here says "signed", and the status column only admits
 * that word for a program's own announcement of a written offer of aid, which is a different
 * source and is not this one.
 */
import type { SupabaseClient } from "@supabase/supabase-js"

export type CommitmentProvenance = {
  college: string
  previousCollege: string | null
  status: "reported" | "signed" | "withdrawn"
  source: string
  sourceUrl: string
  /** The day we learned, as the history row records it. */
  reportedOn: string
  /** "Reported commitment — Cornell", the line a profile prints. */
  label: string
}

export async function loadCommitmentProvenance(client: SupabaseClient, athleteId: string): Promise<CommitmentProvenance | null> {
  if (!athleteId) return null
  const { data, error } = await client
    .from("athlete_commitment_history")
    .select("college, previous_college, status, source, source_url, reported_date, created_at, change")
    .eq("athlete_id", athleteId)
    .neq("change", "removed")
    .order("created_at", { ascending: false })
    .limit(1)
  /*
   * A missing table or an empty history is not an error: most commitments on the site were typed
   * in before any of this existed and have no row. The profile then shows what it always showed.
   */
  if (error || !data?.length) return null
  const row = data[0] as Record<string, unknown>
  const college = String(row.college ?? "").trim()
  if (!college) return null
  const status = row.status === "signed" || row.status === "withdrawn" ? (row.status as "signed" | "withdrawn") : "reported"
  return {
    college,
    previousCollege: (row.previous_college as string) || null,
    status,
    source: String(row.source ?? "").trim(),
    sourceUrl: String(row.source_url ?? "").trim(),
    reportedOn: String(row.reported_date ?? row.created_at ?? "").slice(0, 10),
    label: `${status === "signed" ? "Signed" : "Reported commitment"} — ${college}`,
  }
}
