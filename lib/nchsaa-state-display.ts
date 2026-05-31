import type { NchsaaRowForProfile } from "@/lib/nchsaa-results-json"

/** Distinct calendar years with a state title (place = 1). Never count rows alone — same year can appear twice before dedupe. */
export function countDistinctStateTitleYears(
  rows: Array<{ year: number; place: number | null | undefined }> | undefined,
): number {
  const years = new Set(
    (rows ?? []).filter((r) => r.place === 1).map((r) => r.year),
  )
  return years.size
}

/**
 * Conservative multiplier badge — only 2–4×. Returns null when count is 0–1 or suspiciously high (namesake pollution).
 */
export function stateChampionBadgeLabel(titleYearCount: number): string | null {
  if (titleYearCount < 2 || titleYearCount > 4) return null
  return `${titleYearCount}× State Champion`
}

export type StateResultDisplay = {
  text: string
  placement: number | null
  year: number
}

export function nchsaaRowsToStateResults(rows: NchsaaRowForProfile[]): StateResultDisplay[] {
  const out = rows
    .filter((r) => r.place != null && r.place >= 1)
    .map((r) => {
      const { year: y, place, classification } = r
      const p = place as number
      if (p === 1) {
        return { text: `${y} ${classification || ""} State Champion`.trim(), placement: 1, year: y }
      }
      if (p <= 8) {
        const ordinal = p === 2 ? "2nd" : p === 3 ? "3rd" : `${p}th`
        return {
          text: `${y} ${classification || ""} State ${ordinal}`.trim(),
          placement: p,
          year: y,
        }
      }
      return {
        text: `${y} ${classification || ""} State Qualifier`.trim(),
        placement: null,
        year: y,
      }
    })
  out.sort((a, b) => b.year - a.year)
  return out
}

export function stateChampionshipSummaryFromRows(rows: NchsaaRowForProfile[]): string {
  const stateResults = nchsaaRowsToStateResults(rows)
  const titleYears = countDistinctStateTitleYears(rows)
  const badge = stateChampionBadgeLabel(titleYears)
  if (badge) return badge
  if (stateResults.length > 0) return stateResults.map((r) => r.text).join(", ")
  return "No State Placement"
}
