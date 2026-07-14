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

/** Identity fields shown at the top of a Data Dawg athlete answer (before tournament detail). */
export type AthleteAnswerSummary = {
  highSchool?: string | null
  graduationYear?: string | number | null
  college?: string | null
  division?: string | null
  weightClass?: string | null
  recruitingStatus?: string | null
}

function formatCollegeCommitLine(college: string, division?: string | null): string {
  const c = college.trim()
  const div = (division ?? "").trim()
  const divPart = div && !c.toLowerCase().includes(div.toLowerCase()) ? ` (${div})` : ""
  return `College commit: ${c}${divPart}`
}

/**
 * Opening block for Data Dawg athlete answers:
 * 1) summary on top with the athlete name as the profile hyperlink
 * 2) college commit (when known)
 * Prefer this helper anywhere we build a one-athlete dossier / "here's what I found" block.
 */
export function formatAthleteAnswerOpening(
  displayName: string,
  athleteId: string | null | undefined,
  profileUrl?: string | null,
  summary?: AthleteAnswerSummary | null,
): string[] {
  const name = displayName?.trim() || "this athlete"
  const url = (athleteId ? getAthleteProfileUrl(athleteId) : null) || profileUrl?.trim() || null
  const nameLink = url ? `[${name}](${url})` : name

  const lines: string[] = [`Here's what I found about ${nameLink}:`, ""]

  const hs = summary?.highSchool?.toString().trim()
  if (hs) lines.push(`High School: ${hs}`)

  const gy = summary?.graduationYear
  if (gy != null && String(gy).trim() !== "" && Number.isFinite(Number(gy))) {
    lines.push(`Class of: ${Math.floor(Number(gy))}`)
  }

  const college = summary?.college?.toString().trim()
  if (college) {
    lines.push(formatCollegeCommitLine(college, summary?.division))
  }

  const wt = summary?.weightClass
  if (wt != null && String(wt).trim() !== "") {
    lines.push(`Weight: ${String(wt).trim()}`)
  }

  const status = summary?.recruitingStatus?.toString().trim()
  if (status && !college) {
    lines.push(`Recruiting status: ${status}`)
  }

  if (hs || college || (gy != null && String(gy).trim() !== "") || status) {
    lines.push("")
  }

  return lines
}
