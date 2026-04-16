import { RECRUITNC_APP_URL } from "@/lib/athlete-profile-links"

/**
 * Coerce NHSCA placement from API/DB/JSON rows (handles "2", "2nd", alternate keys).
 * Returns 1–16 when unambiguous; null if unknown.
 */
export function normalizeNhscaPlacementFromRow(row: any): number | null {
  if (!row || typeof row !== "object") return null

  const tryVal = (v: unknown): number | null => {
    if (v == null || v === "") return null
    if (typeof v === "number" && Number.isFinite(v)) {
      const n = Math.floor(v)
      return n >= 1 && n <= 16 ? n : null
    }
    const s = String(v).trim().toLowerCase()
    const m = s.match(/^(\d+)/)
    if (m) {
      const n = parseInt(m[1], 10)
      return n >= 1 && n <= 16 ? n : null
    }
    return null
  }

  const keys = [
    "placement",
    "place",
    "final_placement",
    "finalPlace",
    "placement_rank",
    "placementRank",
    "finish",
    "rank",
    "nhsca_placement",
    "placing",
  ]
  for (const k of keys) {
    const n = tryVal((row as any)[k])
    if (n != null) return n
  }

  const detail = (row as any).placement_detail
  if (detail && typeof detail === "object") {
    for (const k of keys) {
      const n = tryVal(detail[k])
      if (n != null) return n
    }
  }

  return null
}

function normNhscaWeight(w: unknown): string {
  return String(w ?? "")
    .replace(/lbs?$/i, "")
    .trim()
}

function normNhscaDivision(d: unknown): string {
  return String(d ?? "")
    .toLowerCase()
    .trim()
}

/**
 * When RecruitNC API returns NHSCA rows with record but no placement, fill placement from
 * nhsca_placements / wrestling_nhsca_results (same athlete, matched by year + division + weight).
 */
export function enrichNhscaApiRowsWithTablePlacements(
  apiRows: any[],
  placementsRows: any[],
  resultsRows: any[]
): any[] {
  if (!apiRows?.length) return apiRows
  const tables = [...(placementsRows || []), ...(resultsRows || [])]

  const tablePlacementForYear = (year: number): number | null => {
    const forYear = tables.filter((t: any) => t.year === year)
    const withP = forYear
      .map((t: any) => ({ t, p: normalizeNhscaPlacementFromRow(t) }))
      .filter((x) => x.p != null) as { t: any; p: number }[]
    if (withP.length === 1) return withP[0].p
    return null
  }

  return apiRows.map((row) => {
    if (normalizeNhscaPlacementFromRow(row) != null) return row
    const y = row.year
    if (y == null) return row
    const div = normNhscaDivision(row.division)
    const wStr = normNhscaWeight(row.weight ?? row.weight_class)

    const scoreMatch = (t: any): number => {
      if (t.year !== y) return -1
      const td = normNhscaDivision(t.division)
      const tw = normNhscaWeight(t.weight_class ?? t.weight)
      let score = 0
      if (div && td) {
        if (div === td) score += 3
        else return -1
      }
      if (wStr && tw) {
        const na = parseInt(wStr, 10)
        const nb = parseInt(tw, 10)
        if (Number.isFinite(na) && Number.isFinite(nb)) {
          if (na === nb) score += 3
          else if (Math.abs(na - nb) <= 6) score += 2
          else return -1
        } else if (wStr === tw) score += 3
        else return -1
      }
      return score
    }

    let best: { t: any; score: number } | null = null
    for (const t of tables) {
      const s = scoreMatch(t)
      if (s < 0) continue
      const p = normalizeNhscaPlacementFromRow(t)
      if (p == null) continue
      if (!best || s > best.score) best = { t, score: s }
    }

    let p = best ? normalizeNhscaPlacementFromRow(best.t) : null
    if (p == null) p = tablePlacementForYear(y)

    if (p == null && div) {
      const divMatches = tables.filter(
        (t: any) =>
          t.year === y && normNhscaDivision(t.division) === div && normalizeNhscaPlacementFromRow(t) != null
      )
      if (divMatches.length === 1) {
        p = normalizeNhscaPlacementFromRow(divMatches[0])
      }
    }

    if (p == null) return row
    return {
      ...row,
      placement: p,
      _placementFilledFromTable: true,
    }
  })
}

export type RecruitNcWrestlingAchievementsParams = {
  athleteId?: string
  name?: string
  graduationYear?: number
  wrestlingName?: string
}

function baseUrl(): string {
  const fromEnv = typeof process !== "undefined" && process.env?.RECRUITNC_APP_URL
  return (fromEnv || RECRUITNC_APP_URL).replace(/\/$/, "")
}

/**
 * Fetches merged NHSCA (tables + profile JSON) from RecruitNC's deployed API.
 * LegacyNC must call the RecruitNC host so server-side merge runs (not Supabase-only).
 */
export async function fetchRecruitNcWrestlingAchievements(
  params: RecruitNcWrestlingAchievementsParams
): Promise<{ nhsca: any[]; raw?: unknown } | null> {
  if (params.athleteId) {
    // preferred
  } else if (params.name?.trim() && params.graduationYear != null) {
    // name + graduation year resolution on RecruitNC
  } else {
    return null
  }

  const url = new URL(`${baseUrl()}/api/wrestling-achievements`)
  if (params.athleteId) {
    url.searchParams.set("athlete_id", params.athleteId)
  } else {
    url.searchParams.set("name", params.name!.trim())
    url.searchParams.set("graduation_year", String(params.graduationYear))
  }
  if (params.wrestlingName?.trim()) {
    url.searchParams.set("wrestling_name", params.wrestlingName.trim())
  }

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    if (!res.ok) {
      console.warn(
        "[RecruitNC] /api/wrestling-achievements failed:",
        res.status,
        url.pathname + url.search
      )
      return null
    }
    const json = (await res.json()) as Record<string, unknown>
    const achievements = json?.achievements as Record<string, unknown> | undefined
    const allResults = achievements?.all_results as Record<string, unknown> | undefined
    const nhsca =
      (allResults?.nhsca as unknown[]) ??
      (json?.all_results as Record<string, unknown> | undefined)?.nhsca ??
      []
    if (!Array.isArray(nhsca)) {
      return { nhsca: [], raw: json }
    }
    return { nhsca, raw: json }
  } catch (e) {
    console.warn("[RecruitNC] /api/wrestling-achievements error:", e)
    return null
  }
}

/**
 * Map API `achievements.all_results.nhsca` entries to the shape Data Dawg uses for NHSCA Nationals lines.
 */
export function mapRecruitNcNhscaToRows(
  nhsca: any[],
  fallbackAthleteName?: string,
  fallbackSchool?: string
): any[] {
  return (nhsca || []).map((result: any) => {
    const weightRaw = result.weight ?? result.weight_class ?? ""
    const normalizedWeight = String(weightRaw).replace(/lbs?$/i, "").trim()
    const placementNum = normalizeNhscaPlacementFromRow(result)
    const record =
      result.record ??
      (result.wins != null && result.losses != null
        ? `${result.wins}-${result.losses}`
        : null)
    return {
      athlete_name:
        result.athlete_name ?? result.name ?? fallbackAthleteName ?? "Unknown",
      placement: placementNum,
      year: result.year,
      division: result.division,
      weight: normalizedWeight,
      weight_class: normalizedWeight,
      high_school: result.high_school ?? result.highschool ?? fallbackSchool,
      record,
      notes: result.notes,
      source: "recruitnc_wrestling_achievements",
    }
  })
}
