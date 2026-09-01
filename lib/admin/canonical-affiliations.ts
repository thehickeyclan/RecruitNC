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
): Promise<AffiliationResolution> {
  const wanted = normalizeClubName(submitted)
  if (!wanted) return { ok: false, reason: "empty club name" }

  const { data } = await supabase.from("wrestling_clubs").select("id, name")
  const match = (data ?? []).find((c: { name: string }) => normalizeClubName(c.name) === wanted)
  if (!match) {
    return {
      ok: false,
      reason: `"${submitted}" is not in the club directory — add the club there first, or its logo will not resolve`,
    }
  }
  return { ok: true, canonical: (match as { name: string }).name, clubId: (match as { id: number }).id ?? null }
}

export async function resolveSchoolName(
  supabase: SupabaseClient,
  submitted: string,
): Promise<AffiliationResolution> {
  const wanted = normalizeSchoolName(submitted)
  if (!wanted) return { ok: false, reason: "empty school name" }

  const { data } = await supabase.from("schools").select("name, canonical_name")
  const match = (data ?? []).find(
    (s: { name: string; canonical_name: string | null }) =>
      normalizeSchoolName(s.name) === wanted || normalizeSchoolName(s.canonical_name) === wanted,
  )
  if (!match) {
    return {
      ok: false,
      reason: `"${submitted}" is not in the school directory — check the spelling, or add the school first`,
    }
  }
  const row = match as { name: string; canonical_name: string | null }
  return { ok: true, canonical: (row.canonical_name || row.name).trim() }
}
