/**
 * Commitments and rankings for a club page, both from real columns.
 *
 * Tournament honours are NOT here — they come from the result tables via
 * lib/clubs/club-tournament-honours.ts. This file used to classify the free-text
 * `achievements` field, which credited wrestlers with results they had not earned and
 * missed the ones they had.
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

export type ClubAchievements = {
  commits: ClubCommit[]
  ranked: ClubRankedAthlete[]
}

const asText = (value: unknown) => String(value ?? "").trim()

function athleteName(row: AthleteRow): string {
  const composed = [row.firstName, row.lastName].filter(Boolean).join(" ").trim()
  return asText(row.name) || asText(row.wrestling_name) || composed || "RecruitNC athlete"
}




export function buildClubAchievements(athletes: AthleteRow[]): ClubAchievements {
  const commits: ClubCommit[] = []
  const ranked: ClubRankedAthlete[] = []

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
  }

  commits.sort((a, b) => (b.classYear ?? "").localeCompare(a.classYear ?? "") || a.name.localeCompare(b.name))
  // Newest class first, then by rank within it — ranks only compare inside a class.
  ranked.sort((a, b) => (b.classYear ?? "").localeCompare(a.classYear ?? "") || a.rank - b.rank)

  return {
    commits,
    ranked,
  }
}
