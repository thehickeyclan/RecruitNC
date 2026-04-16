/**
 * Athlete profile links - link names to RecruitNC profiles when athlete exists in athletes table.
 */

export const RECRUITNC_APP_URL = "https://app.ncwrestlingunited.com"

/** RecruitNC athlete profile path (used on both legacy NC and RecruitNC). Always use this for clickable profile links. */
export const RECRUITNC_PROFILE_PATH = "/unified-profile"

/** Build absolute profile URL for an athlete id (works on legacy NC and RecruitNC). */
export function getAthleteProfileUrl(id: string): string {
  return `${RECRUITNC_APP_URL}${RECRUITNC_PROFILE_PATH}/${id}`
}

/**
 * Batch lookup: for each name, find athlete id in athletes table.
 * Returns Map<normalizedName, profileUrl> for names that have profiles.
 */
export async function batchLookupAthleteProfileLinks(
  names: string[],
  adminClient: { from: (t: string) => { select: (c: string) => { or: (p: string) => Promise<{ data?: any[]; error?: unknown }> } } }
): Promise<Map<string, string>> {
  let unique = [...new Set(names.filter(Boolean).map((n) => n.trim()))].slice(0, 50)
  if (unique.length === 0) return new Map()

  // Names with apostrophe (e.g. D'Ettore) are sometimes stored with backtick (D`Ettore) in athletes — query both so profile links resolve
  const withVariants = new Set(unique)
  unique.forEach((n) => {
    if (n.includes("'")) withVariants.add(n.replace(/'/g, "`"))
    if (n.includes("`")) withVariants.add(n.replace(/`/g, "'"))
  })
  unique = [...withVariants]

  const orParts = unique.map((n) => `name.ilike.%${String(n).replace(/'/g, "''")}%`).join(",")
  const { data } = await adminClient.from("athletes").select("id, name").or(orParts)
  const map = new Map<string, string>()
  for (const row of data || []) {
    const name = row?.name?.trim()
    const id = row?.id
    if (name && id) {
      const url = getAthleteProfileUrl(id)
      map.set(name.toLowerCase(), url)
      map.set(name, url)
      // So "Jackson D'Ettore" and "Jackson D`Ettore" both resolve to the same profile
      if (name.includes("'")) map.set(name.replace(/'/g, "`"), url)
      if (name.includes("`")) map.set(name.replace(/`/g, "'"), url)
    }
  }
  return map
}

/**
 * Format name as markdown link if profile exists, else plain name.
 */
export function formatNameWithProfileLink(
  name: string,
  linkMap: Map<string, string>
): string {
  if (!name?.trim()) return name
  const url = linkMap.get(name) ?? linkMap.get(name.toLowerCase())
  if (url) return `[${name}](${url})`
  return name
}
