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
  "unc chapel hill": "/UNC_Chapel_Hill_Logo.png",
  "university of north carolina": "/UNC_Chapel_Hill_Logo.png",
  "university of north carolina at chapel hill": "/UNC_Chapel_Hill_Logo.png",
  "nc state": "/wolfpack-logo.png",
  "north carolina state": "/wolfpack-logo.png",
  "north carolina state university": "/wolfpack-logo.png",
  "campbell university": "/campbell-university-seal.png",
  campbell: "/campbell-university-seal.png",
  "queens university": "/queens-university-shield.png",
  queens: "/queens-university-shield.png",
  "belmont abbey": "/belmont-abbey-architectural-detail.png",
  "belmont abbey college": "/belmont-abbey-architectural-detail.png",
  "unc pembroke":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/vaddsdmo-1745958227949.png",
  "university of north carolina at pembroke":
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/vaddsdmo-1745958227949.png",
  uncp: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/vaddsdmo-1745958227949.png",
  "greensboro college": "/Greensboro-College-Seal.png",
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

  for (const [mappedKey, url] of Object.entries(COLLEGE_DIRECT_LOGO_URLS)) {
    if (key.includes(mappedKey) || mappedKey.includes(key)) return url
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

async function lookupLogoInDatabase(entityType: string, entityName: string): Promise<string | null> {
  const normalizedType = normalizeEntityType(entityType)
  const canonicalName = normalizeEntityName(entityName)
  if (!canonicalName) return null

  const admin = createAdminClient()

  const { data: exactMatch } = await admin
    .from("logo_mappings")
    .select("logo_url, entity_name")
    .eq("entity_type", normalizedType)
    .ilike("entity_name", canonicalName)
    .maybeSingle()

  if (exactMatch?.logo_url) return exactMatch.logo_url

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

/** Resolve logo URL: direct /public (or blob) fallbacks, then logo_mappings via service role. */
export async function resolveEntityLogoUrl(entityType: string, entityName: string): Promise<string | null> {
  if (!entityName?.trim()) return null

  const direct = getDirectEntityLogoUrl(entityType, entityName)
  if (direct) return direct

  try {
    return await lookupLogoInDatabase(entityType, entityName)
  } catch (error) {
    console.error("[resolveEntityLogoUrl]", entityType, entityName, error)
    return null
  }
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
