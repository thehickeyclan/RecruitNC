/**
 * The finished tournament, as the public should see it: who placed, and every bout on the way.
 *
 * Read from the two records that decided it — the locked draw and the bouts the mat recorded —
 * rather than a summary written afterwards, so the brackets on the site and the brackets the
 * tournament ran are the same thing. Placements come from `other_tournament_results`, which is
 * where the event's results were imported and where a profile reads them from.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { getLockedDraw } from "@/lib/toc/bracket-service"
import type { TocBracketBout, TocBracketDraw, TocBracketSlot } from "@/lib/toc/bracket-types"

export const TOC_RESULTS_EVENT_KEY = "toc-2026"

export type ResultWrestler = {
  athleteId: string | null
  name: string
  seed: number | null
  club: string | null
  won: boolean
}

export type ResultBout = {
  boutNumber: number
  roundLabel: string
  side: TocBracketBout["side"]
  top: ResultWrestler | null
  bottom: ResultWrestler | null
  /** "MD 13-4", "F 10-4" — empty for a bye or a bout with no method recorded. */
  outcome: string
}

export type ResultPlacer = {
  place: number
  name: string
  athleteId: string | null
  club: string | null
  record: string
}

export type WeightResults = {
  weightClass: number
  placers: ResultPlacer[]
  bouts: ResultBout[]
}

/** Wrestling's own shorthand, the same labels the app's bracket uses. */
const METHOD_LABEL: Record<string, string> = { FALL: "F", TF: "TF", MAJ: "MD", DEC: "DEC" }

function outcomeLabel(method: string | null, winnerScore: number | null, loserScore: number | null): string {
  const shorthand = method ? (METHOD_LABEL[method] ?? method) : null
  const score = winnerScore != null && loserScore != null ? `${winnerScore}-${loserScore}` : null
  return [shorthand, score].filter(Boolean).join(" ")
}

export async function loadTocResults(admin: SupabaseClient): Promise<WeightResults[]> {
  const { data: resultRows } = await admin
    .from("other_tournament_results")
    .select("athlete_id, athlete_name, club, weight_class, record, placement")
    .eq("event_key", TOC_RESULTS_EVENT_KEY)
    .not("placement", "is", null)

  const { data: boutRows } = await admin
    .from("toc_bout_results")
    .select("weight_class, bout_number, winner_athlete_id, method, winner_score, loser_score")

  const resultsByWeight = new Map<number, ResultPlacer[]>()
  for (const row of resultRows ?? []) {
    const weight = Number(row.weight_class)
    const list = resultsByWeight.get(weight) ?? []
    list.push({
      place: Number(row.placement),
      name: String(row.athlete_name),
      athleteId: row.athlete_id ? String(row.athlete_id) : null,
      club: row.club ? String(row.club) : null,
      record: String(row.record ?? ""),
    })
    resultsByWeight.set(weight, list)
  }

  const boutsByWeight = new Map<number, Map<number, { winner: string | null; outcome: string }>>()
  for (const row of boutRows ?? []) {
    const weight = Number(row.weight_class)
    const map = boutsByWeight.get(weight) ?? new Map()
    map.set(Number(row.bout_number), {
      winner: row.winner_athlete_id ? String(row.winner_athlete_id) : null,
      outcome: outcomeLabel(
        row.method as string | null,
        row.winner_score == null ? null : Number(row.winner_score),
        row.loser_score == null ? null : Number(row.loser_score),
      ),
    })
    boutsByWeight.set(weight, map)
  }

  const out: WeightResults[] = []
  for (const weightClass of TOC_WEIGHT_CLASSES) {
    const draw = await getLockedDraw(admin, weightClass)
    if (!draw) continue
    const recorded = boutsByWeight.get(weightClass) ?? new Map()
    const byId = new Map((draw.participants ?? []).map((p) => [p.athleteId, p]))

    /**
     * Who stood in a slot once the results are applied.
     *
     * The draw's own labels stay "Winner of bout 3" forever, so a finished bracket has to be
     * resolved from the recorded winners. A bye advances whoever is unopposed: 133 ran seven
     * wrestlers after a withdrawal, and nothing was recorded for the bouts nobody wrestled.
     */
    const occupant = (slot: TocBracketSlot, depth = 0): string | null => {
      if (depth > 12 || slot.kind === "empty") return null
      if (slot.kind === "athlete") return slot.athleteId
      const feeder = (draw as TocBracketDraw).bouts.find((b) => b.boutNumber === slot.boutNumber)
      if (!feeder) return null
      const top = occupant(feeder.top, depth + 1)
      const bottom = occupant(feeder.bottom, depth + 1)
      const winner =
        recorded.get(slot.boutNumber)?.winner ?? (top && !bottom ? top : bottom && !top ? bottom : null)
      if (/winner/i.test(slot.label)) return winner
      if (!winner) return null
      return top === winner ? bottom : bottom === winner ? top : null
    }

    const wrestler = (slot: TocBracketSlot, winnerId: string | null): ResultWrestler | null => {
      const athleteId = occupant(slot)
      if (!athleteId) return null
      const participant = byId.get(athleteId)
      return {
        athleteId,
        name: participant?.name ?? "Athlete",
        seed: participant?.seed ?? null,
        club: participant?.club ?? null,
        won: winnerId != null && winnerId === athleteId,
      }
    }

    const bouts = [...draw.bouts]
      .sort((a, b) => a.boutNumber - b.boutNumber)
      .map((bout) => {
        const result = recorded.get(bout.boutNumber)
        return {
          boutNumber: bout.boutNumber,
          roundLabel: bout.roundLabel,
          side: bout.side,
          top: wrestler(bout.top, result?.winner ?? null),
          bottom: wrestler(bout.bottom, result?.winner ?? null),
          outcome: result?.outcome ?? "",
        }
      })

    out.push({
      weightClass,
      placers: (resultsByWeight.get(weightClass) ?? []).sort((a, b) => a.place - b.place),
      bouts,
    })
  }
  return out
}
