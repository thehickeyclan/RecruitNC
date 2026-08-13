import { normalizeClubName } from "@/lib/clubs/club-normalize"

/**
 * Which clubs the confirmed TOC field comes from.
 *
 * Counted off the athlete's own `wrestlingClub` free text, normalised the same way the club
 * map does, so "RAW" and "Raleigh Area Wolfpack" land in one slice instead of two. The
 * display name is the most common spelling among the athletes in that slice, which reads
 * better than the normalised key.
 *
 * Athletes with no club are their own slice rather than being dropped — "how many of this
 * field train at a club at all" is part of what the chart is for.
 */

export type ClubSlice = {
  club: string
  count: number
  /** 0–100, rounded to one decimal so small slices do not all read as 0%. */
  percentage: number
}

export const NO_CLUB_LABEL = "No club listed" as const

export function buildFieldClubBreakdown(
  athletes: Array<{ wrestlingClub?: unknown; wrestling_club?: unknown }>,
): { slices: ClubSlice[]; total: number } {
  const total = athletes.length
  if (total === 0) return { slices: [], total: 0 }

  // key -> { spellings, count } so the slice can be labelled with what people actually type.
  const groups = new Map<string, { spellings: Map<string, number>; count: number }>()

  for (const athlete of athletes) {
    const raw = String(athlete.wrestlingClub ?? athlete.wrestling_club ?? "").trim()
    const key = raw ? normalizeClubName(raw) || NO_CLUB_LABEL : NO_CLUB_LABEL
    const label = raw || NO_CLUB_LABEL

    const group = groups.get(key) ?? { spellings: new Map<string, number>(), count: 0 }
    group.count += 1
    group.spellings.set(label, (group.spellings.get(label) ?? 0) + 1)
    groups.set(key, group)
  }

  const slices: ClubSlice[] = [...groups.entries()].map(([key, group]) => {
    const label =
      key === NO_CLUB_LABEL
        ? NO_CLUB_LABEL
        : [...group.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
    return {
      club: label,
      count: group.count,
      percentage: Math.round((group.count / total) * 1000) / 10,
    }
  })

  // Biggest first, ties alphabetical, and "No club listed" always last so it never leads.
  slices.sort((a, b) => {
    if (a.club === NO_CLUB_LABEL) return 1
    if (b.club === NO_CLUB_LABEL) return -1
    return b.count - a.count || a.club.localeCompare(b.club)
  })

  return { slices, total }
}
