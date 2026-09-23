/**
 * What a typical North Carolina schedule looks like, so a number on the report can be compared.
 *
 * The share of a wrestler's bouts against opponents rated 95+, measured across the 325 NC
 * wrestlers on file with five or more rated bouts (23 September 2026):
 *
 *   min 0 · p25 41 · median 53 · p75 63 · p90 70 · max 86
 *
 * The report prints the median beside a wrestler's own share, which is the whole point: "57%"
 * means nothing on its own, and "57%, median 53%" means something immediately. It is also the
 * answer to the question that sank the previous copy here — "top 5% of what?" — because this
 * population can be named and counted.
 *
 * A snapshot, not a live figure. As more seasons import the median will drift; recompute it
 * in the off-season rather than trusting it forever.
 */

/** Athletes with 5+ rated bouts when the figures were measured. */
export const SCHEDULE_BAND_SAMPLE = 325
export const SCHEDULE_BAND_P25 = 41
export const SCHEDULE_BAND_MEDIAN = 53
export const SCHEDULE_BAND_P75 = 63
export const SCHEDULE_BAND_P90 = 70
