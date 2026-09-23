/**
 * Where a wrestler's schedule sits against every other schedule we hold.
 *
 * A visual indicator was the obvious ask and the obvious trap. A speedometer over a blended
 * score would put us straight back where we were this morning, when the report told college
 * coaches "top 5%" off a number nobody could define.
 *
 * So the dial measures one thing we actually have: the share of a wrestler's bouts against
 * opponents rated 95+. And the bands are not invented — they are the real quartiles of that
 * share across the 325 NC wrestlers on file with five or more rated bouts, measured
 * 23 September 2026:
 *
 *   min 0 · p25 41 · median 53 · p75 63 · p90 70 · max 86
 *
 * Which means the caption can name its population and its denominator, and a coach who asks
 * "out of what?" gets an answer.
 */

/** Athletes with 5+ rated bouts at the time the bands were measured. */
export const SCHEDULE_BAND_SAMPLE = 325
export const SCHEDULE_BAND_P25 = 41
export const SCHEDULE_BAND_MEDIAN = 53
export const SCHEDULE_BAND_P75 = 63
export const SCHEDULE_BAND_P90 = 70

export type ScheduleBand = {
  /** 0-3, lowest to highest quartile. */
  band: 0 | 1 | 2 | 3
  /** Plain words for a coach. Never "weak": this is a measurement, not a verdict. */
  label: string
  /** Tailwind colour for the filled bar. */
  color: string
  /** The sentence under the bar. */
  caption: string
}

export function scheduleStrengthBand(eliteShare: number | null | undefined): ScheduleBand | null {
  if (eliteShare == null || !Number.isFinite(eliteShare)) return null
  const share = Math.max(0, Math.min(100, Math.round(eliteShare)))

  const { band, label, color } = (() => {
    if (share >= SCHEDULE_BAND_P90) {
      return { band: 3 as const, label: "Top 10% of schedules on file", color: "bg-emerald-600" }
    }
    if (share >= SCHEDULE_BAND_P75) {
      return { band: 3 as const, label: "Top quarter of schedules on file", color: "bg-emerald-600" }
    }
    if (share >= SCHEDULE_BAND_MEDIAN) {
      return { band: 2 as const, label: "Above the median schedule", color: "bg-sky-600" }
    }
    if (share >= SCHEDULE_BAND_P25) {
      return { band: 1 as const, label: "Below the median schedule", color: "bg-slate-500" }
    }
    return { band: 0 as const, label: "Bottom quarter of schedules on file", color: "bg-slate-400" }
  })()

  return {
    band,
    label,
    color,
    caption:
      `${share}% of bouts against opponents rated 95+. Median is ${SCHEDULE_BAND_MEDIAN}% across the` +
      ` ${SCHEDULE_BAND_SAMPLE} North Carolina wrestlers on file with a rated schedule.`,
  }
}
