import type { SupabaseClient } from "@supabase/supabase-js"

/** Directory list columns only — omit bio and other large fields. */
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
  prospect_ranking,
  rankings,
  recruiting_status,
  academic_gpa,
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

const KNOWN_NON_NC_STATES = new Set([
  "sc",
  "south carolina",
  "ga",
  "georgia",
  "va",
  "virginia",
  "tn",
  "tennessee",
  "fl",
  "florida",
  "oh",
  "ohio",
  "pa",
  "pennsylvania",
  "ny",
  "new york",
  "tx",
  "texas",
  "ca",
  "california",
  "al",
  "alabama",
])

const NON_NC_LOCATION_SUBSTRINGS = [
  "south carolina",
  "georgia",
  "virginia",
  "tennessee",
  "florida",
  "ohio",
  "pennsylvania",
  "new york",
  "texas",
  "california",
  "alabama",
] as const

/** Same rules as /prospects/all client filter. */
export function isNorthCarolinaProspect(prospect: { state?: unknown; location?: unknown }): boolean {
  const state = String(prospect.state ?? "").trim().toLowerCase()
  if (state) {
    if (state === "nc" || state === "north carolina") return true
    if (KNOWN_NON_NC_STATES.has(state)) return false
    return true
  }

  const location = String(prospect.location ?? "").trim().toLowerCase()
  if (location) {
    if (/\bnorth carolina\b/.test(location) || /\bnc\b/.test(location.replace(/[.,]/g, " "))) {
      return true
    }
    if (NON_NC_LOCATION_SUBSTRINGS.some((token) => location.includes(token))) {
      return false
    }
  }

  return true
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
    .order("prospect_ranking", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true })
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

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const normalized = (data ?? []).map((row) => normalizeProspectDirectoryRow(row as Record<string, unknown>))
  const ncOnly = normalized.filter(isNorthCarolinaProspect)

  return {
    prospects: ncOnly,
    hasMore: (data?.length ?? 0) >= limit,
  }
}

/** Fetch all pages for a year preset (used by SSR + client directory). */
export async function fetchProspectDirectoryAll(
  supabase: SupabaseClient,
  filters: Omit<ProspectDirectoryFilters, "offset" | "limit"> = {},
): Promise<ProspectDirectoryRow[]> {
  const PAGE = MAX_LIMIT
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
    if (offset > 20_000) break
  }

  return all
}

export function yearFilterToApiParams(yearFilter: string): {
  graduationYear?: string
  minYear?: number
  maxYear?: number
} {
  if (yearFilter === "active") return { minYear: 2026, maxYear: 2029 }
  if (yearFilter === "graduates") return { maxYear: 2025 }
  if (yearFilter !== "all") return { graduationYear: yearFilter }
  return {}
}
