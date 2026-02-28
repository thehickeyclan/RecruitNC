import { createAdminClient } from "@/lib/supabase/admin"

/** (name, school, year) keys used in understanding-bracket-depth-2026 article. Used to resolve to athlete IDs once at request time. */
export const ARTICLE_2_PROFILE_KEYS: [string, string, string][] = [
  ["Tye Johnson", "Cape Fear", "2027"],
  ["Aidan Szewczyk", "Davie", "2027"],
  ["Aiden White", "Weddington", "2027"],
  ["Jake Amiott", "Topsail", "2028"],
  ["Gavin Yow", "A.L. Brown", "2026"],
  ["Sam Harper", "South Iredell", "2026"],
  ["Brieon Mayfield", "Jack Britt", "2027"],
  ["Amanuel Kahsai", "New Bern", "2028"],
  ["Deyari El-Amin", "Hillside", "2026"],
  ["Andrew Davis", "Davie", "2026"],
  ["Aaron Ellison", "Lumberton", "2028"],
  ["Jacob Perry", "New Bern", "2028"],
  ["Aidan Gore", "Garner", "2027"],
  ["Jacob McCord", "Grimsley", "2027"],
  ["Elliott Gould", "Davie", "2026"],
  ["Carson Worrick", "Davie", "2027"],
  ["Ryan Thompson", "Cardinal Gibbons", "2028"],
  ["John Bane", "New Bern", "2027"],
  ["Elijah Oakley", "Piedmont", "2026"],
  ["Hayden Smith", "White Oak", "2028"],
  ["Jacob De La Torre", "Union Pines", "2028"],
  ["Stephen Cross", "Surry Central", "2028"],
  ["Jacob Reigel", "Uwharrie Charter", "2026"],
  ["Christian Riddick", "Mount Pleasant", "2028"],
  ["Adrian Feliciano", "Hoke", "2028"],
]

function norm(s: string) {
  return (s || "").trim().replace(/\s+/g, " ").toLowerCase()
}

/** Normalize school for matching: strip punctuation, "high school", "hs", etc. so "A.L. Brown" matches "AL Brown" or "A. L. Brown HS". */
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
  const first = (row.firstname ?? row.firstName ?? row.first_name) as string | undefined
  const last = (row.lastname ?? row.lastName ?? row.last_name) as string | undefined
  return [first, last].filter(Boolean).join(" ").trim() || ""
}

function key(name: string, school: string, year: string) {
  return `${name}|${school}|${year}`
}

/** Resolve article (name, school, year) to athlete IDs. One Supabase query; returns map for direct /view-profile?id= links. */
export async function getArticle2ProfileIdMap(): Promise<Record<string, string>> {
  const supabase = createAdminClient()
  const { data: athletes, error } = await supabase
    .from("athletes")
    .select("id, name, firstname, lastname, firstName, lastName, highschool, high_school, graduationyear, graduation_year")
    .in("graduationyear", [2026, 2027, 2028])

  const map: Record<string, string> = {}
  if (error || !athletes?.length) return map

  for (const [name, school, year] of ARTICLE_2_PROFILE_KEYS) {
    const wantName = norm(name)
    const wantSchoolNorm = normSchool(school)
    const match = athletes.find((a) => {
      const row = a as Record<string, unknown>
      const full = getFullName(row)
      const gy = String((row.graduationyear as number) ?? (row.graduation_year as string) ?? "")
      if (gy !== year) return false
      if (norm(full) !== wantName) return false
      if (!wantSchoolNorm) return true
      const hs = normSchool((row.highschool as string) || (row.high_school as string) || "")
      return hs === wantSchoolNorm || hs.includes(wantSchoolNorm) || wantSchoolNorm.includes(hs)
    })
    if (match) map[key(name, school, year)] = (match as Record<string, unknown>).id as string
  }
  return map
}
