import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { getLockedDraw } from "@/lib/toc/bracket-service"
import { scoreEntry, type PoolBout, type PoolResults } from "@/lib/toc/pool-scoring"

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
    admin.from("toc_pool_entries").select("user_id,weight_class,picks").eq("submitted", true),
    admin.from("toc_bout_results").select("weight_class,bout_number,winner_athlete_id"),
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

  const resultsByWeight = new Map<number, PoolResults>()
  for (const row of results ?? []) {
    const weight = Number(row.weight_class)
    const existing = resultsByWeight.get(weight) ?? {}
    existing[Number(row.bout_number)] = String(row.winner_athlete_id)
    resultsByWeight.set(weight, existing)
  }

  const totals = new Map<string, { points: number; correct: number; weights: number }>()
  for (const entry of entries ?? []) {
    const weight = Number(entry.weight_class)
    const bouts = boutsByWeight.get(weight)
    if (!bouts) continue

    const picks = Object.fromEntries(
      Object.entries((entry.picks ?? {}) as Record<string, string>).map(([k, v]) => [Number(k), v]),
    )
    const score = scoreEntry(bouts, picks, resultsByWeight.get(weight) ?? {})

    const current = totals.get(entry.user_id) ?? { points: 0, correct: 0, weights: 0 }
    current.points += score.points
    current.correct += score.correct
    current.weights += 1
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

  const standings = userIds
    .map((userId) => {
      const t = totals.get(userId)!
      return {
        name: displayName(namesById.get(userId) ?? null, "Entrant"),
        points: t.points,
        correct: t.correct,
        weightsEntered: t.weights,
      }
    })
    .sort((a, b) => b.points - a.points || b.correct - a.correct || a.name.localeCompare(b.name))
    .map((row, i) => ({ rank: i + 1, ...row }))

  const decided = [...resultsByWeight.values()].reduce((n, r) => n + Object.keys(r).length, 0)
  return NextResponse.json({ standings, entrants: standings.length, boutsDecided: decided })
}
