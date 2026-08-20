/**
 * Resolve a clear school lookup to verified facts before the model runs.
 *
 * This used to return finished markdown and skip OpenAI, which is why every school answer was
 * the same wall of champions and placements. It still does the same lookup — the saving was the
 * database round trip, not the model round — but now the reply is written as conversation.
 */

import { buildSchoolFacts } from "@/lib/data-dawg-school-dossier"
import {
  extractSchoolLookupPhrase,
  isLikelySchoolWrestlingLookup,
} from "./school-name-fast-path-detect"

export { isLikelySchoolWrestlingLookup } from "./school-name-fast-path-detect"

export type SchoolFastPathHit = {
  /** Verified facts, JSON-serialisable, for the model to answer from. */
  facts: unknown
  searchedFor: string
}

export async function trySchoolNameFastPath(message: string): Promise<SchoolFastPathHit | null> {
  if (!isLikelySchoolWrestlingLookup(message)) return null

  const phrase = extractSchoolLookupPhrase(message)
  if (phrase.length < 2) return null

  const result = await buildSchoolFacts(phrase)
  if (!result.facts) return null

  return { facts: result.facts, searchedFor: result.searched_for || phrase }
}
