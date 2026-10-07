import type { SupabaseClient } from "@supabase/supabase-js"
import {
  namesLikelySamePerson,
  pickBestAthleteCandidate,
  schoolsLikelySame,
} from "@/lib/athlete-name-match"

function normalize(s: string): string {
  return (s || "").trim().replace(/\s+/g, " ").toLowerCase()
}

function getFullName(row: Record<string, unknown>): string {
  const name = (row.name as string)?.trim()
  if (name) return name
  const first = (row.firstname ?? row.firstName ?? row.first_name) as string | undefined
  const last = (row.lastname ?? row.lastName ?? row.last_name) as string | undefined
  return [first, last].filter(Boolean).join(" ").trim() || ""
}

function parseGradYear(row: Record<string, unknown>): number | null {
  const raw = row.graduationyear ?? row.graduationYear
  if (raw == null || String(raw).trim() === "") return null
  const n = Number(raw)
  return Number.isFinite(n) ? Math.floor(n) : null
}

/**
 * Find an existing athlete with the same name and graduation year (and optionally school).
 * Uses fuzzy name matching (Max/Maxwell, Matt/Matthew) plus school overlap.
 */
export async function findExistingAthlete(
  supabase: SupabaseClient,
  options: {
    name: string
    graduationYear: number
    school?: string
    /**
     * Also offer a same-name profile with no class year on file. Only for callers that ask the
     * person "Is this you?" before linking (create-athlete) - an automatic caller would attach a
     * family to a namesake. 113 NC girls imported in October 2026 had no class year, so a check on
     * year alone let each of them make a second profile.
     */
    includeUnknownYear?: boolean
  },
): Promise<{ id: string; name: string } | null> {
  const found = await matchWithYear(supabase, options)
  if (found || !options.includeUnknownYear) return found
  return matchUnknownYear(supabase, options)
}

/** Same name, no class year on file, and - when a school was given - the same school or none. */
async function matchUnknownYear(
  supabase: SupabaseClient,
  options: { name: string; school?: string },
): Promise<{ id: string; name: string } | null> {
  const { data: rows, error } = await supabase
    .from("athletes")
    .select("id, name, firstName, lastName, highschool, graduationyear")
    .is("graduationyear", null)
  if (error) console.error("findExistingAthlete (unknown year):", error.message)
  if (error || !rows?.length) return null
  const wantSchool = options.school ? normalize(options.school) : ""
  const matches = (rows as Record<string, unknown>[]).filter((row) => {
    if (!namesLikelySamePerson(getFullName(row), options.name)) return false
    const hs = normalize((row.highschool as string) || "")
    return !wantSchool || !hs || schoolsLikelySame(wantSchool, hs)
  })
  // Two namesakes with no year: no way to tell which, so offer neither.
  if (matches.length !== 1) return null
  return { id: matches[0].id as string, name: getFullName(matches[0]) || (matches[0].name as string) }
}

async function matchWithYear(
  supabase: SupabaseClient,
  options: { name: string; graduationYear: number; school?: string },
): Promise<{ id: string; name: string } | null> {
  const { name, graduationYear, school } = options
  const wantSchool = school ? normalize(school) : ""

  const { data: rows, error } = await supabase
    .from("athletes")
    // Only columns that exist. Naming one that doesn't (firstname, graduationYear) makes PostgREST
    // refuse the whole query, and this check then answered "no match" for every athlete - every
    // create, Blue signup and profile submission made a fresh duplicate.
    .select("id, name, firstName, lastName, highschool, graduationyear")
    .eq("graduationyear", graduationYear)

  if (error) console.error("findExistingAthlete:", error.message)
  if (error || !rows?.length) return null

  const candidates = (rows as Record<string, unknown>[])
    .map((row) => ({
      row,
      full: getFullName(row),
      hs: (row.highschool as string) || "",
      gy: parseGradYear(row),
    }))
    .filter((c) => namesLikelySamePerson(c.full, name))

  if (!candidates.length) return null

  if (wantSchool) {
    const bySchool = candidates.filter((c) => {
      const hs = normalize(c.hs)
      if (!hs) return true
      return schoolsLikelySame(wantSchool, hs)
    })
    if (bySchool.length === 1) {
      const c = bySchool[0]
      return { id: c.row.id as string, name: c.full || (c.row.name as string) }
    }
  }

  const picked = pickBestAthleteCandidate(
    candidates.map((c) => c.row),
    { displayName: name, graduationYear, highSchool: school ?? null },
    (row) => ({
      name: getFullName(row),
      highSchool: (row.highschool as string) || null,
      graduationYear: parseGradYear(row),
    }),
  )
  if (picked) {
    const full = getFullName(picked)
    return { id: picked.id as string, name: full || (picked.name as string) }
  }

  if (candidates.length === 1) {
    const c = candidates[0]
    return { id: c.row.id as string, name: c.full || (c.row.name as string) }
  }

  return null
}

/**
 * Find an athlete by contact email. Used to enrich profile when we get
 * customer/registrant data from orders, drop-in, tournament signup, etc.
 */
export async function findAthleteByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<{ id: string; name: string } | null> {
  const raw = (email ?? "").trim().toLowerCase()
  if (!raw || !raw.includes("@")) return null
  const { data: rows, error } = await supabase
    .from("athletes")
    .select("id, name, firstName, lastName")
    .ilike("contactEmail", raw)
    .limit(1)
  if (error) console.error("findAthleteByEmail:", error.message)
  if (error || !rows?.length) return null
  const row = rows[0] as Record<string, unknown>
  const name = getFullName(row)
  return { id: row.id as string, name: name || (row.name as string) || "Athlete" }
}
