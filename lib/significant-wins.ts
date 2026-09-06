import { namesLikelySamePerson } from "@/lib/athlete-name-match"

/**
 * Wins worth showing on a profile: the ones over somebody the reader has heard of.
 *
 * A match list is long and mostly undifferentiated — a state champion's 55 wins look the same as
 * anybody else's until you know who they were against. This picks out the two kinds that carry
 * weight in North Carolina: a win over a wrestler in the Tournament of Champions field, and a win
 * over a ranked prospect.
 *
 * The season window is the caller's to apply — pass only the bouts you want considered. Every
 * caller passes the most recent season, matching what seeding uses for head-to-head: a
 * significant win is an argument about who somebody is beating now.
 *
 * Unpublished classes count. The 2029 rankings are not public yet, but a win over the boy we
 * privately have at #3 in that class is no less real, and hiding it would make the section less
 * true rather than more careful. Only the fact of the ranking is used here, never the number, so
 * nothing unpublished is disclosed by showing it.
 */

export type Bout = {
  opponent?: string | null
  opponent_name?: string | null
  opponent_school?: string | null
  win_loss?: string | null
  result?: string | null
  date?: string | null
  venue?: string | null
  weight?: number | string | null
}

export type RankedOpponent = {
  name: string
  /** Kept for ordering and for the admin view; never rendered on a public profile. */
  ranking: number | null
  graduationYear: number | null
}

export type OpponentIndex = {
  /** Names of wrestlers in the announced TOC field. */
  tocField: readonly string[]
  /** Every athlete carrying a prospect ranking, published or not. */
  ranked: readonly RankedOpponent[]
  /**
   * Wrestlers ranked nationally by FloWrestling / Sports Illustrated / MatScouts, including
   * out-of-state ones. A win over a nationally ranked opponent is the strongest credential a
   * result can carry, and most of them will never be in our own athlete table.
   */
  nationallyRanked?: readonly NationallyRankedOpponent[]
}

export type NationallyRankedOpponent = {
  name: string
  rank: number
  /** "FloWrestling", "Sports Illustrated", "MatScouts". */
  source: string
  state: string | null
}

export type SignificantWin = {
  opponent: string
  opponentSchool: string | null
  event: string | null
  date: string | null
  result: string | null
  weight: number | null
  /**
   * Why it earned its place, strongest first: a national ranking outranks the TOC field,
   * which outranks a state prospect ranking.
   */
  reason: "national-ranked" | "toc-field" | "ranked"
  opponentGraduationYear: number | null
  /** Set when the opponent is nationally ranked: "#12 Sports Illustrated". */
  nationalRankLabel?: string
}

function opponentName(bout: Bout): string {
  return String(bout.opponent ?? bout.opponent_name ?? "").trim()
}

/** A win, however the row spells it. */
export function isWin(bout: Bout): boolean {
  const outcome = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  return outcome === "W" || outcome.startsWith("W ") || outcome.includes("WIN")
}

/** A loss, however the row spells it. */
export function isLoss(bout: Bout): boolean {
  const outcome = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  return outcome === "L" || outcome.startsWith("L ") || outcome.includes("LOSS")
}

function toWeight(value: Bout["weight"]): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * The significant wins in a bout list, newest first.
 *
 * Bouts store an opponent's name rather than an id, so this matches on the name — which is why it
 * uses the shared matcher rather than comparing strings. Getting this wrong credits a wrestler
 * with a win over somebody they never met.
 */
export function findSignificantWins(bouts: readonly Bout[], index: OpponentIndex): SignificantWin[] {
  return findSignificantBouts(bouts, index, "win")
}

/**
 * The significant losses in a bout list, newest first.
 *
 * A scouting report is not a highlight reel. A college coach reading one wants to know who
 * beat this wrestler as much as who they beat — a narrow loss to the state champion says
 * something a win column cannot. Same bar as the wins: it only counts against somebody the
 * reader has heard of, so this stays a short list of meaningful results rather than a dump
 * of every dropped match.
 */
export function findSignificantLosses(bouts: readonly Bout[], index: OpponentIndex): SignificantWin[] {
  return findSignificantBouts(bouts, index, "loss")
}

function findSignificantBouts(
  bouts: readonly Bout[],
  index: OpponentIndex,
  outcome: "win" | "loss",
): SignificantWin[] {
  const wins: SignificantWin[] = []
  const seen = new Set<string>()
  const matchesOutcome = outcome === "win" ? isWin : isLoss

  for (const bout of bouts) {
    if (!matchesOutcome(bout)) continue
    const name = opponentName(bout)
    if (!name) continue

    // A national ranking is checked first: it is the strongest thing a result can be
    // measured against, and it is the only credential most out-of-state opponents will have.
    const national = (index.nationallyRanked ?? []).find((r) => namesLikelySamePerson(r.name, name))
    const inField = national ? false : index.tocField.some((fieldName) => namesLikelySamePerson(fieldName, name))
    const ranked = national || inField ? null : index.ranked.find((r) => namesLikelySamePerson(r.name, name))
    if (!national && !inField && !ranked) continue

    // One entry per opponent per day: the same bout is sometimes stored twice.
    const key = `${name.toLowerCase()}|${bout.date ?? ""}`
    if (seen.has(key)) continue
    seen.add(key)

    wins.push({
      opponent: name,
      opponentSchool: bout.opponent_school ?? null,
      event: bout.venue ?? null,
      date: bout.date ?? null,
      result: bout.result ?? null,
      weight: toWeight(bout.weight),
      reason: national ? "national-ranked" : inField ? "toc-field" : "ranked",
      opponentGraduationYear: ranked?.graduationYear ?? null,
      ...(national ? { nationalRankLabel: `#${national.rank} ${national.source}` } : {}),
    })
  }

  const reasonRank = { "national-ranked": 0, "toc-field": 1, ranked: 2 } as const
  return wins.sort((a, b) => {
    // Nationally ranked first, then TOC, then state-ranked; within a tier, newest first.
    // Undated rows sink rather than jump.
    if (a.reason !== b.reason) return reasonRank[a.reason] - reasonRank[b.reason]
    const at = a.date ? Date.parse(a.date) : Number.NaN
    const bt = b.date ? Date.parse(b.date) : Number.NaN
    if (Number.isNaN(at) && Number.isNaN(bt)) return 0
    if (Number.isNaN(at)) return 1
    if (Number.isNaN(bt)) return -1
    return bt - at
  })
}
