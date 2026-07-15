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

export function formatCrossStoreAthleteMarkdown(displayName: string, data: CrossStorePayload): string {
  const name = displayName.trim() || String(data.searched_for ?? "this athlete").trim()
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
  if (schools.length === 1) {
    lines.push(`- High School: ${schools[0]}`)
  } else if (schools.length > 1) {
    lines.push(`- High schools seen in results: ${schools.slice(0, 4).join(", ")}`)
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
      lines.push(`- ${yr}: ${placeLabel(r.place)}${bits ? ` (${bits})` : ""}`)
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
      (data.nc_united_results?.length ?? 0) >
    0
  )
}
