import type { SupabaseClient } from "@supabase/supabase-js"

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

/**
 * Find an existing athlete with the same name and graduation year (and optionally school).
 * Used before creating a new profile so we link to the existing one instead of creating a duplicate.
 */
export async function findExistingAthlete(
  supabase: SupabaseClient,
  options: { name: string; graduationYear: number; school?: string }
): Promise<{ id: string; name: string } | null> {
  const { name, graduationYear, school } = options
  const wantName = normalize(name)
  const wantSchool = school ? normalize(school) : ""

  const { data: rows, error } = await supabase
    .from("athletes")
    .select("id, name, firstname, lastname, firstName, lastName, highschool")
    .in("graduationyear", [graduationYear, String(graduationYear)])

  if (error || !rows?.length) return null

  for (const row of rows as Record<string, unknown>[]) {
    const full = getFullName(row)
    if (normalize(full) !== wantName) continue
    if (wantSchool) {
      const hs = normalize((row.highschool as string) || "")
      if (hs && hs !== wantSchool && !hs.includes(wantSchool) && !wantSchool.includes(hs)) continue
    }
    return { id: row.id as string, name: full || (row.name as string) }
  }
  return null
}

/**
 * Find an athlete by contact email. Used to enrich profile when we get
 * customer/registrant data from orders, drop-in, tournament signup, etc.
 */
export async function findAthleteByEmail(
  supabase: SupabaseClient,
  email: string
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
