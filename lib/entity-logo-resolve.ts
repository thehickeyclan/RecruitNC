/**
 * Single source for college logo URLs: static files in /public first, then logo_mappings (Supabase).
 * Used by logo APIs, getLogoUrlServer, and server-rendered surfaces (e.g. recruiting awards cards).
 */
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeEntityName, normalizeEntityType } from "@/lib/logo-mappings-normalize"

/** Lowercase entity name → path under /public or absolute blob URL */
export const COLLEGE_DIRECT_LOGO_URLS: Record<string, string> = {
  "appalachian state":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/b9jnnu11-1745955862533.png",
  "appalachian state university":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/b9jnnu11-1745955862533.png",
  "app state":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/b9jnnu11-1745955862533.png",
  "unc chapel hill": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/Uigu95m8-1745952038636.png",
  "university of north carolina":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/Uigu95m8-1745952038636.png",
  "university of north carolina at chapel hill":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/Uigu95m8-1745952038636.png",
  "nc state": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fe5ixmej-1745958547259.png",
  "north carolina state":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fe5ixmej-1745958547259.png",
  "north carolina state university":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fe5ixmej-1745958547259.png",
  "campbell university":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/hQ12r1UqPiFiiEG_7lrvU-Campbell.png",
  campbell: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/hQ12r1UqPiFiiEG_7lrvU-Campbell.png",
  // No logo_mappings row for Queens yet, and /queens-university-shield.png is an AI-generated British royal
  // coat of arms reading "QUEEN UNIVERSITY". Better to render the name than the wrong crest.
  "belmont abbey":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logos/college/Belmont%20Abbey%20College-1755181484888.jpeg",
  "belmont abbey college":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logos/college/Belmont%20Abbey%20College-1755181484888.jpeg",
  "unc pembroke":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/vaddsdmo-1745958227949.png",
  "university of north carolina at pembroke":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/vaddsdmo-1745958227949.png",
  uncp: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/vaddsdmo-1745958227949.png",
  "greensboro college":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/o6LgFYqZjYR2MnZou4ydo-Greensboro%20College.png",
  // Public file was never shipped; use the same blob mark as TOC confirmed colleges.
  "roanoke college":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/-i2rnrys-1745958901725.png",
  roanoke:
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/-i2rnrys-1745958901725.png",
  lynchburg: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/SmHkZ3IPPB6ayHiOYue4Y-Lynchburg.jpg",
  "lynchburg university": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/SmHkZ3IPPB6ayHiOYue4Y-Lynchburg.jpg",
  "university of lynchburg": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/SmHkZ3IPPB6ayHiOYue4Y-Lynchburg.jpg",
  citadel: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/0fQVgxh_ayKYg7ClSb4Oo-Citadel.webp",
  "the citadel": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/0fQVgxh_ayKYg7ClSb4Oo-Citadel.webp",
  averett: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/XpGp9iaWUS2oENhX2XALE-Averett.png",
  "averett university": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/XpGp9iaWUS2oENhX2XALE-Averett.png",
  "mount olive": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/cwjgktar-1745958885613.png",
  "university of mount olive":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/cwjgktar-1745958885613.png",
  umo: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/cwjgktar-1745958885613.png",
  "emory & henry": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fylhrwhg-1745968815387.png",
  "emory and henry": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fylhrwhg-1745968815387.png",
  "emory & henry college":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fylhrwhg-1745968815387.png",
  "ohio state": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/kcgqvisv-1745968898953.png",
  "ohio state university":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/kcgqvisv-1745968898953.png",
  navy: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logos/college/Navy-20260810.png",
  "naval academy": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logos/college/Navy-20260810.png",
  "united states naval academy":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logos/college/Navy-20260810.png",
  "u.s. naval academy":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logos/college/Navy-20260810.png",
}

const HIGH_SCHOOL_DIRECT_LOGO_URLS: Record<string, string> = {
  "green level":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/XcmZnv2MqXA5sMIzKpJQy-Green%20Level.png",
  "green hope":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/pPaUHAqalF1e9SF-xslhG-Green%20Hope.png",
  millbrook:
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/ndVl5fY7GMNQIapSPvjnd-Millbrook.jpg",
}

function normKey(name: string) {
  return normalizeEntityName(name).toLowerCase()
}

export function getDirectCollegeLogoUrl(entityName: string): string | null {
  const key = normKey(entityName)
  if (!key) return null
  if (COLLEGE_DIRECT_LOGO_URLS[key]) return COLLEGE_DIRECT_LOGO_URLS[key]

  // Fuzzy only for longer keys — short tokens like "nc" / "state" used to steal wrong crests.
  for (const [mappedKey, url] of Object.entries(COLLEGE_DIRECT_LOGO_URLS)) {
    if (mappedKey.length < 5 || key.length < 4) continue
    if (key.includes(mappedKey) || (key.length >= 6 && mappedKey.includes(key))) return url
  }
  return null
}

function getDirectHighSchoolLogoUrl(entityName: string): string | null {
  let key = normKey(entityName)
  if (!key) return null
  const withoutSuffix = key.replace(/\s+high\s+school$/i, "").replace(/\s+hs$/i, "").trim()
  return (
    HIGH_SCHOOL_DIRECT_LOGO_URLS[key] ??
    HIGH_SCHOOL_DIRECT_LOGO_URLS[withoutSuffix] ??
    (key.includes("green level") ? HIGH_SCHOOL_DIRECT_LOGO_URLS["green level"] : null) ??
    (key.includes("green hope") ? HIGH_SCHOOL_DIRECT_LOGO_URLS["green hope"] : null) ??
    (key.includes("millbrook") ? HIGH_SCHOOL_DIRECT_LOGO_URLS.millbrook : null)
  )
}

export function getDirectEntityLogoUrl(entityType: string, entityName: string): string | null {
  const type = normalizeEntityType(entityType)
  if (type === "college") return getDirectCollegeLogoUrl(entityName)
  if (type === "highschool") return getDirectHighSchoolLogoUrl(entityName)
  return null
}

/** Exact (case-insensitive) name match in logo_mappings — the highest-trust source: an admin typed it. */
async function lookupExactLogoInDatabase(entityType: string, entityName: string): Promise<string | null> {
  const normalizedType = normalizeEntityType(entityType)
  const canonicalName = normalizeEntityName(entityName)
  if (!canonicalName) return null

  const { data: exactMatch } = await createAdminClient()
    .from("logo_mappings")
    .select("logo_url")
    .eq("entity_type", normalizedType)
    .ilike("entity_name", canonicalName)
    .maybeSingle()

  return exactMatch?.logo_url ?? null
}

/** Loose ilike match in logo_mappings. Last resort — it can pull a neighbouring school's crest. */
async function lookupFuzzyLogoInDatabase(entityType: string, entityName: string): Promise<string | null> {
  const normalizedType = normalizeEntityType(entityType)
  const canonicalName = normalizeEntityName(entityName)
  if (!canonicalName) return null

  const admin = createAdminClient()

  const firstToken =
    canonicalName
      .split(/\s+/)
      .find((t) => !/^(the|of|at|and)$/i.test(t)) ?? canonicalName
  const { data: fuzzyMatches } = await admin
    .from("logo_mappings")
    .select("logo_url, entity_name")
    .eq("entity_type", normalizedType)
    .or(
      `entity_name.ilike.%${canonicalName}%,entity_name.ilike.%${canonicalName.replace(/\s+/g, "%")}%,entity_name.ilike.%${firstToken}%`,
    )
    .limit(5)

  if (fuzzyMatches?.length) {
    const normalizedLower = canonicalName.toLowerCase()
    const ranked = [...fuzzyMatches].sort((a, b) => {
      const aName = (a.entity_name ?? "").toLowerCase()
      const bName = (b.entity_name ?? "").toLowerCase()
      const aExact = aName === normalizedLower ? 0 : 1
      const bExact = bName === normalizedLower ? 0 : 1
      if (aExact !== bExact) return aExact - bExact
      return aName.length - bName.length
    })
    return ranked[0]?.logo_url ?? null
  }

  return null
}

/**
 * Resolve a logo URL, most-trusted source first:
 *   1. exact logo_mappings row — an admin named this entity and set this URL, so it must win;
 *   2. the curated table above — precise aliases, and the guard against short tokens ("NC", "State")
 *      grabbing a neighbouring crest;
 *   3. fuzzy logo_mappings — loose enough to mismatch, so it only runs when nothing else answered.
 *
 * (1) used to sit last. The curated table shadowed it, so NC State served the local /wolfpack-logo.png
 * placeholder forever while logo_mappings held the real block S — and every admin edit was a no-op.
 */
export type LogoSource = "database-exact" | "direct" | "database-fuzzy"

/** Same resolution as resolveEntityLogoUrl, but reports which tier answered — the logo APIs label their response with it. */
export async function resolveEntityLogoUrlWithSource(
  entityType: string,
  entityName: string,
): Promise<{ url: string; source: LogoSource } | null> {
  if (!entityName?.trim()) return null

  try {
    const exact = await lookupExactLogoInDatabase(entityType, entityName)
    if (exact) return { url: exact, source: "database-exact" }
  } catch (error) {
    console.error("[resolveEntityLogoUrl] exact lookup failed", entityType, entityName, error)
  }

  const direct = getDirectEntityLogoUrl(entityType, entityName)
  if (direct) return { url: direct, source: "direct" }

  try {
    const fuzzy = await lookupFuzzyLogoInDatabase(entityType, entityName)
    return fuzzy ? { url: fuzzy, source: "database-fuzzy" } : null
  } catch (error) {
    console.error("[resolveEntityLogoUrl] fuzzy lookup failed", entityType, entityName, error)
    return null
  }
}

export async function resolveEntityLogoUrl(entityType: string, entityName: string): Promise<string | null> {
  return (await resolveEntityLogoUrlWithSource(entityType, entityName))?.url ?? null
}

/** Try several display names (e.g. "Lynchburg" then "Lynchburg University") for award cards. */
export async function resolveCollegeLogoUrlWithAliases(names: readonly string[]): Promise<string | null> {
  for (const name of names) {
    const url = await resolveEntityLogoUrl("college", name)
    if (url) return url
  }
  return null
}

export async function resolveCollegeLogoUrlMap(
  collegeToAliases: Record<string, readonly string[]>,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    Object.entries(collegeToAliases).map(async ([college, aliases]) => {
      const url = await resolveCollegeLogoUrlWithAliases(aliases)
      return [college, url] as const
    }),
  )
  const map: Record<string, string> = {}
  for (const [college, url] of entries) {
    if (url) map[college] = url
  }
  return map
}
