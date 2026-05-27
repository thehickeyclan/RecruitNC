import type { SupabaseClient } from "@supabase/supabase-js"
import { getCollegesByIds } from "@/lib/colleges"
import { matchesDivisionFilter } from "@/lib/division-display"

export type CommitmentAthleteFilters = {
  year?: string | null
  gender?: string | null
  division?: string | null
  page?: number
  limit?: number
}

export type CommitmentAthleteListItem = {
  id: string
  name: string
  highschool: string
  college: string
  college_id: string | null
  division: string
  graduationyear: number
  photourl: string
  photoUrl: string
  photo_url: string
  image_url: string
  weightclass: string
  wrestlingclub: string
  club: string
  wrestlingClub: string
  achievements: string[]
  additional_achievements?: string[]
  team: string
  gender: string
  commitmentdate: string
  first_name: string
  last_name: string
  graduation_year: number
  weight_class: string
  high_school: string
  wrestling_club: string
  commitment_date: string
  nhsca_2023_record?: string
  nhsca_2023_placement?: string
  nhsca_2024_record?: string
  nhsca_2024_placement?: string
  nhsca_2025_record?: string
  nhsca_2025_placement?: string
  super_32_2023_record?: string
  super_32_2023_placement?: string
  super_32_2024_record?: string
  super_32_2024_placement?: string
  super_32_2025_record?: string
  super_32_2025_placement?: string
  prospect_ranking?: number
  commitmentPhotoUrl?: string
}

export type CommitmentStats = {
  total: number
  male: number
  female: number
  divisions: {
    D1: number
    D2: number
    D3: number
    NAIA: number
    NJCAA: number
  }
}

const ATHLETE_LIST_SELECT = `
  id, name, highschool, college, college_id,
  graduationyear, photourl, commitmentPhotoUrl,
  weightclass, wrestlingClub,
  achievements, additional_achievements,
  ncUnitedTeam, gender, commitmentdate,
  firstName, lastName,
  nhsca_2023_record, nhsca_2023_placement,
  nhsca_2024_record, nhsca_2024_placement,
  nhsca_2025_record, nhsca_2025_placement,
  super_32_2023_record, super_32_2023_placement,
  super_32_2024_record, super_32_2024_placement,
  super_32_2025_record, super_32_2025_placement,
  prospect_ranking
`

function bucketDivision(division: string | null | undefined): keyof CommitmentStats["divisions"] | null {
  const v = (division ?? "").toLowerCase()
  if (/\bdivision\s*i(?!i)\b|\bd1\b|\bdi\b/.test(v)) return "D1"
  if (/\bdivision\s*ii\b|\bd2\b|\bdii\b/.test(v)) return "D2"
  if (/\bdivision\s*iii\b|\bd3\b|\bdiii\b/.test(v)) return "D3"
  if (/\bnaia\b/.test(v)) return "NAIA"
  if (/\bnjcaa\b|\bjuco\b/.test(v)) return "NJCAA"
  return null
}

function buildFilteredAthletesQuery(
  supabase: SupabaseClient,
  filters: CommitmentAthleteFilters,
  select: string,
  withCount: boolean,
) {
  let query = supabase.from("athletes").select(select, withCount ? { count: "exact" } : undefined)
  query = query.not("college", "is", null).neq("college", "").or("is_prospect.is.null,is_prospect.eq.false")

  const yearFilter = filters.year
  if (yearFilter && yearFilter !== "all") {
    query = query.eq("graduationyear", Number.parseInt(yearFilter, 10))
  }

  const genderFilter = filters.gender
  if (genderFilter && genderFilter !== "all") {
    if (genderFilter === "male") {
      query = query.or("gender.ilike.male,gender.ilike.m,gender.ilike.men")
    } else if (genderFilter === "female") {
      query = query.or("gender.ilike.female,gender.ilike.f,gender.ilike.women")
    } else {
      query = query.ilike("gender", `%${genderFilter}%`)
    }
  }

  return query
}

function mapAthleteRow(athlete: Record<string, unknown>, collegesMap: Map<string, { division?: string; name?: string }>) {
  const photoUrl = String(athlete.commitmentPhotoUrl || athlete.photourl || "/wrestler-silhouette.png")
  const collegeRow = athlete.college_id ? collegesMap.get(String(athlete.college_id)) : null
  const collegeName = collegeRow?.name ?? String(athlete.college ?? "")
  const division = collegeRow?.division ?? ""
  return {
    id: String(athlete.id),
    name: String(athlete.name ?? ""),
    highschool: String(athlete.highschool || ""),
    college: collegeName,
    college_id: athlete.college_id != null ? String(athlete.college_id) : null,
    division,
    graduationyear: Number(athlete.graduationyear) || 0,
    photourl: photoUrl,
    photoUrl,
    photo_url: photoUrl,
    image_url: photoUrl,
    commitmentPhotoUrl: athlete.commitmentPhotoUrl ? String(athlete.commitmentPhotoUrl) : undefined,
    weightclass: String(athlete.weightclass || ""),
    wrestlingclub: String(athlete.wrestlingClub || ""),
    club: String(athlete.wrestlingClub || ""),
    wrestlingClub: String(athlete.wrestlingClub || ""),
    achievements: Array.isArray(athlete.achievements)
      ? (athlete.achievements as string[])
      : typeof athlete.achievements === "string"
        ? athlete.achievements
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean)
        : [],
    additional_achievements: Array.isArray(athlete.additional_achievements)
      ? (athlete.additional_achievements as string[])
      : typeof athlete.additional_achievements === "string"
        ? athlete.additional_achievements
            .split(/[\n,]+/)
            .map((a: string) => a.trim())
            .filter(Boolean)
        : undefined,
    team: String(athlete.ncUnitedTeam || ""),
    gender: String(athlete.gender || "male"),
    commitmentdate: String(athlete.commitmentdate || ""),
    first_name: String(athlete.firstName || ""),
    last_name: String(athlete.lastName || ""),
    graduation_year: Number(athlete.graduationyear) || 0,
    weight_class: String(athlete.weightclass || ""),
    high_school: String(athlete.highschool || ""),
    wrestling_club: String(athlete.wrestlingClub || ""),
    commitment_date: String(athlete.commitmentdate || ""),
    nhsca_2023_record: athlete.nhsca_2023_record != null ? String(athlete.nhsca_2023_record) : undefined,
    nhsca_2023_placement: athlete.nhsca_2023_placement != null ? String(athlete.nhsca_2023_placement) : undefined,
    nhsca_2024_record: athlete.nhsca_2024_record != null ? String(athlete.nhsca_2024_record) : undefined,
    nhsca_2024_placement: athlete.nhsca_2024_placement != null ? String(athlete.nhsca_2024_placement) : undefined,
    nhsca_2025_record: athlete.nhsca_2025_record != null ? String(athlete.nhsca_2025_record) : undefined,
    nhsca_2025_placement: athlete.nhsca_2025_placement != null ? String(athlete.nhsca_2025_placement) : undefined,
    super_32_2023_record: athlete.super_32_2023_record != null ? String(athlete.super_32_2023_record) : undefined,
    super_32_2023_placement: athlete.super_32_2023_placement != null ? String(athlete.super_32_2023_placement) : undefined,
    super_32_2024_record: athlete.super_32_2024_record != null ? String(athlete.super_32_2024_record) : undefined,
    super_32_2024_placement: athlete.super_32_2024_placement != null ? String(athlete.super_32_2024_placement) : undefined,
    super_32_2025_record: athlete.super_32_2025_record != null ? String(athlete.super_32_2025_record) : undefined,
    super_32_2025_placement: athlete.super_32_2025_placement != null ? String(athlete.super_32_2025_placement) : undefined,
    prospect_ranking:
      athlete.prospect_ranking != null && athlete.prospect_ranking !== ""
        ? Number(athlete.prospect_ranking)
        : undefined,
  } satisfies CommitmentAthleteListItem
}

async function enrichProspectRankings(
  supabase: SupabaseClient,
  athletes: CommitmentAthleteListItem[],
): Promise<void> {
  const withoutRank = athletes.filter((a) => a.prospect_ranking == null)
  if (withoutRank.length === 0) return

  try {
    const { data: pub } = await supabase
      .from("public_rankings")
      .select("prospect_id, graduation_year, prospect_ranking")
      .in(
        "prospect_id",
        withoutRank.map((a) => a.id),
      )
    const key = (id: string, year: number) => `${id}:${year}`
    const rankByKey = new Map(
      (pub || []).map((p: { prospect_id: string; graduation_year: number; prospect_ranking: number | null }) => [
        key(p.prospect_id, p.graduation_year),
        p.prospect_ranking,
      ]),
    )
    for (const a of athletes) {
      if (a.prospect_ranking == null && a.graduationyear != null) {
        const fromPub = rankByKey.get(key(a.id, a.graduationyear))
        if (fromPub != null) a.prospect_ranking = fromPub
      }
    }
  } catch {
    // table may not exist
  }
}

export async function fetchCommitmentAthletes(
  supabase: SupabaseClient,
  filters: CommitmentAthleteFilters = {},
): Promise<{ athletes: CommitmentAthleteListItem[]; total: number }> {
  const page = filters.page ?? 1
  const limit = Math.min(filters.limit ?? 100, 500)
  const offset = (page - 1) * limit
  const divisionFilter = filters.division

  let query = buildFilteredAthletesQuery(supabase, filters, ATHLETE_LIST_SELECT, true)

  const { data, error, count } = await query
    .order("commitmentdate", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to fetch athletes")
  }

  const collegeIds = [...new Set((data as Record<string, unknown>[]).map((a) => a.college_id).filter(Boolean))] as string[]
  const collegesMap = collegeIds.length > 0 ? await getCollegesByIds(supabase, collegeIds) : new Map()

  let athletes = (data as Record<string, unknown>[]).map((row) => mapAthleteRow(row, collegesMap))

  if (divisionFilter && divisionFilter !== "all") {
    athletes = athletes.filter((a) => matchesDivisionFilter(a.division, divisionFilter))
  }

  await enrichProspectRankings(supabase, athletes)

  return { athletes, total: count ?? athletes.length }
}

export async function fetchCommitmentStats(
  supabase: SupabaseClient,
  filters: CommitmentAthleteFilters = {},
): Promise<CommitmentStats> {
  const query = buildFilteredAthletesQuery(supabase, filters, "id, college_id, graduationyear, gender", false)

  const { data: rows, error } = await query
  if (error) throw new Error(error.message)

  const divisionFilter = filters.division
  const collegeIds = [...new Set((rows ?? []).map((r) => r.college_id).filter(Boolean))] as string[]
  const collegesMap = collegeIds.length > 0 ? await getCollegesByIds(supabase, collegeIds) : new Map()

  let filteredRows = rows ?? []
  if (divisionFilter && divisionFilter !== "all") {
    filteredRows = filteredRows.filter((r) => {
      const division = r.college_id ? collegesMap.get(r.college_id)?.division : null
      return matchesDivisionFilter(division, divisionFilter)
    })
  }

  const stats: CommitmentStats = {
    total: filteredRows.length,
    male: 0,
    female: 0,
    divisions: { D1: 0, D2: 0, D3: 0, NAIA: 0, NJCAA: 0 },
  }

  for (const r of filteredRows) {
    const g = (r.gender ?? "").toLowerCase()
    if (g === "female") stats.female++
    else stats.male++

    const division = r.college_id ? collegesMap.get(r.college_id)?.division : null
    const bucket = bucketDivision(division)
    if (bucket) stats.divisions[bucket]++
  }

  return stats
}

export function commitmentFiltersKey(filters: CommitmentAthleteFilters): string {
  return `${filters.year ?? "all"}|${filters.gender ?? "all"}|${filters.division ?? "all"}`
}
