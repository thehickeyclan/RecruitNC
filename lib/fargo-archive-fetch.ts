import { createAdminClient } from "@/lib/supabase/admin"
import { batchLookupAthleteProfileLinks } from "@/lib/athlete-profile-links"
import {
  formatFargoDivisionLabel,
  formatFargoPlacementForDisplay,
  formatFargoRecord,
  parseFargoPlacement,
} from "@/lib/fargo-results"

export type FargoArchiveWrestler = {
  id: string
  athlete_name: string
  year: number
  division: string
  divisionShort: string
  weight_class: string
  wins: number
  losses: number
  record: string
  placement: string
  is_all_american: boolean
  high_school: string | null
  notes: string | null
  profileHref: string | null
}

function mapRow(
  row: Record<string, unknown>,
  profileMap: Map<string, string>,
): FargoArchiveWrestler {
  const name = String(row.athlete_name ?? "").trim()
  const placementNum = parseFargoPlacement(row.placement)
  const isAA = row.is_all_american === true || String(row.is_all_american).toLowerCase() === "true"
  const division = String(row.division ?? "").trim()
  const profileUrl = profileMap.get(name) ?? profileMap.get(name.toLowerCase()) ?? null
  return {
    id: String(row.id ?? `${name}-${row.year}-${row.weight_class}`),
    athlete_name: name,
    year: Number(row.year),
    division,
    divisionShort: formatFargoDivisionLabel(division),
    weight_class: String(row.weight_class ?? "").trim(),
    wins: Number(row.wins ?? 0),
    losses: Number(row.losses ?? 0),
    record: formatFargoRecord(row.wins, row.losses, row.record),
    placement: formatFargoPlacementForDisplay(placementNum, isAA),
    is_all_american: isAA,
    high_school: row.high_school ? String(row.high_school).trim() : null,
    notes: row.notes ? String(row.notes).trim() : null,
    profileHref: profileUrl ? profileUrl.replace(/^https?:\/\/[^/]+/, "") : null,
  }
}

function sortWrestlers(rows: FargoArchiveWrestler[]): FargoArchiveWrestler[] {
  return [...rows].sort((a, b) => {
    if (a.is_all_american !== b.is_all_american) return a.is_all_american ? -1 : 1
    const aPlace = parseFargoPlacement(a.placement) ?? 99
    const bPlace = parseFargoPlacement(b.placement) ?? 99
    if (aPlace !== bPlace) return aPlace - bPlace
    if (b.wins !== a.wins) return b.wins - a.wins
    return a.athlete_name.localeCompare(b.athlete_name)
  })
}

export async function fetchFargoResultsForYear(year: number): Promise<FargoArchiveWrestler[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("fargo_results")
    .select("*")
    .eq("year", year)
    .order("division")
    .order("weight_class")

  if (error) {
    console.error("[RecruitNC] fargo archive fetch failed:", error.message)
    return []
  }

  const names = (data ?? []).map((r) => String(r.athlete_name ?? "")).filter(Boolean)
  const profileMap = await batchLookupAthleteProfileLinks(names, admin)

  return sortWrestlers((data ?? []).map((row) => mapRow(row as Record<string, unknown>, profileMap)))
}

export function groupFargoByDivision(rows: FargoArchiveWrestler[]): {
  sixteenU: FargoArchiveWrestler[]
  junior: FargoArchiveWrestler[]
} {
  const sixteenU: FargoArchiveWrestler[] = []
  const junior: FargoArchiveWrestler[] = []
  for (const row of rows) {
    if (/16u/i.test(row.division)) sixteenU.push(row)
    else if (/junior/i.test(row.division)) junior.push(row)
  }
  return { sixteenU, junior }
}
