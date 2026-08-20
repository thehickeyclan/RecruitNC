import type { SupabaseClient } from "@supabase/supabase-js"
import {
  buildCollegeNameLookup,
  COLLEGE_LEADERBOARD_MIN_CLASS_YEAR,
  getAllColleges,
  getCollegesByIds,
  resolveAthleteCollegeDivision,
  resolveCollegeCommitGroup,
} from "@/lib/colleges"
import { getDivisionDisplayShort, matchesDivisionFilter } from "@/lib/division-display"

export type CollegeCommitFilters = {
  gender?: string
  year?: string
  division?: string
  /** Search box — matches athlete or college name */
  search?: string
  /**
   * College-only filter. `search` also matches athlete and high-school names, which makes
   * "NC State" ambiguous; this narrows to the committed college so an agent asking
   * "who committed to NC State" cannot pick up unrelated rows.
   */
  college?: string
  /** Limit expand to one leaderboard bucket (all spellings) */
  collegeNames?: string[]
  /** Stable bucket from resolveCollegeCommitGroup — preferred over name-only matching */
  groupKey?: string
}

const ATHLETE_SELECT =
  "id, name, highschool, college, college_id, gender, graduationyear, commitmentdate, weightclass, photourl, photo_url, headshot_url"

const ATHLETE_SELECT_FALLBACK =
  "id, name, highschool, college, college_id, gender, graduationyear, commitmentdate, weightclass, photourl"

export type CollegeCommitRow = {
  id: string
  name: string
  highschool: string
  college: string
  division: string
  gender: string
  graduationyear: number
  commitmentdate: string | null
  weightclass: string
  photourl: string | null
}

function applyBaseFilters(
  query: ReturnType<SupabaseClient["from"]>,
  filters: CollegeCommitFilters,
) {
  let q = query
    .not("college", "is", null)
    .not("highschool", "is", null)
    .neq("college", "")
    .neq("college", "Uncommitted")
    .neq("college", "TBD")
    .or("is_prospect.is.null,is_prospect.eq.false")

  const gender = filters.gender ?? "all"
  if (gender !== "all") {
    const genderValues =
      gender === "male"
        ? ["male", "Male", "m", "M", "men", "Men"]
        : gender === "female"
          ? ["female", "Female", "f", "F", "women", "Women"]
          : [gender]
    q = q.in("gender", genderValues)
  }

  const year = filters.year ?? "all"
  if (year !== "all") {
    q = q.eq("graduationyear", Number.parseInt(year, 10))
  } else {
    q = q.gte("graduationyear", COLLEGE_LEADERBOARD_MIN_CLASS_YEAR)
  }

  return q
}

export async function fetchCollegeCommits(
  supabase: SupabaseClient,
  filters: CollegeCommitFilters = {},
): Promise<CollegeCommitRow[]> {
  let query = applyBaseFilters(supabase.from("athletes").select(ATHLETE_SELECT), filters)

  let { data: rows, error } = await query.order("commitmentdate", { ascending: false })

  if (error && /column athletes\.(photo_url|headshot_url)/i.test(error.message)) {
    const fallback = applyBaseFilters(
      supabase.from("athletes").select(ATHLETE_SELECT_FALLBACK),
      filters,
    )
    const result = await fallback.order("commitmentdate", { ascending: false })
    rows = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  const allColleges = await getAllColleges(supabase)
  const collegesByName = buildCollegeNameLookup(allColleges)
  const collegeIds = [...new Set((rows ?? []).map((r) => r.college_id).filter(Boolean))] as string[]
  const collegesById = collegeIds.length > 0 ? await getCollegesByIds(supabase, collegeIds) : new Map()
  for (const c of allColleges) {
    if (!collegesById.has(c.id)) collegesById.set(c.id, c)
  }

  const divisionFilter = filters.division ?? "all"
  const search = filters.search?.trim().toLowerCase()
  const collegeFilter = filters.college?.trim().toLowerCase()
  const groupKeyFilter = filters.groupKey?.trim()

  const mapped: CollegeCommitRow[] = []

  for (const row of rows ?? []) {
    const divisionRaw = resolveAthleteCollegeDivision(row, collegesById, collegesByName)
    if (divisionFilter !== "all" && !matchesDivisionFilter(divisionRaw, divisionFilter)) continue

    const college = String(row.college ?? "").trim()
    if (groupKeyFilter) {
      const rowGroup = resolveCollegeCommitGroup(row, collegesById, collegesByName)
      if (rowGroup.groupKey !== groupKeyFilter) continue
    }

    if (collegeFilter && !college.toLowerCase().includes(collegeFilter)) continue

    const name = String(row.name ?? "")
    if (search) {
      const hay = `${name} ${college} ${row.highschool ?? ""}`.toLowerCase()
      if (!hay.includes(search)) continue
    }

    mapped.push({
      id: String(row.id),
      name,
      highschool: String(row.highschool ?? ""),
      college,
      division: getDivisionDisplayShort(divisionRaw) || divisionRaw || "",
      gender: String(row.gender ?? ""),
      graduationyear: Number(row.graduationyear) || 0,
      commitmentdate: row.commitmentdate ? String(row.commitmentdate) : null,
      weightclass: String(row.weightclass ?? ""),
      photourl: row.photourl ?? row.photo_url ?? row.headshot_url ?? null,
    })
  }

  return mapped
}
