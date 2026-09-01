import type { SupabaseClient } from "@supabase/supabase-js"
import { normalizeClubName } from "@/lib/clubs/club-normalize"

/**
 * Snapping a submitted club or school onto the name we actually hold.
 *
 * Club and school names are join keys, not labels: logos resolve by name through `logo_mappings`
 * and the club directory, so free text typed by a family quietly costs an athlete their crest.
 * A real case — an athlete filed under "Combat", which has a logo, asked to be changed to
 * "Combat Athletics", which has none.
 *
 * So a submitted name is only accepted when it matches something in the registry, and what gets
 * written is the registry's spelling rather than the submitted one. "school of hard knocks"
 * becomes "School of Hard Knocks". Anything unmatched is refused and reported, because inventing
 * a new spelling is how the directory drifted in the first place.
 */

export type AffiliationResolution =
  | { ok: true; canonical: string; clubId?: number | null }
  | { ok: false; reason: string }

/**
 * Only 169 of 418 athlete schools and 150 of 230 clubs are in the registries, so refusing every
 * unmatched name would block most legitimate corrections. The line that actually matters is
 * narrower: never trade a name that resolves to a logo for one that does not. If what is already
 * stored is itself unmatched, there is no crest to lose and the new name goes in as typed.
 */
function decide(
  submittedMatch: { canonical: string; clubId?: number | null } | null,
  currentIsKnown: boolean,
  submitted: string,
  kind: "club" | "school",
): AffiliationResolution {
  if (submittedMatch) return { ok: true, canonical: submittedMatch.canonical, clubId: submittedMatch.clubId }
  if (currentIsKnown) {
    return {
      ok: false,
      reason: `"${submitted}" is not in the ${kind} directory and the current value is — applying it would lose the logo. Add it to the directory first.`,
    }
  }
  return { ok: true, canonical: submitted.trim() }
}

/** Schools normalise more literally than clubs — "Trinity" and "Trinty" must not collide. */
function normalizeSchoolName(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(high school|highschool|high|hs|senior)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export async function resolveClubName(
  supabase: SupabaseClient,
  submitted: string,
  current?: string | null,
): Promise<AffiliationResolution> {
  const wanted = normalizeClubName(submitted)
  if (!wanted) return { ok: false, reason: "empty club name" }

  const { data } = await supabase.from("wrestling_clubs").select("id, name")
  const rows = (data ?? []) as { id: number; name: string }[]
  const match = rows.find((c) => normalizeClubName(c.name) === wanted)
  const currentKey = normalizeClubName(current)
  const currentIsKnown = Boolean(currentKey) && rows.some((c) => normalizeClubName(c.name) === currentKey)

  return decide(match ? { canonical: match.name, clubId: match.id ?? null } : null, currentIsKnown, submitted, "club")
}

export async function resolveSchoolName(
  supabase: SupabaseClient,
  submitted: string,
  current?: string | null,
): Promise<AffiliationResolution> {
  const wanted = normalizeSchoolName(submitted)
  if (!wanted) return { ok: false, reason: "empty school name" }

  const { data } = await supabase.from("schools").select("name, canonical_name")
  const rows = (data ?? []) as { name: string; canonical_name: string | null }[]
  const hit = (key: string) =>
    rows.find((s) => normalizeSchoolName(s.name) === key || normalizeSchoolName(s.canonical_name) === key)
  const match = hit(wanted)
  const currentKey = normalizeSchoolName(current)
  const currentIsKnown = Boolean(currentKey) && Boolean(hit(currentKey))

  return decide(
    match ? { canonical: (match.canonical_name || match.name).trim() } : null,
    currentIsKnown,
    submitted,
    "school",
  )
}
