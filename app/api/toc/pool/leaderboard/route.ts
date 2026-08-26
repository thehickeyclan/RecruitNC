import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { getLockedDraw } from "@/lib/toc/bracket-service"
import { scoreEntry, type PoolBout, type PoolResults } from "@/lib/toc/pool-scoring"
import {
  gradeFinalPrediction,
  parseFinalMethod,
  sumTiebreak,
  type FinalPrediction,
  type FinalPredictionAccuracy,
} from "@/lib/toc/final-prediction"
import { rankStandings } from "@/lib/toc/pool-ranking"

/**
 * Standings.
 *
 * Returns names and totals. It never returns picks — the pool's promise is that nobody sees
 * anyone else's bracket, and the safest way to keep that promise is for the endpoint that
 * everyone can call to have no access to them in its response shape at all.
 */

export const dynamic = "force-dynamic"
export const revalidate = 0

/** "Matthew Hickey" → "Matthew H." Most entrants are minors; full names do not belong on a public board. */
function displayName(fullName: string | null, fallback: string): string {
  const parts = String(fullName ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export async function GET() {
  const admin = createAdminClient()

  const [{ data: entries, error: entriesError }, { data: results, error: resultsError }] = await Promise.all([
    admin
      .from("toc_pool_entries")
      .select("user_id,weight_class,picks,final_method,final_winner_score,final_loser_score")
      .eq("submitted", true),
    admin
      .from("toc_bout_results")
      .select("weight_class,bout_number,winner_athlete_id,method,winner_score,loser_score"),
  ])

  if (entriesError || resultsError) {
    console.error("[toc pool] leaderboard:", entriesError?.message ?? resultsError?.message)
    return NextResponse.json({ error: "Could not load the leaderboard." }, { status: 500 })
  }

  // Bouts come from the locked draws so scoring uses the official structure, not whatever shape a
  // client happened to send when the entry was saved.
  const boutsByWeight = new Map<number, PoolBout[]>()
  for (const weightClass of TOC_WEIGHT_CLASSES) {
    const draw = await getLockedDraw(admin, weightClass)
    if (draw) {
      boutsByWeight.set(
        weightClass,
        draw.bouts.map((b) => ({ boutNumber: b.boutNumber, roundLabel: b.roundLabel })),
      )
    }
  }

  // How each weight's championship actually ended, for the tiebreaker.
  const finalsByWeight = new Map<number, FinalPrediction>()
  for (const row of results ?? []) {
    const method = parseFinalMethod((row as { method?: unknown }).method)
    if (!method) continue
    const weight = Number(row.weight_class)
    const bouts = boutsByWeight.get(weight)
    const isChampionship = bouts?.some(
      (b) => b.boutNumber === Number(row.bout_number) && /championship/i.test(b.roundLabel ?? ""),
    )
    if (!isChampionship) continue
    const r = row as { winner_score?: unknown; loser_score?: unknown }
    finalsByWeight.set(weight, {
      method,
      winnerScore: r.winner_score == null ? null : Number(r.winner_score),
      loserScore: r.loser_score == null ? null : Number(r.loser_score),
    })
  }

  const resultsByWeight = new Map<number, PoolResults>()
  for (const row of results ?? []) {
    const weight = Number(row.weight_class)
    const existing = resultsByWeight.get(weight) ?? {}
    existing[Number(row.bout_number)] = String(row.winner_athlete_id)
    resultsByWeight.set(weight, existing)
  }

  const totals = new Map<string, { points: number; correct: number; weights: number; finals: FinalPredictionAccuracy[] }>()
  for (const entry of entries ?? []) {
    const weight = Number(entry.weight_class)
    const bouts = boutsByWeight.get(weight)
    if (!bouts) continue

    const picks = Object.fromEntries(
      Object.entries((entry.picks ?? {}) as Record<string, string>).map(([k, v]) => [Number(k), v]),
    )
    const score = scoreEntry(bouts, picks, resultsByWeight.get(weight) ?? {})

    const current = totals.get(entry.user_id) ?? { points: 0, correct: 0, weights: 0, finals: [] }
    current.points += score.points
    current.correct += score.correct
    current.weights += 1

    const e = entry as { final_method?: unknown; final_winner_score?: unknown; final_loser_score?: unknown }
    const predictedMethod = parseFinalMethod(e.final_method)
    current.finals.push(
      gradeFinalPrediction(
        predictedMethod
          ? {
              method: predictedMethod,
              winnerScore: e.final_winner_score == null ? null : Number(e.final_winner_score),
              loserScore: e.final_loser_score == null ? null : Number(e.final_loser_score),
            }
          : null,
        finalsByWeight.get(weight) ?? null,
      ),
    )
    totals.set(entry.user_id, current)
  }

  const userIds = [...totals.keys()]
  const namesById = new Map<string, string | null>()
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("user_id,full_name")
      .in("user_id", userIds)
    for (const p of profiles ?? []) namesById.set(p.user_id, p.full_name)
  }

  const standings = rankStandings(
    userIds.map((userId) => {
      const t = totals.get(userId)!
      return {
        name: displayName(namesById.get(userId) ?? null, "Entrant"),
        points: t.points,
        correct: t.correct,
        weightsEntered: t.weights,
        tiebreak: sumTiebreak(t.finals),
      }
    }),
  )

  const decided = [...resultsByWeight.values()].reduce((n, r) => n + Object.keys(r).length, 0)
  return NextResponse.json({ standings, entrants: standings.length, boutsDecided: decided })
}
