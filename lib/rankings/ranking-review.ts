/**
 * Why a published order might be wrong, computed rather than noticed.
 *
 * Every real error found while reviewing the Class of 2027 by hand was already sitting in the
 * data, and every one of them took somebody spotting it: a TOC champion left at 13th because the
 * formula counts national placements he does not have; a wrestler at 18 who had beaten the #5,
 * #10 and #14; a #2 recommendation for somebody 0-4 against the two wrestlers beside him; a
 * candidate invisible because his match history was never imported. None of that needs a better
 * formula to find. It needs the disagreements put on one screen.
 *
 * So this does not rank anybody. It takes an order somebody has arrived at and reports what
 * argues against it, loudest first, in language a reviewer can act on or dismiss. A ranking that
 * survives its own contradictions is one you can defend to a parent; a ranking nobody ever
 * contradicted is just the first draft.
 *
 * The rule throughout: a flag states a fact and names its source. It never says what the rank
 * should be — that is the reviewer's call, and a tool that guesses at it gets ignored the first
 * time it is wrong.
 */

export type ReviewSeverity = "high" | "medium" | "low"

export type ReviewFlag = {
  kind:
    | "beaten_by_lower"
    | "beaten_by_unranked"
    | "beat_higher"
    | "formula_gap"
    | "outside_gap"
    | "rating_conflict"
    | "no_match_data"
    | "stale"
  severity: ReviewSeverity
  /** One sentence, written to be read on a card. */
  message: string
}

export type ReviewAthlete = {
  id: string
  name: string
  /** Where the reviewer has put them. */
  workingRank: number
  /** Where the formula puts them. */
  formulaRank: number
  /** An outside service's number for the same class, when we hold one. */
  outsideRank?: number | null
  /** The star model's own 0-100 score, which is scored independently of the ranking. */
  starScore?: number | null
  matchCount?: number | null
  /** ISO date of the most recent bout on file, from any source. */
  lastCompetedAt?: string | null
  /** Same-class meetings, as the board already computes them. */
  headToHead?: ReadonlyArray<{ opponentId: string; opponent: string; wins: number; losses: number }>
  /**
   * Is this wrestler inside the published cut?
   *
   * Everyone passed in is reviewed against everyone else, but only the ranked are reported on —
   * positions beyond the cut are an unranked pool, not a ranking, and flagging their order would
   * be treating noise as a judgement.
   */
  isRanked?: boolean
}

/**
 * How far the formula has to differ before it is worth a reviewer's attention.
 *
 * Small disagreements are the normal condition — the formula is one opinion and the reviewer is
 * another, and a board where every row is flagged is a board nobody reads. Ten places is about
 * where a difference stops being taste and starts being a claim that one of the two is wrong.
 */
export const FORMULA_GAP = 10

/** An outside service disagrees more freely, so it takes a wider gap to mean anything. */
export const OUTSIDE_GAP = 15

/** Months without a bout before a résumé is described as static rather than current. */
export const STALE_MONTHS = 6

function monthsSince(iso: string, now: number): number {
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return 0
  return (now - at) / (1000 * 60 * 60 * 24 * 30.4)
}

function ordinalGap(a: number, b: number): number {
  return Math.abs(a - b)
}

/**
 * What argues against this wrestler's place, given the whole order.
 *
 * `order` is every athlete being reviewed, which is what makes the head-to-head checks possible:
 * whether a loss contradicts a ranking is only answerable once you know where both wrestlers sit.
 */
export function reviewAthlete(
  athlete: ReviewAthlete,
  order: ReadonlyArray<ReviewAthlete>,
  now: number = Date.now(),
): ReviewFlag[] {
  /*
   * Nothing is reported about a wrestler outside the cut. Positions past it are an unranked
   * pool rather than a ranking — the order within it was never reviewed and is thin evidence —
   * so flagging it contradicts an order nobody claimed. They are still compared *against*, which
   * is how a loss to one of them reaches the ranked wrestler's card.
   */
  if (athlete.isRanked === false) return []
  const flags: ReviewFlag[] = []
  const rankOf = new Map(order.map((a) => [a.id, a.workingRank]))

  /*
   * Head-to-head first, because it is the only evidence here that is not an inference. A
   * résumé argues about who is better; a result settles it for one afternoon, and an order that
   * contradicts one needs a reason.
   */
  const rankedIds = new Set(order.filter((a) => a.isRanked !== false).map((a) => a.id))
  const byId = new Map(order.map((a) => [a.id, a]))
  const beatenBy: string[] = []
  const beatenByUnranked: string[] = []
  const beat: string[] = []
  for (const meeting of athlete.headToHead ?? []) {
    const other = byId.get(meeting.opponentId)
    if (!other) continue
    const theirRank = rankOf.get(meeting.opponentId)
    if (theirRank == null) continue
    /*
     * A loss to somebody outside the ranking is the loudest thing here, and it was invisible.
     * This only ever compared the ranked against each other, so Jaycob Perez beating Landon
     * Logan in the Tournament of Champions quarter-final went unreported — Logan was ranked 23rd
     * and Perez was not ranked at all, so neither appeared in the other's comparison.
     *
     * Their formula position comes with it, because "beaten by somebody unranked" and "beaten by
     * somebody the model puts 40th" are different problems.
     */
    if (meeting.losses > 0 && !rankedIds.has(meeting.opponentId)) {
      beatenByUnranked.push(`${meeting.opponent} (unranked, formula #${other.formulaRank})`)
      continue
    }
    if (meeting.losses > 0 && theirRank > athlete.workingRank) {
      beatenBy.push(`${meeting.opponent} (#${theirRank})`)
    }
    if (meeting.wins > 0 && theirRank < athlete.workingRank) {
      beat.push(`${meeting.opponent} (#${theirRank})`)
    }
  }
  // The guard at the top has already returned for an unranked wrestler.
  if (beatenByUnranked.length) {
    flags.push({
      kind: "beaten_by_unranked",
      severity: "high",
      message:
        beatenByUnranked.length === 1
          ? `Ranked, but beaten by a wrestler who is not: ${beatenByUnranked[0]}.`
          : `Ranked, but beaten by ${beatenByUnranked.length} wrestlers who are not: ${beatenByUnranked.join(", ")}.`,
    })
  }
  if (beatenBy.length) {
    flags.push({
      kind: "beaten_by_lower",
      severity: "high",
      message: `Ranked above ${beatenBy.length === 1 ? "a wrestler" : `${beatenBy.length} wrestlers`} who beat them: ${beatenBy.join(", ")}.`,
    })
  }
  if (beat.length) {
    flags.push({
      kind: "beat_higher",
      // Two or more is a pattern rather than an afternoon, and reads differently.
      severity: beat.length >= 2 ? "high" : "medium",
      message: `Beat ${beat.length === 1 ? "a wrestler" : `${beat.length} wrestlers`} ranked above them: ${beat.join(", ")}.`,
    })
  }

  const formulaGap = ordinalGap(athlete.workingRank, athlete.formulaRank)
  if (formulaGap >= FORMULA_GAP) {
    flags.push({
      kind: "formula_gap",
      severity: formulaGap >= FORMULA_GAP * 2 ? "high" : "medium",
      message: `Formula puts them ${athlete.formulaRank}${athlete.formulaRank < athlete.workingRank ? ", higher" : ", lower"} — ${formulaGap} places from #${athlete.workingRank}.`,
    })
  }

  if (athlete.outsideRank != null) {
    const gap = ordinalGap(athlete.workingRank, athlete.outsideRank)
    if (gap >= OUTSIDE_GAP) {
      flags.push({
        kind: "outside_gap",
        severity: "low",
        message: `RankWrestler has them ${athlete.outsideRank}, ${gap} places from #${athlete.workingRank}.`,
      })
    }
  }

  /*
   * The star model scores the same wrestlers on separate evidence, so when it and the order
   * disagree sharply one of them is reading something the other cannot see. Only checked inside
   * the ranked group: below it there is no order to contradict.
   */
  const starScore = athlete.starScore
  if (starScore != null) {
    const better = order.filter(
      (other) =>
        other.id !== athlete.id &&
        other.workingRank > athlete.workingRank &&
        (other.starScore ?? -1) >= starScore + 15,
    )
    if (better.length) {
      flags.push({
        kind: "rating_conflict",
        severity: "medium",
        message: `Rated ${starScore}/100, below ${better.length === 1 ? `${better[0]!.name} (${better[0]!.starScore})` : `${better.length} wrestlers`} ranked beneath them.`,
      })
    }
  }

  // A gap is not a verdict on the wrestler — it is a verdict on what we hold about them.
  if (athlete.matchCount === 0) {
    flags.push({
      kind: "no_match_data",
      severity: "high",
      message: "No match history imported, so the match résumé scores zero regardless of results.",
    })
  }

  if (athlete.lastCompetedAt) {
    const months = monthsSince(athlete.lastCompetedAt, now)
    if (months >= STALE_MONTHS) {
      flags.push({
        kind: "stale",
        severity: "low",
        message: `No bout on file in ${Math.floor(months)} months — the résumé is static, not current.`,
      })
    }
  }

  return flags.sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
}

function severityRank(s: ReviewSeverity): number {
  return s === "high" ? 3 : s === "medium" ? 2 : 1
}

/** Every athlete's flags, keyed by id. */
export function reviewBoard(
  order: ReadonlyArray<ReviewAthlete>,
  now: number = Date.now(),
): Map<string, ReviewFlag[]> {
  return new Map(order.map((a) => [a.id, reviewAthlete(a, order, now)]))
}

/** The one line a reviewer reads first: how much of this order is contested. */
export function summariseReview(flags: ReadonlyMap<string, ReviewFlag[]>): {
  contested: number
  high: number
  byKind: Record<string, number>
} {
  let contested = 0
  let high = 0
  const byKind: Record<string, number> = {}
  for (const [, list] of flags) {
    if (list.length) contested += 1
    for (const f of list) {
      if (f.severity === "high") high += 1
      byKind[f.kind] = (byKind[f.kind] ?? 0) + 1
    }
  }
  return { contested, high, byKind }
}


/**
 * Wrestlers outside the cut with a claim on it.
 *
 * The review reports on the ranked, which is right — but it meant the only way an unranked
 * wrestler could ever be noticed was somebody remembering them. Two were found by eye in one
 * afternoon: Landon Logan, 84th on the board because his match history had never been imported,
 * and Jaycob Perez, 86th with a win over the wrestler who replaced him at 23.
 *
 * A claim is one of two things: the formula puts them inside the cut, or they have beaten
 * somebody who is in it. Both are facts about results rather than opinions about potential.
 */
export type OverlookedCandidate = {
  id: string
  name: string
  workingRank: number
  formulaRank: number
  reason: string
}

export function findOverlookedCandidates(
  order: ReadonlyArray<ReviewAthlete>,
  options: { cut: number },
): OverlookedCandidate[] {
  const ranked = new Set(order.filter((a) => a.workingRank <= options.cut).map((a) => a.id))
  const rankOf = new Map(order.map((a) => [a.id, a.workingRank]))
  const out: OverlookedCandidate[] = []
  for (const athlete of order) {
    if (athlete.workingRank <= options.cut) continue
    const reasons: string[] = []
    if (athlete.formulaRank <= options.cut) reasons.push(`formula ranks them ${athlete.formulaRank}`)
    const beat = (athlete.headToHead ?? [])
      .filter((m) => m.wins > 0 && ranked.has(m.opponentId))
      .map((m) => `${m.opponent} (#${rankOf.get(m.opponentId)})`)
    if (beat.length) reasons.push(`beat ${beat.join(", ")}`)
    if (!reasons.length) continue
    out.push({
      id: athlete.id,
      name: athlete.name,
      workingRank: athlete.workingRank,
      formulaRank: athlete.formulaRank,
      reason: reasons.join("; "),
    })
  }
  return out.sort((a, b) => a.formulaRank - b.formulaRank)
}
