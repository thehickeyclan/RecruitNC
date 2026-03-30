import type { SupabaseClient } from "@supabase/supabase-js"
import { parseFirstLastForNchsaa } from "@/lib/nchsaa-profile-fetch"

function escapeForIlike(s: string): string {
  return (s ?? "").replace(/'/g, "''")
}

function weightDigits(s: string): string {
  return (s ?? "").replace(/\D/g, "")
}

/**
 * For NHSCA bracket rows (e.g. "T. Hall", "B. Sly"), try to find the canonical
 * `wrestler_name` in `wrestling_nchsaa_results` for the same season year, weight,
 * and optional school. NC athletes who qualify for NHSCA almost always have state rows.
 *
 * Returns null if ambiguous or not found.
 */
export async function resolveCanonicalNameFromNchsaa(
  supabase: SupabaseClient,
  input: {
    tournamentYear: number
    weightClass: string
    highSchool: string | null | undefined
    bracketAthleteName: string
  },
): Promise<string | null> {
  const raw = (input.bracketAthleteName ?? "").trim()
  if (!raw) return null

  const parsed = parseFirstLastForNchsaa(raw)
  const lastToken = parsed?.last ?? raw.split(/\s+/).filter(Boolean).pop() ?? ""
  if (lastToken.replace(/\./g, "").length < 2) return null

  const pLast = `%${escapeForIlike(lastToken)}%`
  const targetW = weightDigits(input.weightClass)
  if (!targetW) return null

  const { data, error } = await supabase
    .from("wrestling_nchsaa_results")
    .select("wrestler_name, weight_class, school, year")
    .eq("year", input.tournamentYear)
    .ilike("wrestler_name", pLast)
    .limit(120)

  if (error || !data?.length) return null

  let rows = data.filter((row) => weightDigits(String(row.weight_class ?? "")) === targetW)

  const school = input.highSchool?.trim()
  if (school) {
    const schoolLower = school.toLowerCase()
    const withSchool = rows.filter((row) =>
      (row.school ?? "").toString().toLowerCase().includes(schoolLower),
    )
    if (withSchool.length > 0) {
      rows = withSchool
    }
  }

  if (rows.length === 0) return null

  const names = [...new Set(rows.map((r) => (r.wrestler_name ?? "").toString().trim()).filter(Boolean))]
  if (names.length === 1) return names[0]!
  return null
}
