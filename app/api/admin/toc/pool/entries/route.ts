import { NextResponse, type NextRequest } from "next/server"

import { createAdminClientFresh } from "@/lib/supabase/admin"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"
import { getLockedDraw } from "@/lib/toc/bracket-service"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { scoreEntry, type PoolBout, type PoolPicks, type PoolResults } from "@/lib/toc/pool-scoring"

/**
 * Who has entered TOC Madness, how far they got, and what they picked.
 *
 * The game had no admin view at all: the only numbers anywhere were four tiles on the announce
 * page — entrants and unfinished — and the only way to see a person was the public leaderboard,
 * which shows nothing until results are recorded. Running the game on a tournament weekend needs
 * the list itself: who is in, who is one weight short, when the last entry landed.
 *
 * Picks are private to everyone else. The app promises that in writing, and the leaderboard
 * publishes points and standings only. That promise is about publishing, not about the staff who
 * run the tournament and have to settle "my bracket is wrong" — so a single entrant's picks load
 * only when asked for by id, never in the list.
 */

export const dynamic = "force-dynamic"
export const maxDuration = 60

type EntryRow = {
  user_id: string
  weight_class: number
  picks: Record<string, string> | null
  submitted: boolean | null
  submitted_at: string | null
  updated_at: string | null
}

/** Bouts and wrestler names per weight, straight from the locked draws. */
async function drawIndex(admin: ReturnType<typeof createAdminClientFresh>) {
  const bouts = new Map<number, PoolBout[]>()
  const names = new Map<number, Map<string, string>>()
  for (const weight of TOC_WEIGHT_CLASSES) {
    const draw = await getLockedDraw(admin, weight)
    if (!draw) continue
    bouts.set(
      weight,
      draw.bouts.map((b) => ({ boutNumber: b.boutNumber, roundLabel: b.roundLabel })),
    )
    names.set(weight, new Map(draw.participants.map((p) => [p.athleteId, p.name])))
  }
  return { bouts, names }
}

function numericPicks(picks: Record<string, string> | null): PoolPicks {
  const out: PoolPicks = {}
  for (const [bout, athleteId] of Object.entries(picks ?? {})) {
    const n = Number(bout)
    if (Number.isInteger(n) && typeof athleteId === "string") out[n] = athleteId
  }
  return out
}

export async function GET(request: NextRequest) {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 })

  const admin = createAdminClientFresh()
  const wanted = request.nextUrl.searchParams.get("user")?.trim() || null

  const [{ data: entryRows, error: entriesError }, { data: resultRows }] = await Promise.all([
    admin
      .from("toc_pool_entries")
      .select("user_id,weight_class,picks,submitted,submitted_at,updated_at")
      .order("weight_class"),
    admin.from("toc_bout_results").select("weight_class,bout_number,winner_athlete_id"),
  ])

  if (entriesError) {
    console.error("[toc pool entries]", entriesError.message)
    return NextResponse.json({ error: "Could not load entries." }, { status: 500 })
  }

  const entries = (entryRows ?? []) as EntryRow[]
  const { bouts, names } = await drawIndex(admin)

  const resultsByWeight = new Map<number, PoolResults>()
  for (const row of resultRows ?? []) {
    const weight = Number(row.weight_class)
    const existing = resultsByWeight.get(weight) ?? {}
    existing[Number(row.bout_number)] = String(row.winner_athlete_id)
    resultsByWeight.set(weight, existing)
  }

  // Names for the people, not the wrestlers: their chosen leaderboard name first, then the name
  // on their account, then their email — a user id helps nobody standing at a scorer's table.
  const userIds = [...new Set(entries.map((e) => e.user_id).filter(Boolean))]
  const [{ data: profiles }, { data: chosen }] = await Promise.all([
    userIds.length
      ? admin.from("user_profiles").select("user_id,full_name,first_name,last_name,email").in("user_id", userIds)
      : Promise.resolve({ data: [] as Record<string, string>[] }),
    userIds.length
      ? admin.from("toc_pool_display_names").select("user_id,display_name").in("user_id", userIds)
      : Promise.resolve({ data: [] as Record<string, string>[] }),
  ])
  const profileById = new Map((profiles ?? []).map((p) => [String(p.user_id), p]))
  const chosenById = new Map((chosen ?? []).map((c) => [String(c.user_id), String(c.display_name)]))

  const lockedWeights = [...bouts.keys()].sort((a, b) => a - b)
  const byUser = new Map<string, EntryRow[]>()
  for (const entry of entries) {
    if (!entry.user_id) continue
    byUser.set(entry.user_id, [...(byUser.get(entry.user_id) ?? []), entry])
  }

  const entrants = [...byUser.entries()].map(([userId, rows]) => {
    const profile = profileById.get(userId) as
      | { full_name?: string; first_name?: string; last_name?: string; email?: string }
      | undefined
    const accountName =
      profile?.full_name?.trim() ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      null
    const submittedRows = rows.filter((r) => r.submitted)
    const submittedWeights = submittedRows.map((r) => Number(r.weight_class)).sort((a, b) => a - b)
    const stamps = rows.map((r) => r.submitted_at ?? r.updated_at).filter(Boolean) as string[]

    let points = 0
    let correct = 0
    for (const row of submittedRows) {
      const weight = Number(row.weight_class)
      const weightBouts = bouts.get(weight)
      if (!weightBouts) continue
      const score = scoreEntry(weightBouts, numericPicks(row.picks), resultsByWeight.get(weight) ?? {})
      points += score.points
      correct += score.correct
    }

    return {
      userId,
      leaderboardName: chosenById.get(userId) ?? null,
      accountName,
      email: profile?.email ?? null,
      submittedWeights,
      submittedCount: submittedWeights.length,
      missingWeights: lockedWeights.filter((w) => !submittedWeights.includes(w)),
      complete: lockedWeights.length > 0 && submittedWeights.length >= lockedWeights.length,
      firstAt: stamps.length ? stamps.slice().sort()[0] : null,
      lastAt: stamps.length ? stamps.slice().sort().at(-1)! : null,
      points,
      correct,
    }
  })

  entrants.sort((a, b) => b.submittedCount - a.submittedCount || (b.lastAt ?? "").localeCompare(a.lastAt ?? ""))

  const perWeight = Object.fromEntries(
    lockedWeights.map((w) => [w, entries.filter((e) => e.submitted && Number(e.weight_class) === w).length]),
  )
  // Entries per hour, so a reminder's effect is visible rather than guessed at.
  const perHour: Record<string, number> = {}
  for (const e of entries) {
    const at = e.submitted_at ?? e.updated_at
    if (at) perHour[at.slice(0, 13) + ":00Z"] = (perHour[at.slice(0, 13) + ":00Z"] ?? 0) + 1
  }

  const summary = {
    entrants: entrants.length,
    complete: entrants.filter((e) => e.complete).length,
    incomplete: entrants.filter((e) => !e.complete).length,
    submissions: entries.filter((e) => e.submitted).length,
    possible: entrants.length * lockedWeights.length,
    lockedWeights,
    perWeight,
    perHour,
    lastActivity: entrants.reduce<string | null>((a, e) => (e.lastAt && (!a || e.lastAt > a) ? e.lastAt : a), null),
    resultsRecorded: (resultRows ?? []).length,
  }

  // One entrant's bracket, in bout order, with the wrestlers named.
  let detail: unknown = null
  if (wanted) {
    const rows = (byUser.get(wanted) ?? []).slice().sort((a, b) => Number(a.weight_class) - Number(b.weight_class))
    detail = {
      userId: wanted,
      weights: rows.map((row) => {
        const weight = Number(row.weight_class)
        const weightBouts = bouts.get(weight) ?? []
        const nameOf = names.get(weight) ?? new Map<string, string>()
        const picks = numericPicks(row.picks)
        const results = resultsByWeight.get(weight) ?? {}
        return {
          weightClass: weight,
          submitted: Boolean(row.submitted),
          submittedAt: row.submitted_at ?? row.updated_at,
          bouts: weightBouts
            .slice()
            .sort((a, b) => a.boutNumber - b.boutNumber)
            .map((bout) => ({
              boutNumber: bout.boutNumber,
              roundLabel: bout.roundLabel,
              pick: picks[bout.boutNumber] ? nameOf.get(String(picks[bout.boutNumber])) ?? "—" : null,
              actual: results[bout.boutNumber] ? nameOf.get(String(results[bout.boutNumber])) ?? "—" : null,
            })),
        }
      }),
    }
  }

  return NextResponse.json({ summary, entrants, detail })
}
