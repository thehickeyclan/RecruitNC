import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Wins an athlete or family reported themselves.
 *
 * Published on submission, not on approval. The honesty pressure here is real and it points at
 * the wrestler: the first college coach who checks a bracket and finds no such match has ended
 * that recruitment. A queue adds delay during the exact weeks a coach is looking and adds no
 * safety a bracket check does not already provide.
 *
 * What it does NOT do is pretend to be verified. Every one of these carries its source so the
 * profile and the scouting report can say "athlete-reported" — a coach is owed the difference
 * between a win we imported off a bracket and one someone typed into a form.
 *
 * The table is created by hand (see docs/sql in the commit message). Every read here tolerates
 * its absence so nothing breaks before that runs.
 */

export type SubmittedWin = {
  opponent: string
  opponentSchool: string | null
  event: string
  date: string | null
  result: string | null
  credential: string
}

export type SubmittedWinRow = SubmittedWin & { id: string; athleteId: string; createdAt: string }

function toWin(row: Record<string, unknown>): SubmittedWinRow {
  return {
    id: String(row.id ?? ""),
    athleteId: String(row.athlete_id ?? ""),
    opponent: String(row.opponent_name ?? ""),
    opponentSchool: (row.opponent_school as string | null) ?? null,
    event: String(row.event_name ?? ""),
    date: (row.event_date as string | null) ?? null,
    result: (row.result as string | null) ?? null,
    credential: String(row.opponent_credential ?? ""),
    createdAt: String(row.created_at ?? ""),
  }
}

/** Publish a submitted win. Never throws: a failure leaves the edit request as the record. */
export async function publishSubmittedWin(
  admin: SupabaseClient,
  input: {
    athleteId: string
    requestId: string
    opponent: string
    opponentSchool?: string | null
    event: string
    date?: string | null
    result?: string | null
    credential: string
  },
): Promise<{ ok: boolean; error?: string }> {
  const opponent = String(input.opponent ?? "").trim()
  const event = String(input.event ?? "").trim()
  if (!opponent || !event) return { ok: false, error: "a win needs an opponent and an event" }

  try {
    const { error } = await admin.from("athlete_submitted_wins").insert({
      athlete_id: input.athleteId,
      opponent_name: opponent,
      opponent_school: input.opponentSchool?.trim() || null,
      event_name: event,
      event_date: input.date?.trim() || null,
      result: input.result?.trim() || null,
      opponent_credential: String(input.credential ?? "").trim(),
      edit_request_id: input.requestId || null,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" }
  }
}

/** Every submitted win for one athlete. Empty when the table does not exist yet. */
export async function getSubmittedWins(admin: SupabaseClient, athleteId: string): Promise<SubmittedWinRow[]> {
  if (!athleteId?.trim()) return []
  try {
    const { data, error } = await admin
      .from("athlete_submitted_wins")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("event_date", { ascending: false })
    if (error || !data) return []
    return data.map(toWin)
  } catch {
    return []
  }
}
