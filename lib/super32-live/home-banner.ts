/**
 * The homepage lead for Super 32. It has an end: "live" through the finals, then the recap as the
 * headline (Matt, 26 Oct 2026: the live dashboard comes off the homepage, the recap leads) until
 * 8 November, then nothing (the event-clock rule: every date gate needs a ceiling, or the homepage
 * keeps announcing a finished event).
 */
const LIVE_ENDS = Date.parse("2026-10-25T23:59:59-04:00")
const RECAP_END = Date.parse("2026-11-08T23:59:59-05:00")

export function super32HomeBanner(now: Date = new Date()): "live" | "recap" | null {
  const t = now.getTime()
  if (t <= LIVE_ENDS) return "live"
  if (t <= RECAP_END) return "recap"
  return null
}
