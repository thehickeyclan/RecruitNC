/** The time ranges /admin/card-analytics offers, shared by every panel on that page. */
export type AnalyticsRange = "today" | "last7" | "last30" | "last90" | "year" | "all"
export const ANALYTICS_RANGES: AnalyticsRange[] = ["today", "last7", "last30", "last90", "year", "all"]

export function parseAnalyticsRange(value: string | null | undefined, fallback: AnalyticsRange = "all"): AnalyticsRange {
  return value && (ANALYTICS_RANGES as string[]).includes(value) ? (value as AnalyticsRange) : fallback
}

/** ISO start of the range, or null for all time. */
export function analyticsRangeStart(range: AnalyticsRange, now = new Date()): string | null {
  if (range === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  if (range === "year") return new Date(now.getFullYear(), 0, 1).toISOString()
  const days = { last7: 7, last30: 30, last90: 90 }[range as "last7" | "last30" | "last90"]
  return days ? new Date(now.getTime() - days * 86_400_000).toISOString() : null
}
