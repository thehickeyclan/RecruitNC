import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { parseShortSlug, resolveShortSlug, shortSlugFor, type ShortLinkAthlete } from "@/lib/profile-short-link"

const COLUMNS = "id, firstName, lastName, graduationyear, created_at"

/** Everyone in one class (or with no class on file), paged past the 1,000-row cap. */
async function classOf(admin: SupabaseClient, year: number | null): Promise<ShortLinkAthlete[]> {
  const rows: ShortLinkAthlete[] = []
  for (let page = 0; ; page++) {
    const base = admin.from("athletes").select(COLUMNS)
    const { data, error } = await (year == null ? base.is("graduationyear", null) : base.eq("graduationyear", year))
      .order("id")
      .range(page * 1000, page * 1000 + 999)
    if (error) throw new Error(`athletes class ${year}: ${error.message}`)
    rows.push(...((data ?? []) as ShortLinkAthlete[]))
    if ((data ?? []).length < 1000) break
  }
  return rows
}

/** "/w/xavier-bernthal-2029" for this profile, or null when it has no name. */
export async function shortLinkPathFor(admin: SupabaseClient, athleteId: string): Promise<string | null> {
  const { data } = await admin.from("athletes").select(COLUMNS).eq("id", athleteId).maybeSingle()
  if (!data) return null
  const athlete = data as ShortLinkAthlete
  const slug = shortSlugFor(athlete, await classOf(admin, athlete.graduationyear ?? null))
  return slug ? `/w/${slug}` : null
}

/** The profile id a short link names, or null. */
export async function athleteIdForShortSlug(admin: SupabaseClient, slug: string): Promise<string | null> {
  const parsed = parseShortSlug(slug)
  if (!parsed) return null
  return resolveShortSlug(parsed, await classOf(admin, parsed.year))?.id ?? null
}
