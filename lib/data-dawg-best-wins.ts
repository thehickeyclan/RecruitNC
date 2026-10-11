import type { SupabaseClient } from "@supabase/supabase-js"
import { loadReportSignificantWins } from "@/lib/report-significant-wins"
import { loadOpponentIndex } from "@/lib/scouting-report"
import { accoladeLineWithRank, withAccoladesOnly, type SignificantWin } from "@/lib/significant-wins"
import { loadStatePlacerIndex } from "@/lib/state-placers"

/**
 * "What are his best wins?" - answered from the list the profile and the scouting report print.
 *
 * Data Dawg was handed a wrestler's records and placings and nothing about who he beat, so asked
 * for his best wins it said it held no individual results - about a wrestler with seven wins
 * over state placers on his own profile. The list already exists; this hands it over.
 *
 * Loaded only when the question asks for it: the opponent index is the slow part, and a plain
 * name lookup should not wait for it.
 */

const QUALITY = "big|bigger|biggest|best|better|major|notable|signature|significant|quality|top|good|great|key|ranked|impressive|marquee|statement"

/** Asking which opponents a win came over - not how many wins, and not a record. */
export function isBestWinsQuestion(message: string): boolean {
  const lower = String(message ?? "").toLowerCase().replace(/[’‘]/g, "'")
  if (new RegExp(`\\b(${QUALITY})\\b[^.?!]{0,40}\\b(wins?|victor(y|ies))\\b`).test(lower)) return true
  if (/\bwins?\b[^.?!]{0,30}\b(over|against)\b[^.?!]{0,40}\b(ranked|placers?|champ(ion)?s?|all[- ]americans?)\b/.test(lower)) return true
  if (/\bwho\b[^.?!]{0,25}\b(beat|beaten|defeated|pinned)\b/.test(lower)) return true
  if (/\b(beat|beaten|defeated)\b[^.?!]{0,20}\b(anyone|anybody|any)\b/.test(lower)) return true
  return false
}

export type BestWinFact = {
  opponent: string
  opponent_team: string | null
  /** The opponent's credential, finished: "2026 NCHSAA 3A State 4th". */
  opponent_credential: string
  event: string | null
  date: string | null
  result: string | null
}

/**
 * The public shape of the list.
 *
 * An opponent's North Carolina prospect ranking is never included: classes are ranked privately
 * before they are published. A win whose only distinction is that ranking is left out rather
 * than described vaguely.
 */
export function bestWinFacts(wins: readonly SignificantWin[], limit = 10): { wins: BestWinFact[]; total: number } {
  const all: BestWinFact[] = []
  for (const w of withAccoladesOnly(wins)) {
    const credential = accoladeLineWithRank(w)
    if (!credential) continue
    all.push({
      opponent: w.opponent,
      opponent_team: w.opponentSchool,
      opponent_credential: credential,
      event: w.event,
      date: w.date,
      result: w.result,
    })
  }
  return { wins: all.slice(0, limit), total: all.length }
}

export function bestWinsWritingNotes(total: number, shown: number): string[] {
  if (total === 0) {
    return [
      "The question is about his best wins. `significant_wins` is our full list of wins over state placers, state champions, national placers and nationally ranked wrestlers, and it is empty.",
      "Say plainly that we hold no wins over a state placer, state champion, national placer or nationally ranked wrestler for this wrestler. Do NOT say we have no results for him, and do not suggest looking elsewhere.",
    ]
  }
  return [
    "The question is about his best wins. Answer from `significant_wins`: each is a win over an opponent with the credential shown, strongest first. Name the opponent, his credential, the event and the result.",
    "State each `opponent_credential` exactly as written. Do not add a credential, a ranking or a placing that is not in the entry, and do not describe any other bout as a notable win.",
    ...(total > shown ? [`There are ${total} such wins in all; ${shown} are listed here. Say so, and point to the profile for the rest.`] : []),
  ]
}

export async function loadBestWins(
  supabase: SupabaseClient,
  athleteId: string,
  graduationYear: number | null,
): Promise<{ wins: BestWinFact[]; total: number }> {
  // The same index the profile and the scouting report build, so all three name the same wins.
  const [baseIndex, stateIndex] = await Promise.all([
    loadOpponentIndex(supabase),
    loadStatePlacerIndex(supabase, new Date(), { outOfState: true }).catch(() => ({
      statePlacers: [],
      stateSchools: [],
      fargoAllAmericans: [],
    })),
  ])
  const wins = await loadReportSignificantWins(supabase, athleteId, { ...baseIndex, ...stateIndex }, graduationYear)
  return bestWinFacts(wins)
}
