/**
 * URL slug for a club.
 *
 * Derived from the display name rather than stored, because `wrestling_clubs.name` already
 * carries a unique constraint — so the slug inherits that uniqueness without another
 * column or migration. Built from the full name, not `normalized_name`, which strips the
 * very words that make a URL readable ("NC Wrestling Factory" would become "nc-factory").
 */
export function clubSlug(name: string): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Find a club whose name slugifies to this value. Case- and punctuation-insensitive. */
export function findClubBySlug<T extends { name?: string | null }>(clubs: T[], slug: string): T | null {
  const target = clubSlug(slug)
  return clubs.find((club) => clubSlug(String(club.name ?? "")) === target) ?? null
}
