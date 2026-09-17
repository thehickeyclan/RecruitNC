import { normalizeClubName } from "@/lib/clubs/club-normalize"

/**
 * Clubs that are one club for counting, whatever name a family typed.
 *
 * Normalising a club name folds case, punctuation and filler words, but it will never make an
 * acronym equal its expansion: "RAW" and "Raleigh Area Wolfpack" normalise to "raw" and
 * "raleigh area wolfpack" and stay apart. That split RAW's count in the TOC field stats the moment
 * one family typed the full name — seven wrestlers read as RAW and one as a club of his own.
 *
 * So the names a club goes by are listed here, once, and every place that counts clubs asks this
 * rather than comparing strings. This is for numbers only. A wrestler's own line still prints the
 * name his family gave, so RAW West reads as RAW West on the page and adds to RAW in the totals.
 *
 * Aliases are written as normalizeClubName output, not as typed. That function strips "wrestling",
 * so "Raleigh Area Wrestling" arrives here as "raleigh area".
 */

type ClubFamily = {
  /** What the family is called wherever it is counted. */
  label: string
  aliases: readonly string[]
}

const FAMILIES: readonly ClubFamily[] = [
  {
    label: "RAW",
    // RAW, Raleigh Area Wolfpack, Raleigh Area Wrestling, and RAW West — confirmed by Matt as one
    // club for analytics, with RAW West included in RAW's numbers.
    aliases: ["raw", "raleigh area wolfpack", "raleigh area", "raw west"],
  },
]

const FAMILY_BY_ALIAS = new Map<string, ClubFamily>()
for (const family of FAMILIES) {
  for (const alias of family.aliases) FAMILY_BY_ALIAS.set(alias, family)
}

/** The family label a club counts under, or null when it belongs to no family. */
export function clubFamilyLabel(club: string | null | undefined): string | null {
  return FAMILY_BY_ALIAS.get(normalizeClubName(club))?.label ?? null
}

/**
 * The key a club is grouped under when counting: its family when it has one, otherwise its own
 * normalised name. Prefixed so a family can never collide with a club whose normalised name happens
 * to equal a family label.
 */
export function clubCountKey(club: string | null | undefined): string {
  const family = FAMILY_BY_ALIAS.get(normalizeClubName(club))
  return family ? `family:${family.label}` : normalizeClubName(club)
}
