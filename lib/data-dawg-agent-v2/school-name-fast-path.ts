/**
 * Skip OpenAI for clear school wrestling lookups — return school dossier markdown directly.
 */

import { buildSchoolWrestlingDossierMarkdown } from "@/lib/data-dawg-school-dossier"
import {
  extractSchoolLookupPhrase,
  isLikelySchoolWrestlingLookup,
} from "./school-name-fast-path-detect"

export { isLikelySchoolWrestlingLookup } from "./school-name-fast-path-detect"

export async function trySchoolNameFastPath(
  message: string,
): Promise<{ markdown: string; searchedFor: string } | null> {
  if (!isLikelySchoolWrestlingLookup(message)) return null

  const phrase = extractSchoolLookupPhrase(message)
  if (phrase.length < 2) return null

  const result = await buildSchoolWrestlingDossierMarkdown(phrase)
  const md = typeof result.markdown === "string" ? result.markdown.trim() : ""
  if (!md || md.length < 40) return null
  // Soft miss messages are still useful — return them without OpenAI
  return { markdown: md, searchedFor: result.searched_for || phrase }
}
