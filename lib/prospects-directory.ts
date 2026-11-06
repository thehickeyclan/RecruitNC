import type { SupabaseClient } from "@supabase/supabase-js"
import { currentClassYears, mostRecentGraduatedClassYear } from "@/lib/class-years"
import { HOME_STATE, inStates, normalizeStateCode } from "@/lib/recruiting/states"

/**
 * Directory list columns only — omit bio and other large fields.
 *
 * No `prospect_ranking` and no `rankings`: these rows are public and cached. The rank reaches an
 * entitled viewer through /api/prospects/ranks, and nobody else at all. For the same reason the
 * rows are ordered by name - ordering by rank publishes the board without printing a number.
 */
export const PROSPECT_LIST_COLUMNS = `
  id,
  name,
  firstName,
  lastName,
  graduationyear,
  gender,
  weightclass,
  weight,
  highschool,
  state,
  location,
  wrestlingClub,
  wrestling_name,
  college,
  college_id,
  photourl,
  achievements,
  recruiting_status,
  nationally_ranked_wins,
  nhsca_results,
  nhsca_2026_record,
  nhsca_2026_placement,
  nhsca_2024_record,
  nhsca_2024_placement,
  nhsca_2025_record,
  nhsca_2025_placement,
  nhsca_2023_record,
  nhsca_2023_placement,
  super_32_2024_record,
  super_32_2024_placement,
  super_32_2025_record,
  super_32_2025_placement,
  super_32_2023_record,
  super_32_2023_placement
`

export type ProspectDirectoryRow = Record<string, unknown> & {
  id: string
  name: string
  nhsca_results?: Array<{ year?: number; placement?: unknown; record?: unknown; weight?: unknown; division?: unknown; text?: string }>
  nhsca_record_display?: string | null
}

export type ProspectDirectoryFilters = {
  /** Two-letter state; North Carolina when absent. */
  state?: string | null
  /**
   * North Carolina plus these states, in one list (RecruitWrestlers' "All states", Matt, 29 Oct
   * 2026: "should show all kids 2027-2030"). Overrides `state`.
   */
  withStates?: string[] | null
  /**
   * With `withStates`: also every claimed profile from a state not open yet. A family that claims
   * a profile has put him on the platform; NY's first claim was invisible to every coach because
   * New York had not launched (Kade Mustin, 3 November 2026). RecruitWrestlers only.
   */
  withClaimedElsewhere?: boolean
  /**
   * A name search across every state, ignoring `state` and `withStates`: RecruitWrestlers' search
   * box finds a wrestler in any state, not just the ones loaded (Matt, 3 Nov 2026).
   */
  nameAnyState?: string | null
  graduationYear?: string | null
  minYear?: number | null
  maxYear?: number | null
  gender?: string | null
  limit?: number
  offset?: number
}

const MAX_LIMIT = 500

function parsePlacement(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const digits = value.match(/\d+/)
    if (digits) return Number.parseInt(digits[0], 10)
  }
  return null
}

/** Fast NHSCA display from row JSON + legacy columns — no per-athlete table merge. */
export function nhscaResultsFromProspectRow(p: Record<string, unknown>) {
  const raw = p.nhsca_results
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((entry) => {
      const row = entry as Record<string, unknown>
      const year = Number(row.year) || 0
      const placement = row.placement ?? row.place
      const record = row.record != null ? String(row.record) : undefined
      return {
        year,
        placement,
        record,
        weight: row.weight,
        division: row.division,
        text: `${year} ${[placement, record].filter(Boolean).join(" ").trim()}`.trim(),
      }
    })
  }

  const legacy: Array<{ year: number; placement?: unknown; record?: unknown }> = [
    { year: 2026, placement: p.nhsca_2026_placement, record: p.nhsca_2026_record },
    { year: 2025, placement: p.nhsca_2025_placement, record: p.nhsca_2025_record },
    { year: 2024, placement: p.nhsca_2024_placement, record: p.nhsca_2024_record },
    { year: 2023, placement: p.nhsca_2023_placement, record: p.nhsca_2023_record },
  ]

  return legacy
    .filter((e) => e.placement || e.record)
    .map((e) => ({
      year: e.year,
      placement: e.placement,
      record: e.record != null ? String(e.record) : undefined,
      text: `${e.year} ${[e.placement, e.record].filter(Boolean).join(" ").trim()}`.trim(),
    }))
}

export function normalizeProspectDirectoryRow(p: Record<string, unknown>): ProspectDirectoryRow {
  const displayName =
    (p.name as string) || [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Unknown"
  const nhsca_results = nhscaResultsFromProspectRow(p)
  const nhsca_record_display =
    nhsca_results.length > 0
      ? nhsca_results
          .map(
            (r) =>
              `${r.year}: ${r.placement || "—"}${r.record ? ` (${r.record})` : ""}${r.division ? ` • ${r.division}` : ""}`,
          )
          .join("; ")
      : null

  return {
    ...p,
    id: String(p.id ?? ""),
    name: displayName,
    nhsca_results,
    nhsca_record_display,
  }
}

/** PostgREST: a claimed profile outside North Carolina (the live states are already in the list). */
const CLAIMED_ELSEWHERE_FILTER = "and(is_nc_athlete.eq.false,claimed_at.not.is.null)"

/**
 * The cache slice for claimed profiles in states not open yet: `claimedElsewhereSlice(["NC","SC"])`
 * is "CLAIMED:NC,SC", the live states it leaves out.
 */
export const claimedElsewhereSlice = (liveCodes: readonly string[]) => `CLAIMED:${[...liveCodes].sort().join(",")}`

function claimedElsewhereStates(state: string | null | undefined): string[] | null {
  const m = String(state ?? "").match(/^CLAIMED:([A-Z,]*)$/)
  return m ? m[1]!.split(",").filter(Boolean) : null
}

function claimedElsewhere<Q>(query: Q, liveCodes: string[]): Q {
  const q = (query as unknown as { eq: (c: string, v: unknown) => unknown }).eq("is_nc_athlete", false) as {
    not: (c: string, op: string, v: unknown) => unknown
  }
  const claimed = q.not("claimed_at", "is", null) as { not: (c: string, op: string, v: unknown) => unknown }
  const others = liveCodes.filter((c) => c !== HOME_STATE)
  return (others.length ? claimed.not("state", "in", `(${others.join(",")})`) : claimed) as Q
}

export async function fetchProspectDirectoryPage(
  supabase: SupabaseClient,
  filters: ProspectDirectoryFilters = {},
): Promise<{ prospects: ProspectDirectoryRow[]; hasMore: boolean }> {
  const rawLimit = filters.limit ?? 500
  const limit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
  const offset = filters.offset ?? 0

  let query = supabase
    .from("athletes")
    .select(PROSPECT_LIST_COLUMNS)
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1)

  if (filters.graduationYear && filters.graduationYear !== "all") {
    query = query.eq("graduationyear", Number.parseInt(filters.graduationYear, 10))
  }
  if (filters.minYear != null && Number.isFinite(filters.minYear)) {
    query = query.gte("graduationyear", filters.minYear)
  }
  if (filters.maxYear != null && Number.isFinite(filters.maxYear)) {
    query = query.lte("graduationyear", filters.maxYear)
  }
  if (filters.gender && filters.gender !== "all") {
    query = query.eq(
      "gender",
      filters.gender === "male" ? "Male" : filters.gender === "female" ? "Female" : filters.gender,
    )
  }

  /*
   * Every state, North Carolina included, by the one state rule (lib/recruiting/states.ts), in the
   * query itself. North Carolina used to read every athlete and keep anyone whose state was not on a
   * short list of neighbours, so once placer profiles were minted in other states the NC list
   * carried 2,154 wrestlers from Louisiana, Maryland, Mississippi... (2 Nov 2026).
   */
  const others = (filters.withStates ?? []).map((c) => normalizeStateCode(c)).filter((c): c is string => Boolean(c) && c !== HOME_STATE)
  const claimedOutside = claimedElsewhereStates(filters.state)
  const nameTerm = String(filters.nameAnyState ?? "").replace(/[%_,()*\\]/g, " ").trim()
  if (nameTerm) {
    query = query.ilike("name", `%${nameTerm}%`)
  } else if (claimedOutside) {
    query = claimedElsewhere(query, claimedOutside)
  } else {
    const states = others.length ? [HOME_STATE, ...others] : [normalizeStateCode(filters.state) ?? HOME_STATE]
    query = inStates(query, states, filters.withClaimedElsewhere && others.length ? [CLAIMED_ELSEWHERE_FILTER] : [])
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const inList = (data ?? []).map((row) => normalizeProspectDirectoryRow(row as Record<string, unknown>))

  return {
    prospects: inList,
    hasMore: (data?.length ?? 0) >= limit,
  }
}

/** Fetch all pages for a year preset (used by SSR + client directory). */
export async function fetchProspectDirectoryAll(
  supabase: SupabaseClient,
  filters: Omit<ProspectDirectoryFilters, "offset" | "limit"> = {},
): Promise<ProspectDirectoryRow[]> {
  const PAGE = MAX_LIMIT
  const CAP = 20_000
  const all: ProspectDirectoryRow[] = []
  let offset = 0

  for (;;) {
    const { prospects, hasMore } = await fetchProspectDirectoryPage(supabase, {
      ...filters,
      limit: PAGE,
      offset,
    })
    all.push(...prospects)
    if (!hasMore) break
    offset += PAGE
    /*
     * The stop used to `break` here and return a short list that looked complete (6 November
     * 2026). Its one caller scopes to a single state and class year, a few hundred rows, so it
     * has never fired - but the signature defaults `filters` to {}, and an unscoped call would
     * quietly drop everyone past 20,000 against the 24,776 profiles we already hold. That is the
     * same silent ceiling the Southeast Open matcher hit at 1,000 rows, waiting at a bigger
     * number. A truncated directory must be noisy, never plausible.
     */
    if (offset > CAP) {
      throw new Error(
        `fetchProspectDirectoryAll stopped at ${CAP} rows with more to read (filters: ${JSON.stringify(filters)}). ` +
          "Scope it to a state and class year, or page it with fetchProspectDirectoryPage.",
      )
    }
  }

  return all
}

export function yearFilterToApiParams(yearFilter: string): {
  graduationYear?: string
  minYear?: number
  maxYear?: number
} {
  /** Derived, not typed — a graduated class must drop out of the filter on its own each summer. */
  const active = currentClassYears()
  if (yearFilter === "active") return { minYear: active[0], maxYear: active[active.length - 1] }
  if (yearFilter === "graduates") return { maxYear: mostRecentGraduatedClassYear() }
  if (yearFilter !== "all") return { graduationYear: yearFilter }
  return {}
}
