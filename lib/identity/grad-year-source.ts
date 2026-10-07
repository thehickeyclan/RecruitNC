/**
 * Which source wins when two of them state a different graduation year.
 *
 * Grad year decides the recruiting class, so it decides whether a coach is told about a wrestler
 * this year or in three years — and the sources disagree constantly. The rule used to be "never
 * overwrite anything", which happened to be right every time it was tested but for the wrong
 * reason: it would also refuse a genuinely better source, and it made import ORDER the decider.
 *
 * The ladder is evidence quality, and the bottom rung is where it matters:
 *
 * A national ranking outlet's grade is the WEAKEST signal we hold, not corroboration. Outlets keep
 * graduated seniors on current lists as a matter of routine — on 6 Oct 2026 alone, MatScouts had
 * Iyanna Crawford (class of 2026) on a class-of-2027 board, Flo's final girls list carried three
 * graduated seniors, and SI's 2026-27 preseason list had Justice Anthony as a senior when West
 * Virginia had already recorded her in grade 12 the season before. Three in one day.
 *
 * A state tournament's grade column is the strongest file-based evidence: official, stated per
 * season, and self-checking across consecutive years — grade 11 then grade 12 is a progression no
 * outlet's roster can argue with.
 */

export const GRAD_YEAR_TIERS = {
  /** A person looked at the conflict and decided. Nothing in a file outranks it. */
  human_confirmed: 100,
  /** The state tournament's own grade column, for a stated season. */
  state_tournament_grade: 90,
  /** The wrestler entered a grade-restricted division, so the event states the grade. */
  nhsca_grade_division: 80,
  /**
   * A looked-up page that states the class outright — a "Class of 2028" listing or a grade tied to
   * a named season — matched to the wrestler by school. Ranked above a ranking service because it
   * is a direct statement about that athlete rather than a field on a list that may go unmaintained,
   * and below a grade division because the wrestler's own entry is not what asserts it.
   */
  verified_web_lookup: 70,
  /** A ranking service that publishes a grade per wrestler, by state. */
  state_rankings_grade: 60,
  /** A national outlet's grade on a current list. Carries graduates forward; trust last. */
  national_outlet_grade: 30,
} as const

export type GradYearTier = keyof typeof GRAD_YEAR_TIERS

/** What to do with an incoming value. */
export type GradYearVerdict = "fill" | "replace" | "keep" | "conflict"

/**
 * Read a tier off the source string the collection wrote. Unrecognised wording is treated as the
 * weakest, so an unlabelled file can fill blanks and nothing else.
 */
export function gradYearTier(source: string | null | undefined): GradYearTier {
  const s = String(source ?? "").toLowerCase()
  if (!s) return "national_outlet_grade"
  if (/human|confirmed by|matt/.test(s)) return "human_confirmed"
  if (/state tournament|state_tournament|placer|qualifier|state grade/.test(s)) return "state_tournament_grade"
  if (/nhsca/.test(s)) return "nhsca_grade_division"
  if (/web.?lookup|class.?of.?listing|verified.?web|school roster/.test(s)) return "verified_web_lookup"
  if (/rankwrestler|rankings-grade|rankings grade|state ranking/.test(s)) return "state_rankings_grade"
  return "national_outlet_grade"
}

export function decideGradYear(input: {
  held: number | null | undefined
  /** The source recorded against the held value, or null when nothing was recorded. */
  heldSource: string | null | undefined
  incoming: number
  incomingSource: string | null | undefined
  /** Set when a person adjudicated the held value. */
  heldConfirmed?: boolean
}): { verdict: GradYearVerdict; reason: string } {
  const held = Number(input.held)
  if (!held) return { verdict: "fill", reason: "no graduation year on file" }
  if (held === input.incoming) return { verdict: "keep", reason: "agrees with what is on file" }

  if (input.heldConfirmed) {
    return { verdict: "keep", reason: "a person already adjudicated this wrestler's class" }
  }

  /*
   * Nothing recorded about where the held value came from, and most of what we hold predates the
   * provenance field — so it may well be a state tournament's own grade. Replacing it on a guess
   * would undo the better source. It stays, and the disagreement is reported for a human.
   */
  if (!String(input.heldSource ?? "").trim()) {
    return { verdict: "conflict", reason: "the value on file has no recorded source, so it is not safe to replace" }
  }

  const heldTier = gradYearTier(input.heldSource)
  const incomingTier = gradYearTier(input.incomingSource)
  if (GRAD_YEAR_TIERS[incomingTier] > GRAD_YEAR_TIERS[heldTier]) {
    return { verdict: "replace", reason: `${incomingTier} outranks ${heldTier}` }
  }
  if (GRAD_YEAR_TIERS[incomingTier] === GRAD_YEAR_TIERS[heldTier]) {
    return { verdict: "conflict", reason: `two ${heldTier} sources disagree` }
  }
  return { verdict: "keep", reason: `${incomingTier} is weaker than ${heldTier}` }
}

/**
 * Whether a class year can be true of a wrestler we have already seen compete.
 *
 * Nobody graduates before a season they wrestled in, and nobody is more than four years short of
 * graduating in their most recent season — an eighth grader sits at the ceiling. This catches what
 * no agreement rate can: a 2,213-row sweep came back 99.8% consistent and still carried a
 * wrestler who graduated in 2024 and competed in 2026, and one listed six years out.
 *
 * Returns null when it is satisfied, or the reason it cannot be.
 */
export function gradYearImpossible(gradYear: number, lastSeenSeason: number | null | undefined): string | null {
  const last = Number(lastSeenSeason)
  if (!Number.isFinite(last) || !last) return null
  if (gradYear < last) return `graduates ${gradYear} but wrestled in the ${last} season`
  if (gradYear > last + 4) return `graduates ${gradYear}, ${gradYear - last} years after the ${last} season`
  return null
}
