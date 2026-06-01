import { createAdminClient } from "@/lib/supabase/admin"

/** Featured athletes in the recruiting awards article — (name, school, year). */
export const RECRUITING_AWARDS_PROFILE_KEYS: [string, string, string][] = [
  ["Imon Freeman", "Montgomery Central", "2026"],
  ["Gavin Yow", "A.L. Brown", "2026"],
  ["Bentley Sly", "Stuart Cramer", "2026"],
  ["Avery Rhymer", "St. Stephens", "2026"],
  ["Jacob Reigel", "Mount Pleasant", "2026"],
  ["Cameron Gue", "Mount Pleasant", "2026"],
  ["Andrew Meadows", "Mount Airy", "2026"],
  ["Dominic Hittepole", "Wheatmore", "2026"],
]

function norm(s: string) {
  return (s || "").trim().replace(/\s+/g, " ").toLowerCase()
}

function normSchool(s: string) {
  let t = norm(s)
  for (const suffix of [" high school", " hs", " high"]) {
    if (t.endsWith(suffix)) t = t.slice(0, -suffix.length).trim()
  }
  return t.replace(/\./g, "").replace(/\s+/g, " ").trim()
}

function getFullName(row: Record<string, unknown>): string {
  const name = (row.name as string)?.trim()
  if (name) return name
  return (row.wrestling_name as string)?.trim() || ""
}

export function recruitingAwardsProfileKey(name: string, school: string, year = "2026") {
  return `${name}|${school}|${year}`
}

/** Resolve featured athlete names to athlete IDs for /view-profile links. */
export async function getRecruitingAwardsProfileIdMap(): Promise<Record<string, string>> {
  const supabase = createAdminClient()
  const years = [2026]
  let { data: athletes, error } = await supabase
    .from("athletes")
    .select("id, name, wrestling_name, highschool, graduationyear")
    .in("graduationyear", years)
  if ((error || !athletes?.length) && supabase) {
    const fallback = await supabase
      .from("athletes")
      .select("id, name, wrestling_name, highschool, graduationyear")
      .in("graduation_year", years)
    if (fallback.data?.length) {
      athletes = fallback.data
      error = fallback.error
    }
  }

  const map: Record<string, string> = {}
  if (error || !athletes?.length) return map

  for (const [name, school, year] of RECRUITING_AWARDS_PROFILE_KEYS) {
    const wantName = norm(name)
    const wantSchoolNorm = normSchool(school)
    const match = athletes.find((a) => {
      const row = a as Record<string, unknown>
      const full = getFullName(row)
      const gy = String((row.graduationyear as number) ?? "")
      if (gy !== year) return false
      if (norm(full) !== wantName) return false
      if (!wantSchoolNorm) return true
      const hs = normSchool((row.highschool as string) || "")
      return hs === wantSchoolNorm || hs.includes(wantSchoolNorm) || wantSchoolNorm.includes(hs)
    })
    if (match) map[recruitingAwardsProfileKey(name, school, year)] = (match as Record<string, unknown>).id as string
  }
  return map
}

export function recruitingAwardsProfileHref(
  name: string,
  school: string,
  profileIdMap: Record<string, string>,
  year = "2026",
): string {
  const id = profileIdMap[recruitingAwardsProfileKey(name, school, year)]
  if (id) return `/view-profile?id=${encodeURIComponent(id)}`
  const params = new URLSearchParams({ name: name.trim(), school: school.trim(), year: year.trim() })
  return `/unified-profile/by-name?${params.toString()}`
}
