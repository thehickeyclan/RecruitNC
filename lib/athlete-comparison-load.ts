/**
 * Everything the comparison needs about one wrestler, in one place.
 *
 * A coach comparing two recruits is asking a narrow question — who is better, and how do you
 * know — so this loads the evidence that answers it and nothing else. Bouts come from every
 * source we hold, because a comparison that only sees the state tournament will miss the one
 * meeting that settles it.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ComparisonBout, ComparisonSide } from "@/lib/athlete-comparison"

/**
 * Every bout on file for one wrestler, for head-to-head and common opponents.
 *
 * The résumé — placements, rankings, strength of opponents — comes from the scouting report
 * builder, so the comparison and the report can never disagree about the same wrestler.
 */
export async function loadComparisonBouts(
  supabase: SupabaseClient,
  athlete: { id: string; name: string },
): Promise<ComparisonSide> {
  const athleteId = athlete.id
  const [tournamentBouts, seasons] = await Promise.all([
    supabase
      .from("other_tournament_bouts")
      .select("opponent_name,opponent_id,win,win_type,score,event_name,event_date")
      .eq("athlete_id", athleteId)
      .limit(3000),
    supabase.from("matches").select("season,matches").eq("athlete_id", athleteId),
  ])

  const bouts: ComparisonBout[] = []
  for (const row of tournamentBouts.data ?? []) {
    const opponent = String(row.opponent_name ?? "").trim()
    if (!opponent) continue
    bouts.push({
      opponent,
      opponentId: (row.opponent_id as string) ?? null,
      won: Boolean(row.win),
      event: (row.event_name as string) ?? null,
      date: (row.event_date as string) ?? null,
      method: (row.win_type as string) ?? null,
      score: (row.score as string) ?? null,
    })
  }
  /*
   * Season matches carry no opponent id, so they match by name. That is weaker, and it is how
   * most common opponents are found — a wrestler both faced at a mid-season invitational will
   * never have a profile here.
   */
  for (const row of seasons.data ?? []) {
    for (const raw of (Array.isArray(row.matches) ? row.matches : []) as Array<Record<string, unknown>>) {
      const opponent = String(raw.opponent ?? raw.opponent_name ?? "").trim()
      const result = String(raw.win_loss ?? "").trim().toUpperCase()
      if (!opponent || (result !== "W" && result !== "L")) continue
      bouts.push({
        opponent,
        won: result === "W",
        event: (raw.venue as string) ?? (raw.tournament as string) ?? null,
        date: (raw.date as string) ?? null,
        method: (raw.result as string) ?? null,
      })
    }
  }

  return { id: athleteId, name: athlete.name, bouts }
}
