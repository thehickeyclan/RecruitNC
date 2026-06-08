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
  options: { name: string; graduationYear: number; school?: string },
): Promise<{ id: string; name: string } | null> {
  const { name, graduationYear, school } = options
  const wantSchool = school ? normalize(school) : ""

  const { data: rows, error } = await supabase
    .from("athletes")
    .select("id, name, firstname, lastname, firstName, lastName, highschool, graduationyear, graduationYear")
    .in("graduationyear", [graduationYear, String(graduationYear)])

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
    .select("id, name, firstname, lastname, firstName, lastName")
    .ilike("contact_email", raw)
    .limit(1)
  if (error || !rows?.length) return null
  const row = rows[0] as Record<string, unknown>
  const name = getFullName(row)
  return { id: row.id as string, name: name || (row.name as string) || "Athlete" }
}
