/**
 * The best wrestlers in North Carolina, regardless of weight or class.
 *
 * The class boards answer "who is the best junior". This answers "who is the best wrestler", and
 * it is a different question with a different trap: our class score is cumulative, so sorting
 * the three boards together produces a seniority list. Fifteen of the top twenty came from one
 * class, not because they are better but because they have three seasons of results on file
 * against a sophomore's one.
 *
 * So this scores **the current season only**. A senior who is genuinely better still wins — he
 * just has to win it on this year rather than on having been here longer. Nothing accumulates.
 *
 * The other half is cross-class evidence, which is the part that makes a pound-for-pound list
 * defensible rather than three boards stapled together. Fifty-seven meetings between ranked
 * wrestlers of different classes are on file — Aidan Szewczyk beat Jake Amiott, Carson Worrick
 * beat Ryan Thompson, Luke Richards beat Daniel McDermott. A list that ignores those is
 * comparing wrestlers who have already settled it on the mat.
 */

export type PoundForPoundInput = {
  id: string
  name: string
  graduationYear: number
  /** Rank in their own class, which is the claim this list is testing. */
  classRank: number | null
  /** Best NCHSAA finish this season, 1 for a title. */
  statePlace?: number | null
  /** Best finish at a national event this season — NHSCA, Super 32, Fargo. */
  nationalPlace?: number | null
  /**
   * The NHSCA division that finish came in, when it was NHSCA.
   *
   * NHSCA brackets by grade, so a placement is not comparable across divisions: Braylen Yates
   * won the Freshman title at 170 while Carson Worrick took fourth in the Junior bracket, and
   * scoring both as "a national placement" put a ninth-grader top of a state-wide list. The
   * junior field is older, deeper and several times the size.
   */
  nationalDivision?: "Freshman" | "Sophomore" | "Junior" | "Senior" | null
  /** Tournament of Champions finish this season. */
  tocPlace?: number | null
  /** This season only. */
  wins?: number
  losses?: number
  /** Wins over ranked opponents inside the last twelve months. */
  rankedWins?: number
}

/** Placement is worth the same wherever it was earned; the event decides the multiplier. */
function placementValue(place: number | null | undefined): number {
  if (place == null || !Number.isFinite(place) || place < 1) return 0
  if (place === 1) return 30
  if (place === 2) return 22
  if (place === 3) return 17
  if (place === 4) return 13
  if (place <= 8) return 8
  return 3
}

/**
 * What each stage is worth, relative to the others.
 *
 * A national podium is the hardest thing on any of these résumés, the TOC is the deepest field
 * in the state, and eight classifications means eight state champions at every weight — so the
 * state title is real and is the smallest of the three.
 */
const NATIONAL_WEIGHT = 1.4

/**
 * What a placement is worth by the division it came in.
 *
 * Each step up is a year older and a deeper field. The curve is deliberately gentle — winning a
 * national bracket is winning a national bracket, and a freshman champion should not be scored
 * out of the conversation — but it is steep enough that a freshman title no longer outranks the
 * junior podium. Applied only to NHSCA, which is the event that brackets this way; Fargo and
 * Super 32 are open.
 */
const DIVISION_WEIGHT: Record<string, number> = {
  Senior: 1,
  Junior: 0.85,
  Sophomore: 0.7,
  Freshman: 0.55,
}

export function divisionWeight(division: string | null | undefined): number {
  if (!division) return 1
  return DIVISION_WEIGHT[division] ?? 1
}
const TOC_WEIGHT = 1.1
const STATE_WEIGHT = 0.7

/** A season's win rate, damped so a short season cannot out-score a long one on percentage. */
export function seasonRecordPoints(wins = 0, losses = 0): number {
  const bouts = wins + losses
  if (bouts <= 0) return 0
  const rate = wins / bouts
  const confidence = Math.min(1, bouts / 25)
  return Math.round(rate * 25 * confidence)
}

export function poundForPoundScore(input: PoundForPoundInput): number {
  const national =
    placementValue(input.nationalPlace) * NATIONAL_WEIGHT * divisionWeight(input.nationalDivision)
  const toc = placementValue(input.tocPlace) * TOC_WEIGHT
  const state = placementValue(input.statePlace) * STATE_WEIGHT
  const record = seasonRecordPoints(input.wins, input.losses)
  // Capped: a wrestler who meets the same ranked field repeatedly cannot run away with it.
  const ranked = Math.min((input.rankedWins ?? 0) * 4, 24)
  return Math.round((national + toc + state + record + ranked) * 10) / 10
}

/**
 * How far apart two wrestlers can be before a single result stops moving them.
 *
 * Without a limit the override ran away: ninety wrestlers with a hundred and ninety-two meetings
 * between them produced an order whose scores read 97, 110, 110, 97, 110 — every chain of
 * results dragging somebody past a wrestler they had never met. The class engine learned the
 * same lesson and settled on the same number.
 *
 * A result beats a résumé within reach. It does not beat a season that is twice as good.
 */
export const HEAD_TO_HEAD_REACH = 25

export type PoundForPoundMeeting = {
  winnerId: string
  loserId: string
  /** ISO date; the most recent meeting between a pair is the one that counts. */
  date?: string | null
  event?: string | null
}

export type PoundForPoundEntry = PoundForPoundInput & {
  score: number
  rank: number
  /** Wrestlers ranked below them on score who have beaten them. */
  beatenBy: string[]
}

/**
 * Score everybody, then let results override the score.
 *
 * A wrestler who beat somebody is not placed below them, however the résumés compare — that is
 * the one rule a reader will check, and the only one where we have a measurement rather than an
 * inference. Applied repeatedly until the order is stable, because moving one wrestler can
 * create the next contradiction.
 */
export function buildPoundForPound(
  athletes: readonly PoundForPoundInput[],
  meetings: readonly PoundForPoundMeeting[] = [],
): PoundForPoundEntry[] {
  const scored = athletes
    .map((a) => ({ ...a, score: poundForPoundScore(a) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))

  /** Latest meeting per pair decides, so earlier results never resurrect a settled argument. */
  const latest = new Map<string, PoundForPoundMeeting>()
  for (const m of meetings) {
    const key = [m.winnerId, m.loserId].sort().join("|")
    const held = latest.get(key)
    if (!held || String(m.date ?? "") >= String(held.date ?? "")) latest.set(key, m)
  }
  const beats = new Map<string, Set<string>>()
  for (const m of latest.values()) {
    const wins = beats.get(m.winnerId) ?? new Set<string>()
    wins.add(m.loserId)
    beats.set(m.winnerId, wins)
  }

  const order = [...scored]
  for (let pass = 0; pass < order.length; pass += 1) {
    let moved = false
    for (let i = 0; i < order.length; i += 1) {
      for (let j = i + 1; j < order.length; j += 1) {
        // The lower-placed wrestler beat the higher-placed one, and is within reach on the
        // season: lift them above. Out of reach, the result is reported and the order stands.
        if (
          beats.get(order[j]!.id)?.has(order[i]!.id) &&
          order[j]!.score >= order[i]!.score - HEAD_TO_HEAD_REACH
        ) {
          const [winner] = order.splice(j, 1)
          order.splice(i, 0, winner!)
          moved = true
          break
        }
      }
      if (moved) break
    }
    if (!moved) break
  }

  /*
   * Within a class, the class board is the authority — full stop.
   *
   * Scoring the season on its own produced two lists that contradicted each other about the same
   * two wrestlers: the Class of 2027 board has Tobin McNair 2nd and Gavin Lopez 6th, and this
   * list had Lopez 2nd and McNair 3rd. Both cannot be published. Whatever the season scores say,
   * a reader opening the 2027 rankings and the pound-for-pound on the same afternoon sees us
   * disagreeing with ourselves, and neither number survives that.
   *
   * There is no judgement to make here. Within a class the boards already weigh a full career,
   * head-to-head included, and this list weighs one season — so the class board wins, and this
   * list confines itself to the question it is actually the authority on: how wrestlers in
   * different classes compare.
   *
   * The reshuffle holds the *positions* a class occupies and only reorders its members inside
   * them, so nothing cross-class moves: the season score and head-to-head still decide entirely
   * where each class's wrestlers sit relative to everyone else. A missing class rank sorts last
   * within its class rather than jumping the ranked.
   */
  const slotsByClass = new Map<number, number[]>()
  order.forEach((a, i) => {
    const slots = slotsByClass.get(a.graduationYear) ?? []
    slots.push(i)
    slotsByClass.set(a.graduationYear, slots)
  })
  for (const [year, slots] of slotsByClass) {
    const members = slots.map((i) => order[i]!)
    /*
     * Class rank alone, and nothing else. `members` is already in list order and sort is stable,
     * so wrestlers with no class rank keep the position the score and head-to-head gave them —
     * the first version broke the tie on score instead and undid the head-to-head override for
     * every class where nobody is ranked.
     */
    members.sort(
      (a, b) =>
        (a.classRank ?? Number.MAX_SAFE_INTEGER) - (b.classRank ?? Number.MAX_SAFE_INTEGER),
    )
    slots.forEach((slot, k) => {
      order[slot] = members[k]!
    })
    void year
  }

  const placeOf = new Map(order.map((a, i) => [a.id, i + 1]))
  const nameOf = new Map(order.map((a) => [a.id, a.name]))
  return order.map((a, i) => ({
    ...a,
    rank: i + 1,
    beatenBy: [...(beats.entries())]
      .filter(([winnerId, losers]) => losers.has(a.id) && (placeOf.get(winnerId) ?? 0) > i + 1)
      .map(([winnerId]) => nameOf.get(winnerId) ?? winnerId),
  }))
}
