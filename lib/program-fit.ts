/**
 * Program fit: does this wrestler meet what a college program says it needs?
 *
 * A staff sets its needs once — the weights it is recruiting, the classes, an academic floor, the
 * majors it offers, whether it wants wrestlers who travel nationally — and every comparison checks
 * both wrestlers against them. Shared by the whole staff, like the My Recruits board: one program,
 * one set of needs (`user_profiles.school_id`; a coach with no school keeps their own).
 *
 * Three answers per need, never two. "Not on file" is its own result: a wrestler with no GPA on
 * the profile has not failed a 3.0 floor, and marking it a miss would put a false fact in front of
 * a coach. A need the program has not set is not checked at all.
 *
 * Weights are the one judgement here, and it is stated: an athlete's own projected college weight
 * when they give one, otherwise the college weight at or just above what they last wrestled and
 * the next one up, because a high schooler grows into the class above.
 *
 * Coaches set this through the "perfect recruit" wizard (Matt, 7 October 2026): the needs above,
 * a competition level, which needs are must-haves, and which categories decide a comparison. The
 * comparison then reads against it - who matches more of the perfect recruit, and a plain warning
 * when the wrestler ahead on edges misses a must-have.
 */

export const COLLEGE_WEIGHTS = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285] as const

export type ProgramFitCriteria = {
  /** College weights the program is recruiting. Empty = any. */
  targetWeights: number[]
  /** Graduation years the program is recruiting. Empty = any. */
  classYears: number[]
  minGpa: number | null
  /** An SAT or ACT at or above either floor meets the test requirement. */
  minSat: number | null
  minAct: number | null
  /** Majors the school offers, from the profile dropdown. Empty = any. */
  majors: string[]
  /** Wants at least one individual national event on file. */
  requireNational: boolean
  /** The NC state finish the program wants at minimum. "any" checks nothing. */
  stateFinish: StateFinishLevel
  /** Wants a published RecruitNC rank or a national ranking. */
  requireRanked: boolean
  /** Needs that rule a wrestler out when missed, not just count against him. */
  mustHaves: FitKey[]
  /** Comparison rows that decide it for this program; empty = the tool's defaults. */
  priorities: string[]
}

export type StateFinishLevel = "any" | "placer" | "finalist" | "champion"

export const STATE_FINISH_OPTIONS: Array<{ value: StateFinishLevel; label: string }> = [
  { value: "any", label: "Doesn't matter" },
  { value: "placer", label: "State placer" },
  { value: "finalist", label: "State finalist" },
  { value: "champion", label: "State champion" },
]

const STATE_FINISH_MAX_PLACE: Record<Exclude<StateFinishLevel, "any">, number> = {
  placer: 99,
  finalist: 2,
  champion: 1,
}

export type FitKey = "weight" | "class" | "gpa" | "tests" | "major" | "national" | "state" | "ranked"

export const FIT_KEYS: FitKey[] = ["weight", "class", "gpa", "tests", "major", "national", "state", "ranked"]

/** What a coach can pick as deciding a comparison. Keys are comparison row keys. */
export const PRIORITY_OPTIONS: Array<{ key: string; label: string; group: string }> = [
  { key: "strength", label: "Strength of opponents", group: "Competition" },
  { key: "footprint", label: "National or NC only", group: "Competition" },
  { key: "state", label: "NC state placement", group: "Competition" },
  { key: "nhsca", label: "NHSCA Nationals", group: "National events" },
  { key: "super32", label: "Super 32", group: "National events" },
  { key: "earlyentry", label: "Super 32 Early Entry", group: "National events" },
  { key: "journeymen", label: "Journeymen", group: "National events" },
  { key: "fargo", label: "Fargo", group: "National events" },
  { key: "i64", label: "I-64 Duals", group: "National events" },
  { key: "toc", label: "Tournament of Champions", group: "National events" },
  { key: "national-rank", label: "National ranking", group: "Rankings" },
  { key: "state-rank", label: "RecruitNC ranking", group: "Rankings" },
  { key: "stars", label: "Star rating", group: "Rankings" },
  { key: "gpa", label: "GPA", group: "Academics" },
  { key: "sat", label: "SAT", group: "Academics" },
  { key: "act", label: "ACT", group: "Academics" },
  { key: "interest", label: "Academic interest", group: "Academics" },
]

export const DEFAULT_MUST_HAVES: FitKey[] = ["weight", "class"]

export const EMPTY_CRITERIA: ProgramFitCriteria = {
  targetWeights: [],
  classYears: [],
  minGpa: null,
  minSat: null,
  minAct: null,
  majors: [],
  requireNational: false,
  stateFinish: "any",
  requireRanked: false,
  mustHaves: DEFAULT_MUST_HAVES,
  priorities: [],
}

export type FitStatus = "fit" | "miss" | "unknown"

export type FitCheck = {
  key: FitKey
  label: string
  status: FitStatus
  /** A must-have: missing it rules the wrestler out, not just counts against him. */
  mustHave: boolean
  /** What was compared, in a coach's words: "3.4 against a 3.0 floor". */
  detail: string
}

export type FitSubject = {
  graduationYear: number | null
  /** Athlete-stated projected college weight, e.g. "141". */
  collegeWeightClass: string | null
  /** Most recent competed weight, else the listed one. */
  currentWeight: string | null
  gpa: string | null
  sat: string | null
  act: string | null
  academicInterest: string | null
  /** Individual national events entered (team duals excluded). */
  nationalEvents: number
  /** Best NCHSAA finish as a place, and how to say it: "2nd, 2026 6A 113". Null when none. */
  stateBestPlace?: number | null
  stateBestLabel?: string | null
  /** Carries a published RecruitNC rank or a national ranking, said as "#6 RecruitNC Class of 2028". */
  rankedLabel?: string | null
}

function num(raw: unknown): number | null {
  const n = Number(String(raw ?? "").replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function hasAnyCriteria(c: ProgramFitCriteria): boolean {
  return (
    c.targetWeights.length > 0 ||
    c.classYears.length > 0 ||
    c.minGpa != null ||
    c.minSat != null ||
    c.minAct != null ||
    c.majors.length > 0 ||
    c.requireNational ||
    c.stateFinish !== "any" ||
    c.requireRanked
  )
}

/** Anything saved at all - needs, or only the categories that decide a comparison. */
export function hasPerfectRecruit(c: ProgramFitCriteria): boolean {
  return hasAnyCriteria(c) || c.priorities.length > 0
}

/**
 * The college weights a wrestler is a candidate for: their own projection, else the class at or
 * above their current weight and the next one up.
 */
export function projectedCollegeWeights(subject: Pick<FitSubject, "collegeWeightClass" | "currentWeight">): {
  weights: number[]
  basis: string
} | null {
  const stated = num(subject.collegeWeightClass)
  if (stated != null) {
    const nearest = COLLEGE_WEIGHTS.find((w) => w >= stated) ?? 285
    return { weights: [nearest], basis: `projects ${nearest} (athlete-stated)` }
  }
  const current = num(subject.currentWeight)
  if (current == null) return null
  const i = COLLEGE_WEIGHTS.findIndex((w) => w >= current)
  const at = i === -1 ? COLLEGE_WEIGHTS.length - 1 : i
  const weights = [COLLEGE_WEIGHTS[at]!, COLLEGE_WEIGHTS[Math.min(at + 1, COLLEGE_WEIGHTS.length - 1)]!]
  const unique = [...new Set(weights)]
  return { weights: unique, basis: `wrestles ${current}, so ${unique.join(" or ")} in college` }
}

/** "Health Sciences / Pre-Med" offered, "Pre-Med" stated: a match. Case- and punctuation-blind. */
export function majorMatches(interest: string, offered: string[]): string | null {
  const words = (s: string) =>
    s
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 2 && !["and", "the", "other"].includes(w))
  const want = words(interest)
  if (!want.length) return null
  for (const major of offered) {
    const have = words(major)
    if (want.some((w) => have.includes(w))) return major
  }
  return null
}

export function evaluateProgramFit(subject: FitSubject, c: ProgramFitCriteria): FitCheck[] {
  const checks: Array<Omit<FitCheck, "mustHave">> = []

  if (c.targetWeights.length) {
    const targets = [...c.targetWeights].sort((a, b) => a - b)
    const projected = projectedCollegeWeights(subject)
    if (!projected) {
      checks.push({ key: "weight", label: "Weight", status: "unknown", detail: "No weight on file" })
    } else {
      const hit = projected.weights.find((w) => targets.includes(w))
      checks.push({
        key: "weight",
        label: "Weight",
        status: hit != null ? "fit" : "miss",
        detail: hit != null ? `${projected.basis}; you need ${hit}` : `${projected.basis}; you need ${targets.join(", ")}`,
      })
    }
  }

  if (c.classYears.length) {
    const y = subject.graduationYear
    checks.push({
      key: "class",
      label: "Class",
      status: y == null ? "unknown" : c.classYears.includes(y) ? "fit" : "miss",
      detail: y == null ? "Class year not on file" : `Class of ${y}`,
    })
  }

  if (c.minGpa != null) {
    const gpa = num(subject.gpa)
    checks.push({
      key: "gpa",
      label: "GPA",
      status: gpa == null ? "unknown" : gpa >= c.minGpa ? "fit" : "miss",
      // "3.0", not "3": a GPA floor reads with its decimal.
      detail: gpa == null ? "Not on file" : `${subject.gpa} against a ${Number.isInteger(c.minGpa) ? c.minGpa.toFixed(1) : c.minGpa} floor`,
    })
  }

  if (c.minSat != null || c.minAct != null) {
    const sat = num(subject.sat)
    const act = num(subject.act)
    const satOk = c.minSat != null && sat != null && sat >= c.minSat
    const actOk = c.minAct != null && act != null && act >= c.minAct
    const floors = [c.minSat != null ? `SAT ${c.minSat}` : null, c.minAct != null ? `ACT ${c.minAct}` : null].filter(Boolean).join(" or ")
    const held = [sat != null ? `SAT ${sat}` : null, act != null ? `ACT ${act}` : null].filter(Boolean).join(", ")
    const comparable = (c.minSat != null && sat != null) || (c.minAct != null && act != null)
    checks.push({
      key: "tests",
      label: "Test scores",
      status: satOk || actOk ? "fit" : comparable ? "miss" : "unknown",
      detail: held ? `${held} against ${floors}` : "Not on file",
    })
  }

  if (c.majors.length) {
    const interest = String(subject.academicInterest ?? "").trim()
    const undecided = /^undecided$/i.test(interest)
    const hit = interest && !undecided ? majorMatches(interest, c.majors) : null
    checks.push({
      key: "major",
      label: "Major",
      // Undecided is open to anything, which is a fit for a program that offers majors at all.
      status: !interest ? "unknown" : undecided || hit ? "fit" : "miss",
      detail: !interest ? "Not on file" : undecided ? "Undecided" : hit ? `${interest} (you offer ${hit})` : `${interest}, not on your list`,
    })
  }

  if (c.requireNational) {
    const n = subject.nationalEvents
    checks.push({
      key: "national",
      label: "National experience",
      status: n > 0 ? "fit" : "miss",
      detail: n > 0 ? `${n} individual national ${n === 1 ? "event" : "events"}` : "No individual national event on file",
    })
  }

  if (c.stateFinish !== "any") {
    const want = STATE_FINISH_MAX_PLACE[c.stateFinish]
    const wantLabel = STATE_FINISH_OPTIONS.find((o) => o.value === c.stateFinish)!.label.toLowerCase()
    const place = subject.stateBestPlace ?? null
    checks.push({
      key: "state",
      label: "State finish",
      // No placing on file is a miss, not unknown: every NC wrestler's state results are imported.
      status: place != null && place <= want ? "fit" : "miss",
      detail: place != null ? `Best: ${subject.stateBestLabel ?? place}; you want a ${wantLabel}` : `No state placing; you want a ${wantLabel}`,
    })
  }

  if (c.requireRanked) {
    const label = subject.rankedLabel ?? null
    checks.push({
      key: "ranked",
      label: "Ranked",
      status: label ? "fit" : "miss",
      detail: label ?? "Not ranked",
    })
  }

  const must = new Set(c.mustHaves)
  return checks.map((check) => ({ ...check, mustHave: must.has(check.key) }))
}

/**
 * The sentences at the top of a comparison, decided here rather than in the page.
 *
 * "Richards matches 5 of 6 of your perfect recruit. McDermott matches 3 of 6, missing Class and
 * GPA." Then the warning that matters most: the wrestler ahead on edges missing a must-have, which
 * an edge count would otherwise hide.
 */
export function summarizeFit(input: {
  leftName: string
  rightName: string
  left: FitCheck[]
  right: FitCheck[]
  /** Who holds more edges on the rows shown, if anyone. */
  edgeLeader: "left" | "right" | null
}): { lines: string[]; cautions: string[] } {
  const { left, right } = input
  if (!left.length) return { lines: [], cautions: [] }
  const list = (labels: string[]) =>
    labels.length <= 1 ? labels.join("") : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`
  const line = (name: string, checks: FitCheck[]) => {
    const met = checks.filter((c) => c.status === "fit").length
    const misses = checks.filter((c) => c.status === "miss").map((c) => c.label)
    const unknown = checks.filter((c) => c.status === "unknown").map((c) => c.label)
    let out = `${name} matches ${met} of ${checks.length} of your perfect recruit`
    if (misses.length) out += `, missing ${list(misses)}`
    if (unknown.length) out += ` (${list(unknown)} not on file)`
    return `${out}.`
  }
  const mustMisses = (checks: FitCheck[]) => checks.filter((c) => c.mustHave && c.status === "miss").map((c) => c.label)

  const cautions: string[] = []
  const lm = mustMisses(left)
  const rm = mustMisses(right)
  const leader = input.edgeLeader
  const leaderMisses = leader === "left" ? lm : leader === "right" ? rm : []
  const leaderName = leader === "left" ? input.leftName : leader === "right" ? input.rightName : ""
  if (leader && leaderMisses.length) {
    cautions.push(
      `${leaderName} leads on edges but misses your must-have${leaderMisses.length === 1 ? "" : "s"}: ${list(leaderMisses)}.`,
    )
  }
  if (lm.length && rm.length) {
    cautions.push("Neither wrestler meets all your must-haves.")
  } else {
    for (const [name, misses, side] of [
      [input.leftName, lm, "left"],
      [input.rightName, rm, "right"],
    ] as const) {
      if (misses.length && side !== leader) cautions.push(`${name} misses your must-have${misses.length === 1 ? "" : "s"}: ${list(misses)}.`)
    }
  }
  return { lines: [line(input.leftName, left), line(input.rightName, right)], cautions }
}

/** Clean what a browser sent into criteria the evaluator can trust. */
export function sanitizeCriteria(raw: unknown): ProgramFitCriteria {
  const r = (raw ?? {}) as Record<string, unknown>
  const ints = (v: unknown, ok: (n: number) => boolean) =>
    [...new Set((Array.isArray(v) ? v : []).map((x) => Math.round(Number(x))).filter((n) => Number.isFinite(n) && ok(n)))].sort((a, b) => a - b)
  const bounded = (v: unknown, lo: number, hi: number) => {
    if (v === null || v === undefined || v === "") return null
    const n = Number(v)
    return Number.isFinite(n) && n >= lo && n <= hi ? n : null
  }
  return {
    targetWeights: ints(r.targetWeights, (n) => (COLLEGE_WEIGHTS as readonly number[]).includes(n)),
    classYears: ints(r.classYears, (n) => n >= 2020 && n <= 2040),
    minGpa: bounded(r.minGpa, 0, 5),
    minSat: bounded(r.minSat, 400, 1600),
    minAct: bounded(r.minAct, 1, 36),
    majors: [...new Set((Array.isArray(r.majors) ? r.majors : []).map((m) => String(m).trim()).filter(Boolean))].slice(0, 40),
    requireNational: r.requireNational === true,
    stateFinish: STATE_FINISH_OPTIONS.some((o) => o.value === r.stateFinish) ? (r.stateFinish as StateFinishLevel) : "any",
    requireRanked: r.requireRanked === true,
    // A set saved before must-haves existed keeps the default ones.
    mustHaves: Array.isArray(r.mustHaves)
      ? FIT_KEYS.filter((k) => (r.mustHaves as unknown[]).includes(k))
      : DEFAULT_MUST_HAVES,
    priorities: Array.isArray(r.priorities)
      ? PRIORITY_OPTIONS.map((o) => o.key).filter((k) => (r.priorities as unknown[]).includes(k))
      : [],
  }
}

/**
 * The perfect recruit in a coach's shorthand, one item per need set:
 * "125–141", "Class of 2028", "3.0+ GPA", "National experience", "Finance or Business".
 */
export function describePerfectRecruit(c: ProgramFitCriteria): string[] {
  const out: string[] = []
  const w = [...c.targetWeights].sort((a, b) => a - b)
  if (w.length) out.push(w.length > 2 && w.every((x, i) => i === 0 || COLLEGE_WEIGHTS.indexOf(x as never) === COLLEGE_WEIGHTS.indexOf(w[i - 1] as never) + 1) ? `${w[0]}–${w[w.length - 1]} lbs` : `${w.join(", ")} lbs`)
  if (c.classYears.length) out.push(`Class of ${[...c.classYears].sort().join(" or ")}`)
  if (c.minGpa != null) out.push(`${Number.isInteger(c.minGpa) ? c.minGpa.toFixed(1) : c.minGpa}+ GPA`)
  if (c.minSat != null || c.minAct != null) {
    out.push([c.minSat != null ? `SAT ${c.minSat}+` : null, c.minAct != null ? `ACT ${c.minAct}+` : null].filter(Boolean).join(" or "))
  }
  if (c.majors.length) out.push(c.majors.length <= 2 ? c.majors.join(" or ") : `${c.majors.length} majors`)
  if (c.requireNational) out.push("National experience")
  if (c.stateFinish !== "any") out.push(STATE_FINISH_OPTIONS.find((o) => o.value === c.stateFinish)!.label)
  if (c.requireRanked) out.push("Ranked")
  return out
}
