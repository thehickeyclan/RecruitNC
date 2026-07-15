/**
 * Skip the OpenAI tool loop for clear "who is / name" lookups when directory has one match.
 */

import {
  extractAthleteLookupPhrase,
  isLikelyAthleteNameLookup,
  pickClearAthleteId,
} from "./athlete-name-fast-path-detect"
import { toolGetAthleteFullDossier, toolSearchAthletes } from "./execute-data-tools"

export { isLikelyAthleteNameLookup } from "./athlete-name-fast-path-detect"

export async function tryAthleteNameFastPath(
  message: string,
): Promise<{ markdown: string; athleteId: string } | null> {
  if (!isLikelyAthleteNameLookup(message)) return null

  const phrase = extractAthleteLookupPhrase(message)
  if (phrase.length < 3) return null

  const search = await toolSearchAthletes({
    query: phrase,
    limit: 8,
    skipTournamentEnrich: true,
  })

  if ("error" in search && search.error && !search.rows?.length) return null
  const rows = (search.rows ?? []) as Record<string, unknown>[]
  const id = pickClearAthleteId(phrase, rows, (search as { disambiguation?: unknown }).disambiguation)
  if (!id) return null

  const dossier = await toolGetAthleteFullDossier({ athlete_id: id })
  const md = typeof dossier.markdown === "string" ? dossier.markdown.trim() : ""
  if (("error" in dossier && dossier.error) || md.length < 40) return null

  return { markdown: md, athleteId: id }
}
