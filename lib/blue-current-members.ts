import { createAdminClient } from "@/lib/supabase/admin"
import { getNCHSAAResults } from "@/lib/nchsaa-results"

const CURRENT_YEAR = new Date().getFullYear()
/** Current roster = still in high school: graduation year >= current year. Class of 2025 and older = alumni only. */
const CURRENT_ROSTER_MIN_GRAD_YEAR = CURRENT_YEAR

export type BlueCurrentMember = {
  id: string
  name: string
  graduationyear: number
  highschool: string
  weight: string
  accolades: string[]
}

function placementNumber(value: unknown): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function hasAllAmerican(athlete: Record<string, unknown>): boolean {
  const years = [2023, 2024, 2025] as const
  for (const y of years) {
    const nhsca = placementNumber(athlete[`nhsca_${y}_placement`] ?? athlete[`nhsca${y}Placement`])
    const super32 = placementNumber(athlete[`super_32_${y}_placement`] ?? athlete[`super32_${y}_placement`])
    if ((nhsca != null && nhsca >= 1 && nhsca <= 8) || (super32 != null && super32 >= 1 && super32 <= 8)) return true
  }
  return false
}

export async function getBlueCurrentMembers(): Promise<BlueCurrentMember[]> {
  try {
    const supabase = createAdminClient()

    // Roster = paid members only: athletes with an active blue_membership (status = 'active')
    const { data: membershipRows, error: membershipError } = await supabase
      .from("blue_memberships")
      .select("athlete_id")
      .eq("status", "active")

    const athleteIds: string[] =
      !membershipError && membershipRows?.length
        ? [...new Set(membershipRows.map((r) => r.athlete_id).filter(Boolean) as string[])]
        : []

    if (athleteIds.length === 0) {
      return []
    }

    const { data, error } = await supabase
      .from("athletes")
      .select("*")
      .in("id", athleteIds)
      .gte("graduationyear", CURRENT_ROSTER_MIN_GRAD_YEAR)
      .lte("graduationyear", CURRENT_YEAR + 6)
      .order("graduationyear", { ascending: true })
      .order("name", { ascending: true })

    if (error) {
      console.error("[blue-current-members] query error:", error)
      return []
    }

    const blueRows = data ?? []
    const members: BlueCurrentMember[] = []

    for (const row of blueRows) {
      const id = String(row.id ?? "")
      const name = String(row.name ?? "").trim() || [row.firstname, row.lastname].filter(Boolean).join(" ").trim()
      const highschool = String(row.highschool ?? row.high_school ?? "").trim()
      const weight = String(row.weightclass ?? "").trim() ? `${row.weightclass} lbs` : "—"

      const accolades: string[] = []
      if (hasAllAmerican(row as Record<string, unknown>)) accolades.push("All-American")
      const nchsaa = await getNCHSAAResults(supabase, name, Number(row.graduationyear) || 0)
      const hasStateChamp = nchsaa.some((r) => r.place === 1)
      const hasStatePlacer = nchsaa.some((r) => r.place >= 2 && r.place <= 6)
      if (hasStateChamp) accolades.push("State Champ")
      if (hasStatePlacer) accolades.push("Placer")

      members.push({
        id,
        name: name || "—",
        graduationyear: Number(row.graduationyear) || 0,
        highschool: highschool || "—",
        weight,
        accolades,
      })
    }

    return members
  } catch (e) {
    console.error("[blue-current-members] error:", e)
    return []
  }
}
