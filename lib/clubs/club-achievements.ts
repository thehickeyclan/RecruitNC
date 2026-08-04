/**
 * What a club's wrestlers have done, assembled for the club page.
 *
 * Two very different grades of data live here and the page must not blur them:
 *
 *  - `college`, `graduationyear`, `prospect_ranking` and `nhsca_*_placement` are real
 *    columns. Anything derived from them is dependable.
 *  - State results exist only as free text in `achievements`, written by hand in every
 *    imaginable format ("2x State Placer", "2025 State Champion", "SO 2nd 1A states 132",
 *    "Placed 4th in 8a at 2025/26 state championships"). We can classify those into
 *    champion / placer / qualifier with confidence, but a year, weight or division cannot
 *    be pulled out of all of them — so we don't pretend to, and we keep the original text
 *    so a reader can always see the source.
 */

import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"

export type AthleteRow = Record<string, any>

export type ClubCommit = {
  name: string
  college: string
  classYear: string | null
  logoUrl: string | null
}

export type ClubRankedAthlete = {
  name: string
  rank: number
  classYear: string | null
  weight: string | null
}

export type ClubHonour = {
  name: string
  /** Highest thing we could establish. */
  label: string
  /** The profile text it came from, so the claim is always checkable. */
  source: string
}

export type ClubAchievements = {
  commits: ClubCommit[]
  ranked: ClubRankedAthlete[]
  stateChampions: ClubHonour[]
  statePlacers: ClubHonour[]
  nhscaAllAmericans: ClubHonour[]
}

const asText = (value: unknown) => String(value ?? "").trim()

function athleteName(row: AthleteRow): string {
  const composed = [row.firstName, row.lastName].filter(Boolean).join(" ").trim()
  return asText(row.name) || asText(row.wrestling_name) || composed || "RecruitNC athlete"
}

/**
 * NHSCA places the top eight, so a placement of 1–8 is an All-American. Values arrive as
 * "3", "7th" and similar, hence the digit extraction.
 */
function nhscaAllAmericanYears(row: AthleteRow): string[] {
  const years: string[] = []
  for (const year of ["2023", "2024", "2025", "2026"]) {
    const raw = asText(row[`nhsca_${year}_placement`])
    if (!raw) continue
    const place = Number(raw.replace(/[^\d]/g, ""))
    if (Number.isFinite(place) && place >= 1 && place <= 8) years.push(`${year} (${place})`)
  }
  return years
}

/**
 * "State Championships" is the name of the event, not a title — matching bare "champ"
 * labelled anyone who merely competed there a champion, including a wrestler whose entry
 * read "State Championships - 157 lb 2nd Place". Hence the (?!ship) guard.
 */
const CHAMPION = /\bstate\s+champ(?:ion(?!ship)|s?\b)|\b1st\b[^,.]{0,20}\bstate\b|\bstate\b[^,.]{0,20}\b1st\b/i
const PLACER =
  /\bstate\s*(placer|finalist|runner[\s-]?up)|\b[2-8](nd|rd|th)\b[^,.]{0,25}\bstate\b|\bstate\b[^,.]{0,25}\b[2-8](nd|rd|th)\b|placed\s*\d+[a-z]{0,2}\b[^,.]{0,30}\bstate\b/i
/** A team title says nothing about the individual, so it must not become a personal one. */
const TEAM = /\bteam\b/i

function classifyPhrase(phrase: string): "champion" | "placer" | null {
  // Order matters: a phrase naming a placing is a placing even if it also names the event.
  if (PLACER.test(phrase)) return "placer"
  if (CHAMPION.test(phrase) && !TEAM.test(phrase)) return "champion"
  return null
}

function phrasesOf(text: string): string[] {
  return text.split(/[,\n;]|\.\s/).map((part) => part.trim()).filter(Boolean)
}

/**
 * The strongest INDIVIDUAL state claim across the phrases, judged one phrase at a time.
 * Testing the whole blob let a champion phrase anywhere in a profile outrank a placing,
 * and let an event name outrank a result.
 */
function stateHonour(text: string): "champion" | "placer" | null {
  if (!text) return null
  const found = phrasesOf(text).map(classifyPhrase)
  if (found.includes("champion")) return "champion"
  if (found.includes("placer")) return "placer"
  return null
}

/**
 * The phrase that justifies the label we chose — matched against that honour's own
 * pattern, not either of them. Searching both produced evidence lines like
 * "State champion — Sophomore State Placer (4th)", which reads as a bug even when the
 * classification was correct from a champion phrase elsewhere in the text.
 */
function honourSnippet(text: string, honour: "champion" | "placer"): string {
  const parts = phrasesOf(text)
  const hit = parts.find((part) => classifyPhrase(part) === honour)
  return (hit ?? parts[0] ?? text).slice(0, 90)
}

export function buildClubAchievements(athletes: AthleteRow[]): ClubAchievements {
  const commits: ClubCommit[] = []
  const ranked: ClubRankedAthlete[] = []
  const stateChampions: ClubHonour[] = []
  const statePlacers: ClubHonour[] = []
  const nhscaAllAmericans: ClubHonour[] = []

  for (const row of athletes) {
    const name = athleteName(row)
    const classYear = asText(row.graduationyear) || null

    const college = asText(row.college)
    if (college) {
      commits.push({ name, college, classYear, logoUrl: asText(row.collegeLogoUrl) || null })
    }

    /**
     * Only wrestlers inside a published ranking. `prospect_ranking` keeps ordering well
     * past what we publish — the 2026 class runs to 119 — but a wrestler sitting at 67 is
     * not ranked, and "#67" claims a standing that does not exist. Only some classes are
     * published at all, so an unpublished year shows no ranks rather than leaking a
     * working order.
     *
     * Deliberately uses lib/public-rankings-cap.ts, the same source Data Dawg and
     * /public-rankings use, so the club page can never disagree with the rankings page.
     */
    const rank = Number(row.prospect_ranking)
    const year = Number(classYear)
    if (
      Number.isFinite(rank) &&
      rank > 0 &&
      isPublicRankingsYearPublished(year) &&
      rank <= getPublicRankingsMax(year)
    ) {
      ranked.push({ name, rank, classYear, weight: asText(row.weightclass) || asText(row.weight) || null })
    }

    const aaYears = nhscaAllAmericanYears(row)
    if (aaYears.length) {
      nhscaAllAmericans.push({ name, label: `NHSCA All-American — ${aaYears.join(", ")}`, source: "" })
    }

    const text = [asText(row.achievements), asText(row.additional_achievements)].filter(Boolean).join(", ")
    const honour = stateHonour(text)
    if (honour === "champion") stateChampions.push({ name, label: "State champion", source: honourSnippet(text, "champion") })
    else if (honour === "placer") statePlacers.push({ name, label: "State placer", source: honourSnippet(text, "placer") })
  }

  commits.sort((a, b) => (b.classYear ?? "").localeCompare(a.classYear ?? "") || a.name.localeCompare(b.name))
  // Newest class first, then by rank within it — ranks only compare inside a class.
  ranked.sort((a, b) => (b.classYear ?? "").localeCompare(a.classYear ?? "") || a.rank - b.rank)
  const byName = (a: ClubHonour, b: ClubHonour) => a.name.localeCompare(b.name)

  return {
    commits,
    ranked,
    stateChampions: stateChampions.sort(byName),
    statePlacers: statePlacers.sort(byName),
    nhscaAllAmericans: nhscaAllAmericans.sort(byName),
  }
}
