/**
 * "132 lbs" or "57 kg".
 *
 * USA Wrestling's freestyle and Greco events record weights in kilos and we store the number as it
 * came, so Claire Ballard's 57 kg at Women's Nationals read "57 lbs". Nobody in high school
 * wrestles under 95 lbs - the lightest scholastic weights are 100 for girls and 106 for boys - so a
 * number below that is kilos. A weight that already names its unit keeps it.
 */
export const LIGHTEST_POUND_WEIGHT = 95

export function weightLabel(weight: string | number | null | undefined): string | null {
  const text = String(weight ?? "").trim()
  if (!text) return null
  if (/[a-z]/i.test(text)) return text
  const n = Number(text)
  return Number.isFinite(n) && n > 0 && n < LIGHTEST_POUND_WEIGHT ? `${text} kg` : `${text} lbs`
}
