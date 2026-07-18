/**
 * Format cross-store historical hits into Data Dawg markdown (alumni without directory id).
 */

import {
  buildAthleteTimelineMarkdown,
  timelineInputFromCrossStore,
} from "@/lib/data-dawg-athlete-timeline"
import { formatFargoCareerAnswerLines, summarizeFargoCareer } from "@/lib/fargo-career"

type CrossStorePayload = {
  searched_for?: string
  nchsaa_state?: Record<string, unknown>[]
  nhsca_placements?: Record<string, unknown>[]
  nhsca_legacy_table?: Record<string, unknown>[]
  super32?: Record<string, unknown>[]
  fargo?: Record<string, unknown>[]
  nc_united_results?: Record<string, unknown>[]
  college_commits?: Record<string, unknown>[]
  total_hits?: number
}

function placeLabel(place: unknown): string {
  const p = Number(place)
  if (!Number.isFinite(p) || p <= 0) return String(place ?? "").trim() || "Competed"
  if (p === 1) return "1st place"
  if (p === 2) return "2nd place"
  if (p === 3) return "3rd place"
  return `${p}th place`
}

function schoolFrom(r: Record<string, unknown>): string {
  return String(r.school ?? r.high_school ?? "").trim()
}

function yearSortDesc(a: Record<string, unknown>, b: Record<string, unknown>) {
  return (Number(b.year) || 0) - (Number(a.year) || 0)
}

function uniqueSchools(rows: Record<string, unknown>[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    const s = schoolFrom(r)
    if (!s) continue
    const k = s.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(s)
  }
  return out
}

function countWord(value: number): string {
  if (value === 1) return "one-time"
  if (value === 2) return "two-time"
  if (value === 3) return "three-time"
  if (value === 4) return "four-time"
  return `${value}-time`
}

function bestHistoricalName(fallback: string, data: CrossStorePayload): string {
  const rows = [
    ...(data.nchsaa_state ?? []),
    ...(data.nhsca_placements ?? []),
    ...(data.nhsca_legacy_table ?? []),
    ...(data.super32 ?? []),
    ...(data.fargo ?? []),
    ...(data.college_commits ?? []),
  ]
  for (const row of rows) {
    const candidate = String(row.wrestler_name ?? row.athlete_name ?? "").trim()
    if (candidate) return candidate
  }
  return fallback.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function buildCrossStoreAthleteSummary(
  displayName: string,
  data: CrossStorePayload,
  schools = uniqueSchools([
    ...(data.nchsaa_state ?? []),
    ...(data.nhsca_placements ?? []),
    ...(data.nhsca_legacy_table ?? []),
    ...(data.super32 ?? []),
    ...(data.fargo ?? []),
  ]),
): string {
  const name = bestHistoricalName(displayName, data)
  const stateRows = data.nchsaa_state ?? []
  const titleYears = new Set(
    stateRows.filter((r) => Number(r.place) === 1 && r.year != null).map((r) => String(r.year)),
  )
  const statePlaceYears = new Set(
    stateRows
      .filter((r) => Number(r.place) >= 1 && Number(r.place) <= 6 && r.year != null)
      .map((r) => String(r.year)),
  )
  const nhsca = [...(data.nhsca_placements ?? []), ...(data.nhsca_legacy_table ?? [])]
  const nhscaChampYears = [...new Set(
    nhsca.filter((r) => Number(r.placement) === 1 && r.year != null).map((r) => Number(r.year)),
  )].sort((a, b) => a - b)
  const nhscaAaYears = new Set(
    nhsca
      .filter((r) => Number(r.placement) >= 1 && Number(r.placement) <= 8 && r.year != null)
      .map((r) => String(r.year)),
  )
  const super32Aa = (data.super32 ?? []).filter(
    (r) => Number(r.placement) >= 1 && Number(r.placement) <= 8,
  ).length
  const fargoAa = (data.fargo ?? []).filter(
    (r) => r.is_all_american === true || (Number(r.placement) >= 1 && Number(r.placement) <= 8),
  ).length

  const achievements: string[] = []
  if (titleYears.size > 0) achievements.push(`a ${countWord(titleYears.size)} NCHSAA state champion`)
  else if (statePlaceYears.size > 0) achievements.push(`a ${countWord(statePlaceYears.size)} NCHSAA state placer`)
  if (nhscaChampYears.length > 0) {
    achievements.push(`a ${nhscaChampYears.join(" and ")} NHSCA national champion`)
  } else if (nhscaAaYears.size > 0) {
    achievements.push(`a ${countWord(nhscaAaYears.size)} NHSCA All-American`)
  }
  if (super32Aa > 0) achievements.push(`a ${countWord(super32Aa)} Super 32 All-American`)
  if (fargoAa > 0) achievements.push(`a ${countWord(fargoAa)} Fargo All-American`)

  const schoolBit = schools.length === 1 ? ` from ${schools[0]}` : ""
  const first = achievements.length
    ? `${name} is ${achievements.join(", ").replace(/, ([^,]*)$/, " and $1")}${schoolBit}.`
    : `${name}'s RecruitNC history includes verified state and national tournament results${schoolBit}.`

  const commit = data.college_commits?.[0]
  if (!commit?.college) return first
  const college = String(commit.college).trim()
  const level = String(commit.level ?? "").trim()
  const grad = commit.graduation_year != null ? `Class of ${commit.graduation_year}` : "After high school"
  const levelBit = level && !college.toLowerCase().includes(level.toLowerCase()) ? ` (${level})` : ""
  return `${first} ${grad}, ${name} continued to ${college}${levelBit}.`
}

export function formatCrossStoreAthleteMarkdown(displayName: string, data: CrossStorePayload): string {
  const requestedName = displayName.trim() || String(data.searched_for ?? "this athlete").trim()
  const name = bestHistoricalName(requestedName, data)
  const lines: string[] = [`Here's what I found about ${name}:`, ""]

  const allRows = [
    ...(data.nchsaa_state ?? []),
    ...(data.nhsca_placements ?? []),
    ...(data.nhsca_legacy_table ?? []),
    ...(data.super32 ?? []),
    ...(data.fargo ?? []),
    ...(data.nc_united_results ?? []),
  ]
  const schools = uniqueSchools(allRows)
  lines.push(buildCrossStoreAthleteSummary(requestedName, data, schools))
  lines.push("")
  if (schools.length === 1) {
    lines.push(`- High School: ${schools[0]}`)
  } else if (schools.length > 1) {
    lines.push(`- High schools seen in results: ${schools.slice(0, 4).join(", ")}`)
  }

  const commit = data.college_commits?.[0]
  if (commit) {
    const college = String(commit.college ?? "").trim()
    const level = String(commit.level ?? "").trim()
    const gradYear = commit.graduation_year
    const levelBit = level && !college.toLowerCase().includes(level.toLowerCase()) ? ` (${level})` : ""
    if (college) lines.push(`- College: ${college}${levelBit}`)
    if (gradYear != null && String(gradYear).trim()) lines.push(`- Class of: ${gradYear}`)
  }

  const timelineMd = buildAthleteTimelineMarkdown(timelineInputFromCrossStore(data))
  if (timelineMd) {
    lines.push("")
    lines.push(timelineMd)
  }

  const nchsaa = [...(data.nchsaa_state ?? [])].sort(yearSortDesc)
  if (nchsaa.length) {
    lines.push("")
    lines.push("NCHSAA State Tournament Results:")
    for (const r of nchsaa.slice(0, 40)) {
      const yr = r.year ?? "—"
      const cl = String(r.classification ?? "").trim()
      const wt = String(r.weight_class ?? "").trim()
      const bits = [cl, wt].filter(Boolean).join(", ")
      const rawPlace = r.place
      const stateResult = rawPlace == null || Number(rawPlace) === 0 ? "State qualifier" : placeLabel(rawPlace)
      lines.push(`- ${yr}: ${stateResult}${bits ? ` (${bits})` : ""}`)
    }
  }

  const nhsca = [...(data.nhsca_placements ?? []), ...(data.nhsca_legacy_table ?? [])].sort(yearSortDesc)
  if (nhsca.length) {
    lines.push("")
    lines.push("NHSCA National Results:")
    for (const r of nhsca.slice(0, 40)) {
      const yr = r.year ?? "—"
      const place = r.placement != null ? placeLabel(r.placement) : "Competed"
      const div = String(r.division ?? "").trim()
      const wt = String(r.weight_class ?? r.weight ?? "").trim()
      const rec = String(r.record ?? "").trim()
      const bits = [div, wt, rec].filter(Boolean).join(", ")
      lines.push(`- ${yr}: ${place}${bits ? ` (${bits})` : ""}`)
    }
  }

  const s32 = [...(data.super32 ?? [])].sort(yearSortDesc)
  if (s32.length) {
    lines.push("")
    lines.push("Super32 Results:")
    for (const r of s32.slice(0, 30)) {
      const yr = r.year ?? "—"
      const place = r.placement != null ? placeLabel(r.placement) : "Competed"
      const wt = String(r.weight_class ?? "").trim()
      const rec = String(r.record ?? "").trim()
      const bits = [wt, rec].filter(Boolean).join(", ")
      lines.push(`- ${yr}: ${place}${bits ? ` (${bits})` : ""}`)
    }
  }

  const fargo = [...(data.fargo ?? [])].sort(yearSortDesc)
  if (fargo.length) {
    lines.push("")
    lines.push("Fargo Nationals Results:")
    const career = summarizeFargoCareer(
      fargo.map((r) => ({
        year: Number(r.year) || null,
        style: r.style != null ? String(r.style) : null,
        division: r.division != null ? String(r.division) : null,
        is_all_american: Boolean(r.is_all_american),
        placement: r.placement != null ? Number(r.placement) : null,
        wins: r.wins != null ? Number(r.wins) : null,
        losses: r.losses != null ? Number(r.losses) : null,
      })),
    )
    for (const line of formatFargoCareerAnswerLines(name, career)) {
      lines.push(line)
    }
    for (const r of fargo.slice(0, 30)) {
      const yr = r.year ?? "—"
      const style = String(r.style ?? "").trim()
      const div = String(r.division ?? "").trim()
      const wt = String(r.weight_class ?? "").trim()
      const rec = String(r.record ?? "").trim()
      const bits = [style || null, div, wt, rec].filter(Boolean).join(", ")
      lines.push(`- ${yr}: ${bits || "Competed"}`)
    }
  }

  const ncu = [...(data.nc_united_results ?? [])].sort(yearSortDesc)
  if (ncu.length) {
    lines.push("")
    lines.push("NC United National Team Results:")
    for (const r of ncu.slice(0, 30)) {
      const yr = r.year ?? "—"
      const event = String(r.event ?? r.event_name ?? "NC United").trim()
      const rec = String(r.record ?? "").trim()
      const wt = String(r.weight ?? r.weight_class ?? "").trim()
      const bits = [event, wt, rec].filter(Boolean).join(" · ")
      lines.push(`- ${yr}: ${bits}`)
    }
  }

  if (lines.length <= 2) {
    return `I couldn't find tournament records for **${name}**. Try a school name with the query, or check the spelling.`
  }

  return lines.join("\n")
}

export function crossStoreHasUsefulHits(data: CrossStorePayload): boolean {
  const n = Number(data.total_hits)
  if (Number.isFinite(n) && n > 0) return true
  return (
    (data.nchsaa_state?.length ?? 0) +
      (data.nhsca_placements?.length ?? 0) +
      (data.nhsca_legacy_table?.length ?? 0) +
      (data.super32?.length ?? 0) +
      (data.fargo?.length ?? 0) +
      (data.nc_united_results?.length ?? 0) +
      (data.college_commits?.length ?? 0) >
    0
  )
}
