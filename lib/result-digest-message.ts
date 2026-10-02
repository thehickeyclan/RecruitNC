/**
 * The words on the lock screen when an event's results land.
 *
 * Pulled out of the cron because this is the part that can embarrass us publicly: an ordinal
 * reading "3rd" and not "3th", a wrestler named by first name only, and — the one that matters —
 * never claiming a placement for a bracket we hold without finishes.
 */

export function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")
  return `${n}${suffix}`
}

export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0]
  return first && first.length > 0 ? first : name.trim()
}

export type DigestHeadline = {
  /** How many of this account's followed wrestlers were at the event. */
  count: number
  /** The best finish among them, with the wrestler's name. Null when no placement is on file. */
  best: { name: string; place: number } | null
}

/**
 * One sentence, naming the best result this account has a stake in.
 *
 * With no placement on file the count stands on its own. A bracket without finishes is a real
 * state — results import before placements are keyed — and inventing "placed 1st" from a missing
 * column would be worse than saying less.
 */
export function digestBody({ count, best }: DigestHeadline): string {
  const who = count === 1 ? "1 wrestler you follow" : `${count} wrestlers you follow`
  if (!best) return `${who} competed.`
  return `${who} competed. ${firstName(best.name)} placed ${ordinal(best.place)}.`
}

export function digestTitle(eventLabel: string): string {
  return `${eventLabel} results are in`
}
