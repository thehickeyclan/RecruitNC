/**
 * Strip chatty prefixes so tools work on "tell me about X" the same as "X".
 */

const LEADING_PATTERNS: RegExp[] = [
  /^(tell me (more )?about|who is|who are|who's|whos|what (do you know )?about|what about)\s+/i,
  /^(info(rmation)? on|information about|look up|look for|find|show me|search for|give me)\s+/i,
  /^(can you tell me about|i want to know about|do you know|tell me)\s+/i,
  /^(about|regarding)\s+/i,
]

/** Words that are never the athlete/school string itself. */
const STOPWORDS = new Set([
  "tell",
  "me",
  "about",
  "the",
  "a",
  "an",
  "who",
  "is",
  "are",
  "was",
  "what",
  "does",
  "do",
  "did",
  "can",
  "you",
  "please",
  "info",
  "information",
  "on",
  "for",
  "from",
  "at",
  "hs",
  "high",
  "school",
  "wrestler",
  "wrestling",
  "athlete",
  "player",
  "kid",
  "this",
  "that",
  "nc",
  "north",
  "carolina",
  "someone",
  "named",
  "called",
])

export function stripConversationalNoise(input: string): string {
  let s = (input ?? "").replace(/\?/g, " ").replace(/\s+/g, " ").trim()
  let prev = ""
  while (prev !== s) {
    prev = s
    for (const re of LEADING_PATTERNS) {
      s = s.replace(re, "").trim()
    }
  }
  return s.trim()
}

/** Remove trailing noise (" high school", " hs") for cleaner tokens. */
export function stripTrailingSchoolNoise(input: string): string {
  return input
    .replace(/\s+(high\s*school|hs)\s*$/i, "")
    .replace(/\s+wrestling\s*$/i, "")
    .trim()
}

export function tokenizeMeaningfulWords(input: string): string[] {
  const s = stripTrailingSchoolNoise(stripConversationalNoise(input))
    .toLowerCase()
    .replace(/[^a-z0-9'\-\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !STOPWORDS.has(w) && w.length >= 2)
  return s
}

/** Prefer longest plausible name phrase for tool `query` args. */
export function extractSearchablePhrase(input: string): string {
  const stripped = stripTrailingSchoolNoise(stripConversationalNoise(input))
  const tokens = tokenizeMeaningfulWords(stripped)
  if (tokens.length === 0) return stripped.trim()
  return tokens.join(" ")
}
