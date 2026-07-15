/**
 * Detect school wrestling dossier lookups (no Supabase — unit-test safe).
 */

import {
  extractSearchablePhrase,
  stripConversationalNoise,
  tokenizeMeaningfulWords,
} from "./search-normalize"

/** Explicit school-oriented queries. */
const SCHOOL_CUE =
  /\b(high\s*school|hs\b|wrestling\s+(program|team|school)|school\s+wrestling|tell me about .{0,40}\b(hs|high school)\b)\b/i

/** Not a school dossier — keep full agent / person path. */
const SCHOOL_TOPIC_BLOCK =
  /\b(ranking|rankings|who is|who's|whos|wrestler named|class of\s*20\d{2}\s*rankings?|4x|3x|2x\s+state|how many nhsca|which school has the most|leaderboard|fargo results|dual team champions|committed to)\b/i

/** Known multi-word school patterns without requiring "high school". */
const SCHOOL_NAMEISH =
  /\b(county|academy|prep|preparatory|christian|catholic|charter|gibbons|jordan|page|apex|wakefield|millbrook|leicester|hickory|cary|green\s+level|chapel\s+hill)\b/i

export function isLikelySchoolWrestlingLookup(message: string): boolean {
  const raw = (message ?? "").trim()
  if (raw.length < 3 || raw.length > 100) return false
  if (SCHOOL_TOPIC_BLOCK.test(raw)) return false

  const phrase = extractSearchablePhrase(raw) || stripConversationalNoise(raw)
  const tokens = tokenizeMeaningfulWords(phrase)
  if (tokens.length < 1 || tokens.length > 6) return false

  if (SCHOOL_CUE.test(raw)) return true

  // "Avery County", "Cardinal Gibbons", "Green Level" without "high school"
  if (tokens.length >= 2 && SCHOOL_NAMEISH.test(phrase)) return true

  // Ending in County / Academy / Prep even without other cues
  if (/\b(county|academy|prep|preparatory)\s*$/i.test(phrase)) return true

  return false
}

export function extractSchoolLookupPhrase(message: string): string {
  let phrase = (extractSearchablePhrase(message) || stripConversationalNoise(message)).trim()
  // Prefer keeping "high school" for fuzzy school match when user typed it
  const stripped = stripConversationalNoise(message).trim()
  if (/\bhigh\s*school\b/i.test(stripped) && !/\bhigh\s*school\b/i.test(phrase)) {
    phrase = stripped.replace(/\?+$/, "").trim()
  }
  return phrase
}
