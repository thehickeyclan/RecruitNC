/**
 * A wrestler's club as the brackets should read it: a real name, or null.
 *
 * Every place that labels a bracket slot falls back with `club ?? "Unaffiliated"`, and `??` only
 * catches null. Eight of the eighty confirmed wrestlers for 2026 had their club saved as an empty
 * string, so their slot printed nothing at all — not a club, not "Unaffiliated", just a blank line
 * under the name. One more had the fallback typed into the club field itself, misspelled
 * ("Unafilliated"), which printed the typo.
 *
 * Normalising here, where the club is read, fixes every consumer at once rather than teaching each
 * renderer to distrust its input. Null means "no club"; the renderers already know what to do with
 * that.
 */
const NO_CLUB_PLACEHOLDERS = /^(n\/?a|none|no club|unattached|independent|unaff?il+iated|-+|—)$/i

export function normalizeClub(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null
  const club = raw.trim()
  if (!club || NO_CLUB_PLACEHOLDERS.test(club)) return null
  return club
}
