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
}

export const EMPTY_CRITERIA: ProgramFitCriteria = {
  targetWeights: [],
  classYears: [],
  minGpa: null,
  minSat: null,
  minAct: null,
  majors: [],
  requireNational: false,
}

export type FitStatus = "fit" | "miss" | "unknown"

export type FitCheck = {
  key: "weight" | "class" | "gpa" | "tests" | "major" | "national"
  label: string
  status: FitStatus
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
    c.requireNational
  )
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
  const checks: FitCheck[] = []

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
      detail: gpa == null ? "Not on file" : `${subject.gpa} against a ${c.minGpa} floor`,
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

  return checks
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
  }
}
