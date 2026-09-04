/**
 * Finding a wrestler when the name is spelled wrong.
 *
 * A fifth of Data Dawg's answers over a fortnight were "I couldn't find any records", and the
 * people were usually there: a user typed "Deion marshals" for Deion Marshall, and "Heaven Finch"
 * for Heaven Fitch — the most decorated wrestler in the state's history. Exact and ILIKE matching
 * cannot survive one wrong letter, and a wrestling database is full of names nobody spells right
 * the first time.
 *
 * Trigram overlap rather than edit distance: it handles a dropped letter, a doubled one and a
 * transposition equally well, and it does not care that "marshals" and "Marshall" differ at the
 * end. At a few hundred names this runs in single-digit milliseconds, so no index or extension is
 * needed — which matters, because the production database offers no way to add one from here.
 */

export type FuzzyMatch<T> = { item: T; name: string; score: number }

/** Enough to be a real suggestion. Below this, "did you mean" starts inventing people. */
export const SUGGEST_THRESHOLD = 0.55

/** Above this the match is good enough to answer with rather than ask about. */
export const CONFIDENT_THRESHOLD = 0.82

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function trigrams(value: string): Set<string> {
  /** Padded, so short names still produce grams and the start of a word counts twice. */
  const padded = `  ${normalize(value)} `
  const out = new Set<string>()
  for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3))
  return out
}

/** Dice coefficient: shared trigrams over total, 0 to 1. */
export function nameSimilarity(a: string, b: string): number {
  const A = trigrams(a)
  const B = trigrams(b)
  if (A.size === 0 || B.size === 0) return 0
  let shared = 0
  for (const gram of A) if (B.has(gram)) shared++
  return (2 * shared) / (A.size + B.size)
}

/**
 * Best matches for a typed name, strongest first.
 *
 * Surname agreement is worth more than overall string closeness — "Deion Marshall" and "Deion
 * marshals" share a first name and nearly share a surname, while "Deion Marshall" and "Deion
 * Wilson" share only the first. Scoring the parts separately keeps a common first name from
 * carrying a match on its own.
 */
export function findSimilarNames<T>(
  query: string,
  candidates: readonly T[],
  nameOf: (item: T) => string,
  options: { limit?: number; threshold?: number } = {},
): FuzzyMatch<T>[] {
  const wanted = normalize(query)
  if (wanted.length < 3) return []

  const limit = options.limit ?? 5
  const threshold = options.threshold ?? SUGGEST_THRESHOLD
  const wantedParts = wanted.split(" ").filter(Boolean)
  const wantedSurname = wantedParts.length > 1 ? wantedParts[wantedParts.length - 1] : ""

  const scored: FuzzyMatch<T>[] = []
  for (const item of candidates) {
    const name = nameOf(item)
    if (!name) continue

    let score = nameSimilarity(wanted, name)

    if (wantedSurname) {
      const parts = normalize(name).split(" ").filter(Boolean)
      const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? ""
      const surnameScore = nameSimilarity(wantedSurname, surname)
      /** The surname carries the identification; the whole-string score is the sanity check. */
      score = score * 0.4 + surnameScore * 0.6
    }

    if (score >= threshold) scored.push({ item, name, score })
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** "Did you mean Heaven Fitch?" — or with several, a short list. */
export function didYouMeanLine(names: readonly string[]): string {
  const unique = [...new Set(names.filter(Boolean))]
  if (unique.length === 0) return ""
  if (unique.length === 1) return `Did you mean **${unique[0]}**?`
  const last = unique[unique.length - 1]
  return `Did you mean **${unique.slice(0, -1).join("**, **")}** or **${last}**?`
}
