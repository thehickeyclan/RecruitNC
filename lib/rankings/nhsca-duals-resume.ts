import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * NHSCA Duals, as ranking evidence.
 *
 * Eight duals over three days against out-of-state clubs is a real test, and none of it reached
 * the board: the roster table had no `athlete_id`, so a wrestler's duals record could not be
 * attached to them. Mac Johnson went 5-3 at 132 — beating BDTC Elite in the Round of 64 — and
 * the ranking engine saw a wrestler whose season ended at states in February.
 *
 * Two things are scored. The individual record, which is the wrestler's own. And how far the
 * team went, lightly — reaching the Round of 32 means the later bouts came against teams that
 * had also won, and a wrestler cannot be credited or blamed for that beyond the fact of who
 * was across the mat.
 *
 * What is deliberately NOT scored: a win over a named opponent. The matches store initials —
 * "R. Judd", "C. Yanek" — so there is no way to know whether a win was over a ranked wrestler.
 * Counting these as ranked wins would be inventing a credential.
 */

/** How far a team got, and what that is worth on top of the individual record. */
const ROUND_BONUS: Array<[RegExp, number]> = [
  [/champion/i, 20],
  [/final/i, 16],
  [/semi/i, 14],
  [/quarter|round of 8/i, 12],
  [/round of 16/i, 10],
  [/round of 32/i, 8],
  [/round of 64/i, 5],
]

export function teamRoundBonus(finalRound: string | null | undefined): number {
  const text = String(finalRound ?? "")
  if (!text.trim()) return 0
  for (const [pattern, points] of ROUND_BONUS) if (pattern.test(text)) return points
  return 0
}

export type DualsResume = {
  athleteId: string
  teamName: string
  finalRound: string | null
  weight: string | null
  /** Contested bouts only. A forfeit is not a wrestled match. */
  wins: number
  losses: number
  /** Wins by forfeit — an OPEN weight on the other side. Reported, never scored. */
  forfeitWins: number
  /** Individual record plus the team's run. */
  points: number
  label: string
}

/**
 * The wrestler's own record, on the same scale the board already uses for duals.
 *
 * This deliberately matches `recordWinPctPoints(record) * 2`, which is what the 2025 NHSCA
 * National Duals and Ultimate Club Duals rows are scored at — win percentage times twelve,
 * doubled. A first pass here paid 6 a win and reached 48 for a 7-1, while the same 7-1 in 2025
 * scored 22. The same event in two years cannot be worth twice as much in one of them.
 *
 * One thing is fixed rather than copied. The existing scale reads percentage and ignores volume,
 * so 1-0 scores 24 and 7-1 scores 22 — a wrestler who took one bout outscoring one who went
 * through a full week. Fares Alkurdasi's 2-1 is a partial lineup, not a better record than
 * Tobin McNair's 7-1. So the score is damped by how much it rests on: a record needs six
 * contested bouts to be worth its full percentage, and counts proportionally below that.
 */
const FULL_CONFIDENCE_BOUTS = 6

export function dualsRecordPoints(wins: number, losses: number): number {
  const bouts = wins + losses
  if (bouts <= 0) return 0
  const winPct = wins / bouts
  const confidence = Math.min(1, bouts / FULL_CONFIDENCE_BOUTS)
  return Math.round(winPct * 12 * 2 * confidence)
}

/** Every athlete in this class with an NHSCA Duals record. Empty when the tables are absent. */
export async function loadDualsResumes(
  supabase: SupabaseClient,
  athleteIds: string[],
): Promise<Map<string, DualsResume>> {
  const out = new Map<string, DualsResume>()
  if (athleteIds.length === 0) return out

  try {
    const { data: roster, error } = await supabase
      .from("nhsca_duals_wrestlers")
      .select("id, athlete_id, name, weight_class, team_id")
      .in("athlete_id", athleteIds)
    if (error || !roster?.length) return out

    const teamIds = [...new Set(roster.map((r) => r.team_id).filter(Boolean))] as string[]
    const { data: teams } = await supabase
      .from("nhsca_duals_teams")
      .select("id, name, final_round")
      .in("id", teamIds)
    const teamById = new Map((teams ?? []).map((t) => [String(t.id), t]))

    const { data: matches } = await supabase
      .from("nhsca_duals_matches")
      .select("nc_wrestler_id, winner, result_type")
      .in("nc_wrestler_id", roster.map((r) => String(r.id)))

    const tally = new Map<string, { wins: number; losses: number; forfeitWins: number }>()
    for (const m of matches ?? []) {
      const key = String(m.nc_wrestler_id)
      const cur = tally.get(key) ?? { wins: 0, losses: 0, forfeitWins: 0 }
      // Thirteen of the 224 bouts were forfeits, the other team leaving the weight OPEN. Six
      // team points, no wrestling. Scoring it would rank a wrestler for an opponent's absence.
      if (m.result_type === "forfeit") {
        if (m.winner === "nc") cur.forfeitWins += 1
      } else if (m.winner === "nc") cur.wins += 1
      else cur.losses += 1
      tally.set(key, cur)
    }

    for (const r of roster) {
      const record = tally.get(String(r.id))
      // Rostered but never wrestled is not a result — including a wrestler whose only line was
      // a forfeit. Crediting either would be crediting a singlet, not a performance.
      if (!record || record.wins + record.losses === 0) continue

      const team = teamById.get(String(r.team_id))
      const bonus = teamRoundBonus(team?.final_round)
      const points = dualsRecordPoints(record.wins, record.losses) + bonus
      out.set(String(r.athlete_id), {
        athleteId: String(r.athlete_id),
        teamName: String(team?.name ?? "NHSCA Duals"),
        finalRound: (team?.final_round as string) ?? null,
        weight: (r.weight_class as string) ?? null,
        wins: record.wins,
        losses: record.losses,
        forfeitWins: record.forfeitWins,
        points,
        label:
          `NHSCA Duals: ${record.wins}-${record.losses}` +
          (record.forfeitWins ? ` (+${record.forfeitWins} by forfeit)` : "") +
          (r.weight_class ? ` at ${r.weight_class}` : "") +
          ` · ${team?.name ?? "team"}` +
          (team?.final_round ? ` (${team.final_round})` : ""),
      })
    }
  } catch {
    return out
  }
  return out
}
