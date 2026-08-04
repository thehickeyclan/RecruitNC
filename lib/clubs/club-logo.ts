import { normalizeClubName } from "@/lib/clubs/club-normalize"

/**
 * Resolve a club's logo.
 *
 * Logos live in two places. A club row can carry its own `logo_url`, but almost none do —
 * 50 of them sit in `logo_mappings`, keyed by entity name with its own alias list. The map
 * consulted both; the club page read only the club row, so 23 clubs showed a logo on the
 * map and none on their own page. One resolver, used by both, is the fix.
 *
 * Matching goes through the same normaliser as everything else, so "Sly Fox" finds a logo
 * filed under "Slyfox".
 */

export type LogoMappingRow = {
  entity_name?: string | null
  logo_url?: string | null
  aliases?: unknown
}

/** Build a lookup of normalised name → logo URL from the logo_mappings rows. */
export function buildClubLogoIndex(rows: LogoMappingRow[]): Map<string, string> {
  const index = new Map<string, string>()

  for (const row of rows) {
    const url = String(row.logo_url ?? "").trim()
    if (!url) continue

    const keys: string[] = [String(row.entity_name ?? "")]
    // `aliases` is jsonb and has arrived as an array, a JSON string, and null.
    const raw = row.aliases
    if (Array.isArray(raw)) {
      keys.push(...raw.map((value) => String(value ?? "")))
    } else if (typeof raw === "string" && raw.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) keys.push(...parsed.map((value) => String(value ?? "")))
      } catch {
        /* ignore malformed alias payloads */
      }
    }

    for (const key of keys) {
      const normalized = normalizeClubName(key)
      if (normalized && !index.has(normalized)) index.set(normalized, url)
    }
  }

  return index
}

/**
 * The logo for one club: its own first, then the mapping table under its canonical name
 * or any of its aliases.
 */
export function resolveClubLogo(
  club: { name?: string | null; normalized_name?: string | null; logo_url?: string | null },
  logoIndex: Map<string, string>,
  clubAliases: string[] = [],
): string | null {
  const own = String(club.logo_url ?? "").trim()
  if (own) return own

  const candidates = [
    String(club.normalized_name ?? ""),
    normalizeClubName(String(club.name ?? "")),
    ...clubAliases.map((alias) => normalizeClubName(alias)),
  ]

  for (const key of candidates) {
    if (!key) continue
    const hit = logoIndex.get(key)
    if (hit) return hit
  }

  return null
}
