/**
 * Skip the OpenAI tool loop for clear wrestler-name lookups.
 * Directory hit → full dossier. Alumni / no id → cross-store markdown.
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
import {
  crossStoreHasUsefulHits,
  formatCrossStoreAthleteMarkdown,
} from "./format-cross-store-athlete-markdown"

export { isLikelyAthleteNameLookup } from "./athlete-name-fast-path-detect"

export async function tryAthleteNameFastPath(
  message: string,
): Promise<{ markdown: string; athleteId: string | null } | null> {
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
    const md = typeof dossier.markdown === "string" ? dossier.markdown.trim() : ""
    if (!(("error" in dossier && dossier.error) || md.length < 40)) {
      return { markdown: md, athleteId: id }
    }
  }

  // Alumni / no clear directory id — build from historical stores (Brandon Palmer path).
  const cross = await toolWrestlingCrossStoreSearch({ query: phrase, limit: 40 })
  if (!crossStoreHasUsefulHits(cross as never)) return null

  const markdown = formatCrossStoreAthleteMarkdown(phrase, cross as never)
  if (markdown.length < 40) return null
  return { markdown, athleteId: null }
}
