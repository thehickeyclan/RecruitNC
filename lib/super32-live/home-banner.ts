/**
 * The homepage strip for the Super 32 Command Center. It has an end: "live" through the finals,
 * "results" for three days after, then nothing (the event-clock rule: every date gate needs a
 * ceiling, or the homepage keeps announcing a finished event).
 */
const LIVE_ENDS = Date.parse("2026-10-25T23:59:59-04:00")
const RESULTS_END = Date.parse("2026-10-28T23:59:59-04:00")

export function super32HomeBanner(now: Date = new Date()): "live" | "results" | null {
  const t = now.getTime()
  if (t <= LIVE_ENDS) return "live"
  if (t <= RESULTS_END) return "results"
  return null
}
