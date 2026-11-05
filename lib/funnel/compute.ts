/**
 * The family funnel, counted (Matt, 2 Nov 2026): profile → claimed → recruiting-ready → Insider →
 * Command Center → activated (five colleges saved). Pure: lib/funnel/load.ts reads the rows,
 * app/admin/funnel draws the answer. Every number here comes from a stored row; a stage with no
 * timestamp is counted as reached with its time unknown, never given one.
 */

export type FunnelState = "NC" | "SC"

export type FunnelAthlete = {
  id: string
  state: FunnelState
  classYear: number
  claimedAt: string | null
  /** Where the claimer first came from: "instagram", "facebook (paid)", "before tracking". */
  source: string
  gpa: boolean
  cell: boolean
  major: boolean
  /** When the last of the three arrived, where a stored row says; null when unknown or not ready. */
  readyAt: string | null
  insiderAt: string | null
  commandCenterAt: string | null
  /** The fifth college saved by an owner on Command Center. */
  activatedAt: string | null
  /** A Blue (club) family: Insider and Command Center come with the club, not bought. */
  blue: boolean
  claimStartedAt: string | null
  /** Views of the profile by visitors and families (not coaches) in the window. */
  familyViews: number
  /** Distinct college programs that viewed or starred the athlete, last 30 days. */
  coachPrograms30: number
  /** First coach activity of any age, to tell an upgrade that followed coach interest. */
  firstCoachAt: string | null
}

export type Filters = { state: FunnelState | "all"; classYear: number | "all"; source: string | "all" }

const DAY = 86_400_000

export const ready = (a: FunnelAthlete) => a.gpa && a.cell && a.major

export function applyFilters(rows: readonly FunnelAthlete[], f: Filters): FunnelAthlete[] {
  return rows.filter(
    (a) =>
      (f.state === "all" || a.state === f.state) &&
      (f.classYear === "all" || a.classYear === f.classYear) &&
      // A source belongs to a claim: unclaimed profiles have none and drop out of a source view.
      (f.source === "all" || (a.claimedAt != null && a.source === f.source)),
  )
}

export type Stage = { key: string; label: string; count: number; of: number | null; ofLabel: string | null }

export function stages(rows: readonly FunnelAthlete[]): Stage[] {
  const claimed = rows.filter((a) => a.claimedAt)
  const readyRows = claimed.filter(ready)
  const insider = claimed.filter((a) => a.insiderAt && !a.blue)
  const cc = claimed.filter((a) => a.commandCenterAt && !a.blue)
  const activated = cc.filter((a) => a.activatedAt)
  return [
    { key: "profiles", label: "Profiles", count: rows.length, of: null, ofLabel: null },
    { key: "claimed", label: "Claimed", count: claimed.length, of: rows.length, ofLabel: "of profiles" },
    { key: "ready", label: "Recruiting-ready", count: readyRows.length, of: claimed.length, ofLabel: "of claimed" },
    { key: "insider", label: "Insider (paid)", count: insider.length, of: claimed.length, ofLabel: "of claimed" },
    { key: "cc", label: "Command Center (paid)", count: cc.length, of: insider.length || null, ofLabel: "of Insider" },
    { key: "activated", label: "Activated: 5 colleges saved", count: activated.length, of: cc.length || null, ofLabel: "of Command Center" },
  ]
}

/** Which of the three is holding claimed profiles back, alone and in total. */
export function completion(rows: readonly FunnelAthlete[]) {
  const claimed = rows.filter((a) => a.claimedAt)
  const n = claimed.length
  const only = (k: "gpa" | "cell" | "major") => claimed.filter((a) => !a[k] && (["gpa", "cell", "major"] as const).every((o) => o === k || a[o])).length
  return {
    claimed: n,
    gpa: claimed.filter((a) => a.gpa).length,
    cell: claimed.filter((a) => a.cell).length,
    major: claimed.filter((a) => a.major).length,
    ready: claimed.filter(ready).length,
    onlyGpaMissing: only("gpa"),
    onlyCellMissing: only("cell"),
    onlyMajorMissing: only("major"),
    noneOfThree: claimed.filter((a) => !a.gpa && !a.cell && !a.major).length,
  }
}

export type Transition = {
  label: string
  entered: number
  reached: number
  /** For each window: of those who entered at least that long ago, the share who got there within it. */
  within: { days: number; eligible: number; reached: number }[]
  medianDays: number | null
  /** Reached, but one of the two times is not stored. */
  untimed: number
}

export function transition(
  rows: readonly FunnelAthlete[],
  label: string,
  from: (a: FunnelAthlete) => string | null,
  to: (a: FunnelAthlete) => string | null,
  reachedAt: (a: FunnelAthlete) => boolean,
  now: Date,
): Transition {
  const entered = rows.filter((a) => from(a))
  const gaps: number[] = []
  let untimed = 0
  for (const a of entered) {
    if (!reachedAt(a)) continue
    const t = to(a)
    if (!t) {
      untimed++
      continue
    }
    // Bought before claiming, say: it happened at the start, not before it.
    gaps.push(Math.max(0, Date.parse(t) - Date.parse(from(a)!)) / DAY)
  }
  const within = [1, 7, 30].map((days) => {
    const eligible = entered.filter((a) => now.getTime() - Date.parse(from(a)!) >= days * DAY)
    const hit = eligible.filter((a) => {
      const t = to(a)
      return t != null && (Date.parse(t) - Date.parse(from(a)!)) / DAY <= days
    })
    return { days, eligible: eligible.length, reached: hit.length }
  })
  const sorted = [...gaps].sort((x, y) => x - y)
  const medianDays = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null
  return { label, entered: entered.length, reached: entered.filter(reachedAt).length, within, medianDays, untimed }
}

export function transitions(rows: readonly FunnelAthlete[], now: Date): Transition[] {
  const paid = rows.filter((a) => !a.blue)
  return [
    transition(rows, "Claim started → claimed", (a) => a.claimStartedAt, (a) => a.claimedAt, (a) => a.claimedAt != null, now),
    transition(rows, "Claimed → recruiting-ready", (a) => a.claimedAt, (a) => a.readyAt, ready, now),
    transition(paid, "Claimed → Insider", (a) => a.claimedAt, (a) => a.insiderAt, (a) => a.insiderAt != null, now),
    transition(paid, "Insider → Command Center", (a) => a.insiderAt, (a) => a.commandCenterAt, (a) => a.commandCenterAt != null, now),
    transition(paid, "Command Center → 5 colleges saved", (a) => a.commandCenterAt, (a) => a.activatedAt, (a) => a.activatedAt != null, now),
  ]
}

/** Awareness against friction, per state: are families finding profiles, and do they claim? */
export function awareness(rows: readonly FunnelAthlete[], windowStart: string) {
  return (["NC", "SC"] as const).map((state) => {
    const s = rows.filter((a) => a.state === state)
    const unclaimed = s.filter((a) => !a.claimedAt)
    return {
      state,
      profiles: s.length,
      unclaimed: unclaimed.length,
      viewedUnclaimed: unclaimed.filter((a) => a.familyViews > 0).length,
      views: s.reduce((n, a) => n + a.familyViews, 0),
      claimStarts: s.filter((a) => a.claimStartedAt && a.claimStartedAt >= windowStart).length,
      claims: s.filter((a) => a.claimedAt && a.claimedAt >= windowStart).length,
    }
  })
}

/** Coach activity kept apart from rankings: how many families have anything real to be sold on. */
export function coachActivity(rows: readonly FunnelAthlete[]) {
  const claimed = rows.filter((a) => a.claimedAt)
  const insider = rows.filter((a) => a.insiderAt && !a.blue)
  const before = insider.filter((a) => a.firstCoachAt && a.firstCoachAt <= a.insiderAt!)
  return {
    profiles: rows.length,
    anyProgram30: rows.filter((a) => a.coachPrograms30 >= 1).length,
    threePrograms30: rows.filter((a) => a.coachPrograms30 >= 3).length,
    claimed: claimed.length,
    claimedAnyProgram30: claimed.filter((a) => a.coachPrograms30 >= 1).length,
    insider: insider.length,
    insiderAfterCoachActivity: before.length,
    insiderWithoutCoachActivity: insider.length - before.length,
  }
}

export function sources(rows: readonly FunnelAthlete[]) {
  const claimed = rows.filter((a) => a.claimedAt)
  const by = new Map<string, { claimed: number; ready: number; insider: number }>()
  for (const a of claimed) {
    const r = by.get(a.source) ?? { claimed: 0, ready: 0, insider: 0 }
    r.claimed++
    if (ready(a)) r.ready++
    if (a.insiderAt && !a.blue) r.insider++
    by.set(a.source, r)
  }
  return [...by.entries()].map(([source, r]) => ({ source, ...r })).sort((x, y) => y.claimed - x.claimed)
}

/**
 * A new state's clock: claims (and how many of those became recruiting-ready) by Day 7, 30 and 60
 * after its family announcement. A checkpoint not yet reached is null, never a partial number
 * dressed as a final one. Claims made before the announcement are counted apart.
 */
export function launchClock(
  rows: readonly FunnelAthlete[],
  launch: { state: FunnelState; announced: string; target: { claimsLow: number; claimsHigh: number; byDay: number } },
  now: Date,
  checkpoints: readonly number[] = [7, 30, 60],
) {
  const start = Date.parse(`${launch.announced}T00:00:00-05:00`)
  const s = rows.filter((a) => a.state === launch.state)
  const claimedAfter = s.filter((a) => a.claimedAt && Date.parse(a.claimedAt) >= start)
  const by = (days: number) => claimedAfter.filter((a) => Date.parse(a.claimedAt!) < start + days * DAY)
  const day = Math.max(0, Math.floor((now.getTime() - start) / DAY))
  return {
    state: launch.state,
    announced: launch.announced,
    day,
    profiles: s.length,
    claimedBefore: s.filter((a) => a.claimedAt && Date.parse(a.claimedAt) < start).length,
    claimedSince: claimedAfter.length,
    readySince: claimedAfter.filter(ready).length,
    checkpoints: checkpoints.map((d) => {
      const hit = day >= d ? by(d) : null
      return { day: d, claims: hit ? hit.length : null, ready: hit ? hit.filter(ready).length : null }
    }),
    target: { ...launch.target, soFar: by(launch.target.byDay).length },
  }
}
