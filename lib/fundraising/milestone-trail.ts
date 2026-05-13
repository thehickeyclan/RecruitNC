/** Milestone ladder for fundraising progress UI — pure helpers (goal-scaled, no fixed 50k tail). */

export const DEFAULT_FUNNEL_GOAL_CENTS = 1000 * 100

export function roundStepDollars(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 1
  const exp = Math.floor(Math.log10(step))
  const pow = Math.pow(10, exp)
  const f = step / pow
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nf * pow
}

/** Milestone amounts in cents — never above the goal; last step is always the goal. */
export function milestonesCentsForGoal(goalCents: number): number[] {
  const goalD = Math.round(goalCents / 100)
  if (goalD <= 0) return []

  if (goalD === 1000) {
    return [250, 500, 750, 1000].map((d) => d * 100)
  }

  if (goalD < 250) {
    const step = Math.max(1, Math.ceil(goalD / 4))
    const out: number[] = []
    for (let d = step; d < goalD; d += step) out.push(d * 100)
    out.push(goalCents)
    return [...new Set(out)].sort((a, b) => a - b)
  }

  if (goalD <= 1500 && goalD % 250 === 0) {
    const out: number[] = []
    for (let d = 250; d <= goalD; d += 250) out.push(d * 100)
    return out
  }

  const targetSteps = 5
  const stepD = Math.max(1, roundStepDollars(goalD / targetSteps))
  const out: number[] = []
  for (let d = stepD; d < goalD; d += stepD) {
    out.push(Math.min(d, goalD) * 100)
  }
  if (out.length === 0 || out[out.length - 1] !== goalCents) {
    out.push(goalCents)
  }
  return [...new Set(out)].sort((a, b) => a - b)
}

export function resolvedGoalCents(goal: number | null | undefined): number {
  if (goal != null && goal > 0) return goal
  return DEFAULT_FUNNEL_GOAL_CENTS
}
