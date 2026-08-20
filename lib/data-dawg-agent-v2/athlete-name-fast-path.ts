/**
 * Resolve a clear wrestler-name lookup to verified facts before the model runs.
 *
 * This used to return finished markdown and skip OpenAI entirely, which is what made every
 * athlete answer identical. It still does the same lookups — the saving was never the model
 * round, it was the search + dossier round trip — but now it hands the facts to the model so
 * the reply is written as conversation.
 */

import {
  extractAthleteLookupPhrase,
  isLikelyAthleteNameLookup,
  pickClearAthleteId,
} from "./athlete-name-fast-path-detect"
import {
  toolGetAthleteFullDossier,
  toolSearchAthletes,
  toolWrestlingCrossStoreSearch,
} from "./execute-data-tools"
import { crossStoreHasUsefulHits } from "./format-cross-store-athlete-markdown"

export { isLikelyAthleteNameLookup } from "./athlete-name-fast-path-detect"

export type AthleteFastPathHit = {
  /** Verified facts, JSON-serialisable, for the model to answer from. */
  facts: unknown
  athleteId: string | null
  /** Where the facts came from — alumni rows read differently from a directory profile. */
  kind: "directory" | "historical"
}

export async function tryAthleteNameFastPath(message: string): Promise<AthleteFastPathHit | null> {
  if (!isLikelyAthleteNameLookup(message)) return null

  const phrase = extractAthleteLookupPhrase(message)
  if (phrase.length < 3) return null

  const search = await toolSearchAthletes({
    query: phrase,
    limit: 8,
    skipTournamentEnrich: true,
  })

  const rows = (search.rows ?? []) as Record<string, unknown>[]
  const id = pickClearAthleteId(phrase, rows, (search as { disambiguation?: unknown }).disambiguation)

  if (id) {
    const dossier = await toolGetAthleteFullDossier({ athlete_id: id })
    if (!("error" in dossier && dossier.error) && "facts" in dossier && dossier.facts) {
      return { facts: dossier.facts, athleteId: id, kind: "directory" }
    }
  }

  // Alumni / no clear directory id — fall back to the historical stores (Brandon Palmer path).
  const cross = await toolWrestlingCrossStoreSearch({ query: phrase, limit: 40 })
  if (!crossStoreHasUsefulHits(cross as never)) return null

  // These wrestlers predate the athlete directory, so there is no profile page to link to.
  // Say so explicitly — told only to link the name, the model will otherwise invent a URL.
  return {
    facts: {
      profile_url: null,
      writing_notes: [
        "This wrestler has no RecruitNC profile page. Write the name as plain text — do NOT make it a link, and never invent a profile URL.",
        "These are historical tournament rows, not a directory profile. We may hold nothing beyond what is here; do not read an empty section as proof they never competed.",
      ],
      results: cross,
    },
    athleteId: null,
    kind: "historical",
  }
}
