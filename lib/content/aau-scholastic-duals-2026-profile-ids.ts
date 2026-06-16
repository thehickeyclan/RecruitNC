import { createAdminClient } from "@/lib/supabase/admin"
import { AAU_SCHOLASTIC_DUALS_2026_ROSTER } from "@/lib/aau-scholastic-duals-2026-roster"

export const AAU_SCHOLASTIC_DUALS_2026_NEWS_SLUG = "aau-scholastic-duals-2026-florida"

/** Roster display name → athlete id when nickname or duplicate rows need a fixed pin. */
export const AAU_SCHOLASTIC_DUALS_2026_PROFILE_OVERRIDES: Record<string, string> = {
  /** RecruitNC profile is Alexander Moody (Lumberton '27). */
  "Xan Moody": "b3534262-2c69-426d-903d-da76433e361f",
  /** Prefer Cardinal Gibbons '28 over orphan duplicate row. */
  "Luke Richards": "1a2d638e-5978-45d4-b6c8-bc95ba754367",
}

function normName(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase()
}

function getFullName(row: Record<string, unknown>): string {
  const name = (row.name as string)?.trim()
  if (name) return name
  return (row.wrestling_name as string)?.trim() || ""
}

function gradYearFromDob(dob: string): number | null {
  const parts = dob.trim().split("/")
  if (parts.length !== 3) return null
  const y = Number.parseInt(parts[2] ?? "", 10)
  if (!Number.isFinite(y) || y < 1990 || y > 2015) return null
  return y + 18
}

/** Resolve AAU roster wrestler names to athlete IDs for /view-profile links. */
export async function getAauScholasticDuals2026ProfileIdMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = { ...AAU_SCHOLASTIC_DUALS_2026_PROFILE_OVERRIDES }

  const admin = createAdminClient()
  const { data: athletes, error } = await admin
    .from("athletes")
    .select("id, name, wrestling_name, graduationyear, highschool")

  if (error || !athletes?.length) return map

  for (const row of AAU_SCHOLASTIC_DUALS_2026_ROSTER) {
    const displayName = row.wrestler.trim()
    if (!displayName || row.openSlot) continue
    if (map[displayName]) continue

    const wantName = normName(displayName)
    const wantGy = gradYearFromDob(row.dob)
    const candidates = athletes.filter((a) => normName(getFullName(a as Record<string, unknown>)) === wantName)

    let match =
      candidates.length === 1
        ? candidates[0]
        : wantGy != null
          ? candidates.find((a) => (a as { graduationyear?: number | null }).graduationyear === wantGy)
          : undefined

    if (!match && candidates.length === 1) match = candidates[0]

    if (match) {
      map[displayName] = String((match as { id: string }).id)
    }
  }

  return map
}

export function aauScholasticProfileHref(name: string, profileIdMap: Record<string, string>): string {
  const id = profileIdMap[name.trim()]
  if (id) return `/view-profile?id=${encodeURIComponent(id)}`
  const params = new URLSearchParams({ name: name.trim() })
  return `/unified-profile/by-name?${params.toString()}`
}
