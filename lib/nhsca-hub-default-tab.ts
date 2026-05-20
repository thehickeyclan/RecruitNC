/** NHSCA team hub tab ids (must match TabsTrigger value in nhsca-hub-tabs). */
export const NHSCA_HUB_TAB_IDS = [
  "rosters",
  "results",
  "event-info",
  "payment",
  "media",
  "watch",
] as const

export type NhscaHubTabId = (typeof NHSCA_HUB_TAB_IDS)[number]

/** Sat May 23, 2026 · 8:00 AM Eastern (first round). */
export const NHSCA_DUALS_2026_COMPETITION_START_MS = Date.parse("2026-05-23T12:00:00.000Z")

export function parseNhscaHubTabParam(raw: string | null | undefined): NhscaHubTabId | null {
  if (!raw?.trim()) return null
  return (NHSCA_HUB_TAB_IDS as readonly string[]).includes(raw) ? (raw as NhscaHubTabId) : null
}

/**
 * Default hub tab: Rosters for registered families before Day 1; Results for fans and during the event.
 */
export function nhscaHubDefaultTab(opts: {
  nhscaInfoOnly: boolean
  hasRoster: boolean
  nowMs?: number
}): NhscaHubTabId {
  if (opts.nhscaInfoOnly || !opts.hasRoster) return "results"
  const now = opts.nowMs ?? Date.now()
  if (now < NHSCA_DUALS_2026_COMPETITION_START_MS) return "rosters"
  return "results"
}
