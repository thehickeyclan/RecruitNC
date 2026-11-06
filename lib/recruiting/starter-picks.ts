/**
 * Which colleges the starter set suggests (Matt, 5 Nov 2026). The picks are earned, not filled:
 *
 * - At most one per level, and only from a level with a program for the wrestler's team.
 * - A pick needs a real reason: projected roster opportunity at the weight last competed, a
 *   results, academic or budget fit, or the family's own state. "Worth a look" is never a reason.
 * - The athletic line (what the level's programs typically recruit, against the wrestler's results)
 *   counts in the score and orders the levels: where the results fit comes first. A level whose
 *   athletic line is a concern is still shown when something else earns it, last; it is a target, not a verdict.
 *
 * So a family may see five, three or none. Nothing pads the list back to five.
 */
import type { FitStatus } from "@/lib/recruiting/family-fit"

export type StarterCandidate = {
  id: string
  name: string
  inState: boolean
  miles: number | null
  /** The weight with projected roster opportunity in the arrival fall, if any. */
  roomWeight: number | null
  athletic: FitStatus
  academic: FitStatus
  cost: FitStatus
  goals: FitStatus
}

export type StarterPick = { id: string; level: string; why: string }

const POINTS: Record<FitStatus, number> = { fit: 2, stretch: 1, concern: 0, unknown: 0 }
const ATHLETIC_ORDER: Record<FitStatus, number> = { fit: 0, stretch: 1, unknown: 2, concern: 3 }

/** The one reason shown on the card, strongest first; null when nothing earns the pick. */
export function starterReason(c: StarterCandidate, level: string): string | null {
  if (c.roomWeight != null) return `Projected opportunity at ${c.roomWeight}`
  if (c.athletic === "fit") return `Results fit ${level}`
  if (c.academic === "fit") return "Academic fit"
  if (c.inState) return "In your state"
  if (c.cost === "fit") return "Fits the budget"
  if (c.goals === "fit") return "Fits your goals"
  return null
}

export function starterScore(c: StarterCandidate): number {
  return POINTS[c.athletic] + POINTS[c.academic] + POINTS[c.cost] + POINTS[c.goals] + (c.inState ? 1 : 0) + (c.roomWeight != null ? 1 : 0)
}

/** The best earned candidate per level, levels ordered by athletic fit (then the level's own order). */
export function pickStarter(levels: Array<{ level: string; candidates: StarterCandidate[] }>): StarterPick[] {
  const picks: Array<StarterPick & { athletic: FitStatus; order: number }> = []
  const taken = new Set<string>()
  levels.forEach(({ level, candidates }, order) => {
    const best = candidates
      .filter((c) => !taken.has(c.id))
      .map((c) => ({ c, why: starterReason(c, level), score: starterScore(c) }))
      .filter((x): x is { c: StarterCandidate; why: string; score: number } => x.why != null)
      .sort((a, b) => b.score - a.score || (a.c.miles ?? 9e9) - (b.c.miles ?? 9e9) || a.c.name.localeCompare(b.c.name))[0]
    if (!best) return
    taken.add(best.c.id)
    picks.push({ id: best.c.id, level, why: best.why, athletic: best.c.athletic, order })
  })
  return picks.sort((a, b) => ATHLETIC_ORDER[a.athletic] - ATHLETIC_ORDER[b.athletic] || a.order - b.order).map(({ id, level, why }) => ({ id, level, why }))
}
