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

/** Get NC United team value from a row regardless of DB column name (camelCase vs snake_case). */
function getTeamValue(row: Record<string, unknown>): string {
  const keys = Object.keys(row)
  for (const k of keys) {
    const lower = k.toLowerCase().replace(/_/g, "")
    if (lower === "ncunitedteam" || lower === "team") {
      const val = row[k]
      if (val != null && String(val).trim() !== "") return String(val).trim()
    }
  }
  return ""
}

function isBlue(row: Record<string, unknown>) {
  const raw = getTeamValue(row)
  const v = raw.toLowerCase()
  return v === "blue" || v === "blue team" || v === "both" || v.includes("blue")
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

    let athleteIds: string[] = []
    if (!membershipError && membershipRows?.length) {
      athleteIds = [...new Set(membershipRows.map((r) => r.athlete_id).filter(Boolean))]
    }
    // Fallback: if no blue_memberships table or no rows, use legacy logic (athletes with ncUnitedTeam = blue)
    const useLegacy = athleteIds.length === 0

    let data: Record<string, unknown>[] | null = null
    let error: { message: string } | null = null

    if (useLegacy) {
      const result = await supabase
        .from("athletes")
        .select("*")
        .gte("graduationyear", CURRENT_ROSTER_MIN_GRAD_YEAR)
        .lte("graduationyear", CURRENT_YEAR + 6)
        .order("graduationyear", { ascending: true })
        .order("name", { ascending: true })
      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from("athletes")
        .select("*")
        .in("id", athleteIds)
        .gte("graduationyear", CURRENT_ROSTER_MIN_GRAD_YEAR)
        .lte("graduationyear", CURRENT_YEAR + 6)
        .order("graduationyear", { ascending: true })
        .order("name", { ascending: true })
      data = result.data
      error = result.error
    }

    if (error) {
      console.error("[blue-current-members] query error:", error)
      return []
    }

    const blueRows = useLegacy ? (data ?? []).filter((row) => isBlue(row as Record<string, unknown>)) : (data ?? [])
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
